import type { User } from "@prisma/client";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Clerk と DB は偽物（モック）にする。normalizeEmail だけは本物を使う
vi.mock("./clerk-admin", async (importOriginal) => {
	const original = await importOriginal<typeof import("./clerk-admin")>();
	return {
		normalizeEmail: original.normalizeEmail,
		findClerkUsersByEmail: vi.fn(),
		findPendingInvitations: vi.fn(),
		createStaffInvitation: vi.fn(),
	};
});
vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
			updateMany: vi.fn(),
			findUniqueOrThrow: vi.fn(),
		},
	},
}));

import { prisma } from "@/shared/lib/prisma";
import {
	type ClerkStaffInvitation,
	type ClerkStaffUser,
	createStaffInvitation,
	findClerkUsersByEmail,
	findPendingInvitations,
} from "./clerk-admin";
import { reconcileStaff } from "./reconcile";

beforeAll(() => {
	// テスト用の環境変数（確認トークンの鍵など）
	process.env.DATABASE_URL ??= "postgresql://test";
	process.env.CLERK_SECRET_KEY ??= "sk_test";
	process.env.CLERK_WEBHOOK_SECRET ??= "whsec_test";
	process.env.STAFF_TOKEN_SECRET ??= Buffer.alloc(32, 1).toString("base64");
});

// テスト用のスタッフ（PENDING・未紐付け）
const staff: User = {
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
};

const lock = { ensureCanContinue: vi.fn() };

// Clerk アカウントの偽物
function clerkUser(options: {
	id?: string;
	verified?: boolean;
	usable?: boolean;
	staffUserId?: string | null;
}): ClerkStaffUser {
	return {
		id: options.id ?? "user_clerk_1",
		primaryEmail: "a@example.com",
		isPrimaryEmailVerified: options.verified ?? true,
		staffUserId: options.staffUserId ?? null,
		isUsable: options.usable ?? true,
	};
}

// Clerk の検索結果を設定する
function setClerkUsers(users: ClerkStaffUser[]) {
	vi.mocked(findClerkUsersByEmail).mockResolvedValue({
		kind: "SUCCESS",
		data: users,
	});
}
function setInvitations(invitations: ClerkStaffInvitation[]) {
	vi.mocked(findPendingInvitations).mockResolvedValue({
		kind: "SUCCESS",
		data: invitations,
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	// 何も設定しなければ「他のスタッフに紐付いていない」「更新成功」
	vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
	vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 });
	vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({
		...staff,
		status: "ACTIVE",
		clerkUserId: "user_clerk_1",
	});
});

function run(confirmationToken?: string, actorId = "nurse-1", target = staff) {
	return reconcileStaff({ staff: target, actorId, confirmationToken, lock });
}

describe("前提", () => {
	it("PENDING でなければ 409", async () => {
		await expect(
			run(undefined, "nurse-1", { ...staff, status: "ACTIVE" }),
		).rejects.toMatchObject({ status: 409 });
	});

	it("既に Clerk と紐付いていれば 409", async () => {
		await expect(
			run(undefined, "nurse-1", { ...staff, clerkUserId: "user_clerk_1" }),
		).rejects.toMatchObject({ status: 409 });
	});
});

describe("Clerk アカウントがある場合", () => {
	it("本システムの招待から作られたアカウントなら、自動で紐付ける", async () => {
		setClerkUsers([clerkUser({ staffUserId: "user-1" })]);
		const outcome = await run();
		expect(outcome.result).toBe("LINKED");
		expect(prisma.user.updateMany).toHaveBeenCalledWith({
			where: { id: "user-1", status: "PENDING", clerkUserId: null },
			data: { status: "ACTIVE", clerkUserId: "user_clerk_1" },
		});
	});

	it("紐付けの途中で状態が変わっていたら（更新0件）409", async () => {
		setClerkUsers([clerkUser({ staffUserId: "user-1" })]);
		vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 });
		await expect(run()).rejects.toMatchObject({ status: 409 });
	});

	it("アカウントが複数あれば手動確認", async () => {
		setClerkUsers([clerkUser({ id: "c1" }), clerkUser({ id: "c2" })]);
		expect(await run()).toMatchObject({
			result: "MANUAL_CHECK_REQUIRED",
			reason: "MULTIPLE_ACCOUNTS",
		});
	});

	it("別のスタッフに紐付いていれば手動確認", async () => {
		setClerkUsers([clerkUser({ staffUserId: "user-1" })]);
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			id: "user-999",
		} as User);
		expect(await run()).toMatchObject({
			result: "MANUAL_CHECK_REQUIRED",
			reason: "LINKED_TO_OTHER_STAFF",
		});
	});

	it("email が未確認なら手動確認", async () => {
		setClerkUsers([clerkUser({ staffUserId: "user-1", verified: false })]);
		expect(await run()).toMatchObject({
			result: "MANUAL_CHECK_REQUIRED",
			reason: "EMAIL_NOT_VERIFIED",
		});
	});

	it("停止・ロック中なら手動確認（ACTIVE にしない）", async () => {
		setClerkUsers([clerkUser({ staffUserId: "user-1", usable: false })]);
		expect(await run()).toMatchObject({
			result: "MANUAL_CHECK_REQUIRED",
			reason: "ACCOUNT_UNUSABLE",
		});
		expect(prisma.user.updateMany).not.toHaveBeenCalled();
	});

	it("別経路のアカウントは、まず確認トークンを返す（まだ紐付けない）", async () => {
		setClerkUsers([clerkUser({ staffUserId: null })]);
		const outcome = await run();
		expect(outcome.result).toBe("CONFIRM_REQUIRED");
		expect(prisma.user.updateMany).not.toHaveBeenCalled();
	});

	it("確認トークンを付けて再実行すると紐付ける", async () => {
		setClerkUsers([clerkUser({ staffUserId: null })]);
		const first = await run();
		if (first.result !== "CONFIRM_REQUIRED") {
			throw new Error("確認トークンが返っていない");
		}

		const second = await run(first.confirmationToken);
		expect(second.result).toBe("LINKED");
	});

	it("別の NURSE がトークンを使うと 409", async () => {
		setClerkUsers([clerkUser({ staffUserId: null })]);
		const first = await run(undefined, "nurse-1");
		if (first.result !== "CONFIRM_REQUIRED") {
			throw new Error("確認トークンが返っていない");
		}

		await expect(run(first.confirmationToken, "nurse-2")).rejects.toMatchObject(
			{ status: 409 },
		);
	});

	it("確認後にスタッフが更新されていたら 409", async () => {
		setClerkUsers([clerkUser({ staffUserId: null })]);
		const first = await run();
		if (first.result !== "CONFIRM_REQUIRED") {
			throw new Error("確認トークンが返っていない");
		}

		const updatedStaff = {
			...staff,
			updatedAt: new Date("2026-10-14T00:00:00.000Z"),
		};
		await expect(
			run(first.confirmationToken, "nurse-1", updatedStaff),
		).rejects.toMatchObject({ status: 409 });
	});

	it("確認後に候補のアカウントが変わっていたら 409", async () => {
		setClerkUsers([clerkUser({ id: "c1", staffUserId: null })]);
		const first = await run();
		if (first.result !== "CONFIRM_REQUIRED") {
			throw new Error("確認トークンが返っていない");
		}

		setClerkUsers([clerkUser({ id: "c2", staffUserId: null })]);
		await expect(run(first.confirmationToken)).rejects.toMatchObject({
			status: 409,
		});
	});

	it("改ざんされたトークンは 409", async () => {
		setClerkUsers([clerkUser({ staffUserId: null })]);
		await expect(run("v1.aaa.bbb.ccc")).rejects.toMatchObject({
			status: 409,
		});
	});

	it("確認トークンがあっても、未確認 email なら紐付けない", async () => {
		setClerkUsers([clerkUser({ staffUserId: null })]);
		const first = await run();
		if (first.result !== "CONFIRM_REQUIRED") {
			throw new Error("確認トークンが返っていない");
		}

		setClerkUsers([clerkUser({ staffUserId: null, verified: false })]);
		expect(await run(first.confirmationToken)).toMatchObject({
			result: "MANUAL_CHECK_REQUIRED",
			reason: "EMAIL_NOT_VERIFIED",
		});
		expect(prisma.user.updateMany).not.toHaveBeenCalled();
	});
});

describe("Clerk アカウントがない場合", () => {
	beforeEach(() => {
		setClerkUsers([]);
	});

	it("本システムの有効な招待があれば、再送しない", async () => {
		setInvitations([
			{ id: "inv_1", email: "a@example.com", staffUserId: "user-1" },
		]);
		expect((await run()).result).toBe("ALREADY_INVITED");
		expect(createStaffInvitation).not.toHaveBeenCalled();
	});

	it("本システム以外の招待があれば手動確認", async () => {
		setInvitations([
			{ id: "inv_9", email: "a@example.com", staffUserId: null },
		]);
		expect(await run()).toMatchObject({
			result: "MANUAL_CHECK_REQUIRED",
			reason: "FOREIGN_INVITATION",
		});
		expect(createStaffInvitation).not.toHaveBeenCalled();
	});

	it("招待がなければ送る", async () => {
		setInvitations([]);
		vi.mocked(createStaffInvitation).mockResolvedValue({
			kind: "SUCCESS",
			data: { id: "inv_1", email: "a@example.com", staffUserId: "user-1" },
		});
		expect((await run()).result).toBe("SENT");
		expect(createStaffInvitation).toHaveBeenCalledWith(
			"a@example.com",
			"user-1",
		);
	});

	it("送信が時間切れなら SEND_UNKNOWN", async () => {
		setInvitations([]);
		vi.mocked(createStaffInvitation).mockResolvedValue({
			kind: "UNKNOWN",
			reason: "TIMEOUT",
		});
		expect((await run()).result).toBe("SEND_UNKNOWN");
	});

	it("送信失敗でも、確認し直して自分の招待があれば ALREADY_INVITED", async () => {
		vi.mocked(findPendingInvitations)
			.mockResolvedValueOnce({ kind: "SUCCESS", data: [] })
			.mockResolvedValueOnce({
				kind: "SUCCESS",
				data: [{ id: "inv_1", email: "a@example.com", staffUserId: "user-1" }],
			});
		vi.mocked(createStaffInvitation).mockResolvedValue({
			kind: "FAILED",
			errorCode: "duplicate_record",
			status: 400,
		});
		expect((await run()).result).toBe("ALREADY_INVITED");
	});

	it("送信失敗で、確認し直しても招待がなければ SEND_FAILED", async () => {
		setInvitations([]);
		vi.mocked(createStaffInvitation).mockResolvedValue({
			kind: "FAILED",
			errorCode: "form_param_invalid",
			status: 422,
		});
		expect((await run()).result).toBe("SEND_FAILED");
	});

	it("確認トークンが付いているのに候補がなければ 409", async () => {
		await expect(run("v1.aaa.bbb.ccc")).rejects.toMatchObject({
			status: 409,
		});
	});
});

describe("Clerk を確認できない場合", () => {
	it("アカウント検索に失敗したら RETRY_REQUIRED（送らない）", async () => {
		vi.mocked(findClerkUsersByEmail).mockResolvedValue({
			kind: "UNKNOWN",
			reason: "TIMEOUT",
		});
		expect((await run()).result).toBe("RETRY_REQUIRED");
		expect(createStaffInvitation).not.toHaveBeenCalled();
	});

	it("招待の検索に失敗したら RETRY_REQUIRED（送らない）", async () => {
		setClerkUsers([]);
		vi.mocked(findPendingInvitations).mockResolvedValue({
			kind: "UNKNOWN",
			reason: "NETWORK",
		});
		expect((await run()).result).toBe("RETRY_REQUIRED");
		expect(createStaffInvitation).not.toHaveBeenCalled();
	});
});
