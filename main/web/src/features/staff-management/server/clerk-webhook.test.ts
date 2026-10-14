import type { User } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Clerk・DB・通知は偽物。decideLink（紐付けの判断）は本物を使う
vi.mock("./clerk-admin", async (importOriginal) => {
	const original = await importOriginal<typeof import("./clerk-admin")>();
	return { ...original, getClerkUser: vi.fn() };
});
vi.mock("./reconcile", async (importOriginal) => {
	const original = await importOriginal<typeof import("./reconcile")>();
	return { ...original, linkStaff: vi.fn() };
});
vi.mock("./audit", () => ({ logStaffOperation: vi.fn() }));
// ロック: すぐに work を実行する
vi.mock("./staff-lock", () => ({
	withStaffLock: vi.fn(async (work: (lock: unknown) => Promise<unknown>) =>
		work({ ensureCanContinue: () => {} }),
	),
}));
vi.mock("@/shared/lib/logger", () => ({ notifyOps: vi.fn() }));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: { user: { findUnique: vi.fn(), updateMany: vi.fn() } },
}));

import { notifyOps } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { getClerkUser } from "./clerk-admin";
import { syncClerkUser, syncSignedInUser } from "./clerk-webhook";
import { linkStaff } from "./reconcile";

const lock = { ensureCanContinue: vi.fn() };

function makeStaff(overrides: Partial<User> = {}): User {
	return {
		id: "user-1",
		clerkUserId: null,
		firstName: "花子",
		lastName: "田中",
		email: "a@example.com",
		role: "CAREGIVER",
		startDate: new Date("2026-10-01T00:00:00.000Z"),
		endDate: null,
		dateOfBirth: new Date("1990-04-01T00:00:00.000Z"),
		nationality: "日本",
		gender: "女性",
		status: "PENDING",
		createdAt: new Date("2026-10-13T00:00:00.000Z"),
		updatedAt: new Date("2026-10-13T00:00:00.000Z"),
		...overrides,
	};
}

// Clerk から返ってくる最新のユーザー情報を設定する
function setClerkAccount(overrides: object = {}) {
	vi.mocked(getClerkUser).mockResolvedValue({
		kind: "SUCCESS",
		data: {
			id: "c1",
			primaryEmail: "a@example.com",
			isPrimaryEmailVerified: true,
			staffUserId: "user-1",
			isUsable: true,
			...overrides,
		},
	});
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("Clerk を確認できないとき", () => {
	it("503 を投げて、Clerk に再送してもらう", async () => {
		vi.mocked(getClerkUser).mockResolvedValue({
			kind: "UNKNOWN",
			reason: "TIMEOUT",
		});
		await expect(syncClerkUser("c1", lock)).rejects.toMatchObject({
			status: 503,
		});
	});

	it("アカウントが削除済みなら何もしない", async () => {
		vi.mocked(getClerkUser).mockResolvedValue({ kind: "SUCCESS", data: null });
		await syncClerkUser("c1", lock);
		expect(prisma.user.findUnique).not.toHaveBeenCalled();
	});
});

describe("まだ紐付いていないとき（サインアップ）", () => {
	it("本システムの招待から作られたアカウントなら、PENDING のスタッフを ACTIVE にする", async () => {
		setClerkAccount();
		vi.mocked(prisma.user.findUnique)
			.mockResolvedValueOnce(null as never) // clerkUserId で探す → いない
			.mockResolvedValueOnce(makeStaff() as never); // staffUserId で探す → PENDING
		vi.mocked(linkStaff).mockResolvedValue(
			makeStaff({ status: "ACTIVE", clerkUserId: "c1" }),
		);

		await syncClerkUser("c1", lock);
		expect(linkStaff).toHaveBeenCalledTimes(1);
	});

	it("取消済み（INACTIVE）のスタッフは ACTIVE に戻さない", async () => {
		setClerkAccount();
		vi.mocked(prisma.user.findUnique)
			.mockResolvedValueOnce(null as never)
			.mockResolvedValueOnce(makeStaff({ status: "INACTIVE" }) as never);

		await syncClerkUser("c1", lock);
		expect(linkStaff).not.toHaveBeenCalled();
	});

	it("本システムの招待ではないアカウントは何もしない（User を作らない）", async () => {
		setClerkAccount({ staffUserId: null });
		vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null as never);

		await syncClerkUser("c1", lock);
		expect(linkStaff).not.toHaveBeenCalled();
		expect(prisma.user.updateMany).not.toHaveBeenCalled();
	});

	it("email が未確認なら紐付けない", async () => {
		setClerkAccount({ isPrimaryEmailVerified: false });
		vi.mocked(prisma.user.findUnique)
			.mockResolvedValueOnce(null as never)
			.mockResolvedValueOnce(makeStaff() as never);

		await syncClerkUser("c1", lock);
		expect(linkStaff).not.toHaveBeenCalled();
	});
});

describe("既に紐付いているとき（email の同期）", () => {
	it("email が変わっていれば、DB の email を更新する（role・status は変えない）", async () => {
		setClerkAccount({ primaryEmail: "new@example.com" });
		vi.mocked(prisma.user.findUnique)
			.mockResolvedValueOnce(
				makeStaff({ status: "INACTIVE", clerkUserId: "c1" }) as never,
			)
			.mockResolvedValueOnce(null as never); // 新しい email を使っている人はいない

		await syncClerkUser("c1", lock);
		expect(prisma.user.updateMany).toHaveBeenCalledWith({
			where: { id: "user-1", clerkUserId: "c1" },
			data: { email: "new@example.com" },
		});
	});

	it("別のスタッフと email が重複していたら更新せず、担当者に知らせる", async () => {
		setClerkAccount({ primaryEmail: "taken@example.com" });
		vi.mocked(prisma.user.findUnique)
			.mockResolvedValueOnce(
				makeStaff({ status: "ACTIVE", clerkUserId: "c1" }) as never,
			)
			.mockResolvedValueOnce({ id: "user-2" } as never);

		await syncClerkUser("c1", lock);
		expect(prisma.user.updateMany).not.toHaveBeenCalled();
		expect(notifyOps).toHaveBeenCalledWith("EMAIL_CONFLICT", expect.anything());
	});

	it("未確認の email では更新しない", async () => {
		setClerkAccount({
			primaryEmail: "new@example.com",
			isPrimaryEmailVerified: false,
		});
		vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
			makeStaff({ status: "ACTIVE", clerkUserId: "c1" }) as never,
		);

		await syncClerkUser("c1", lock);
		expect(prisma.user.updateMany).not.toHaveBeenCalled();
	});

	it("重複した user.created でも、紐付けをやり直さない", async () => {
		setClerkAccount();
		vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
			makeStaff({ status: "ACTIVE", clerkUserId: "c1" }) as never,
		);

		await syncClerkUser("c1", lock);
		expect(linkStaff).not.toHaveBeenCalled();
		expect(prisma.user.updateMany).not.toHaveBeenCalled();
	});
});

describe("syncSignedInUser（登録直後に本人がログインしたとき）", () => {
	it("紐付けできて ACTIVE になれば true", async () => {
		setClerkAccount();
		vi.mocked(prisma.user.findUnique)
			.mockResolvedValueOnce(null as never) // clerkUserId で探す → まだいない
			.mockResolvedValueOnce(makeStaff() as never) // staffUserId で探す → PENDING
			.mockResolvedValueOnce({ status: "ACTIVE" } as never); // 最後に状態を確認
		vi.mocked(linkStaff).mockResolvedValue(
			makeStaff({ status: "ACTIVE", clerkUserId: "c1" }),
		);

		expect(await syncSignedInUser("c1")).toBe(true);
	});

	it("取消済みのスタッフなら false（ACTIVE にしない）", async () => {
		setClerkAccount();
		vi.mocked(prisma.user.findUnique)
			.mockResolvedValueOnce(null as never)
			.mockResolvedValueOnce(makeStaff({ status: "INACTIVE" }) as never)
			.mockResolvedValueOnce(null as never);

		expect(await syncSignedInUser("c1")).toBe(false);
		expect(linkStaff).not.toHaveBeenCalled();
	});

	it("Clerk を確認できなければ false（エラーにしない）", async () => {
		vi.mocked(getClerkUser).mockResolvedValue({
			kind: "UNKNOWN",
			reason: "TIMEOUT",
		});
		expect(await syncSignedInUser("c1")).toBe(false);
	});
});
