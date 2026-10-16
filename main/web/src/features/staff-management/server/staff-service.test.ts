import type { User } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ===== 偽物（モック）=====
// ロック: すぐに work を実行する
vi.mock("./staff-lock", () => ({
	withStaffLock: vi.fn(async (work: (lock: unknown) => Promise<unknown>) =>
		work({ ensureCanContinue: () => {} }),
	),
}));
// 権限: いつも nurse-1 が操作している
vi.mock("@/shared/lib/auth", () => ({
	requireRole: vi.fn(async () => ({ id: "nurse-1" })),
}));
vi.mock("./reconcile", () => ({ reconcileStaff: vi.fn() }));
vi.mock("./clerk-admin", () => ({
	findPendingInvitations: vi.fn(),
	revokeInvitation: vi.fn(),
	getClerkUser: vi.fn(),
}));
vi.mock("./audit", () => ({ logStaffOperation: vi.fn() }));
vi.mock("@/shared/lib/prisma", () => {
	const user = {
		findUnique: vi.fn(),
		findUniqueOrThrow: vi.fn(),
		findMany: vi.fn(),
		create: vi.fn(),
		updateMany: vi.fn(),
		count: vi.fn(),
	};
	return {
		prisma: {
			user,
			// トランザクションの中でも同じ偽物を使う
			$transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) =>
				work({ user }),
			),
		},
	};
});

import { requireRole } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import {
	findPendingInvitations,
	getClerkUser,
	revokeInvitation,
} from "./clerk-admin";
import { reconcileStaff } from "./reconcile";
import {
	activateStaff,
	cancelInvitation,
	changeRole,
	deactivateStaff,
	inviteStaff,
	reinviteStaff,
	syncInvitation,
} from "./staff-service";

// テスト用のスタッフを作る
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

const inviteInput = {
	email: "a@example.com",
	role: "CAREGIVER" as const,
	lastName: "田中",
	firstName: "花子",
	dateOfBirth: "1990-04-01",
	startDate: "2026-10-01",
	nationality: "日本",
	gender: "女性" as const,
};

beforeEach(() => {
	vi.clearAllMocks();
	// 何も設定しなければ「ACTIVE な NURSE は2人」
	vi.mocked(prisma.user.count).mockResolvedValue(2 as never);
});

describe("新規招待 inviteStaff", () => {
	it("同じ email のスタッフがいれば 409。User は作らない", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(makeStaff() as never);
		await expect(inviteStaff(inviteInput)).rejects.toMatchObject({
			status: 409,
		});
		expect(prisma.user.create).not.toHaveBeenCalled();
	});

	it("全項目を入れて PENDING で作り、照合する", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
		vi.mocked(prisma.user.create).mockResolvedValue(makeStaff() as never);
		vi.mocked(reconcileStaff).mockResolvedValue({
			result: "SENT",
			staff: makeStaff(),
		});

		const response = await inviteStaff(inviteInput);

		expect(prisma.user.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				email: "a@example.com",
				status: "PENDING",
				dateOfBirth: new Date("1990-04-01T00:00:00.000Z"),
			}),
		});
		expect(response.result).toBe("SENT");
		expect(response.staff.status).toBe("PENDING");
	});

	it("ロックを取った後に、権限をもう一度確認している", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
		vi.mocked(prisma.user.create).mockResolvedValue(makeStaff() as never);
		vi.mocked(reconcileStaff).mockResolvedValue({
			result: "SENT",
			staff: makeStaff(),
		});
		await inviteStaff(inviteInput);
		expect(requireRole).toHaveBeenCalledWith("NURSE");
	});

	it("送信が確実に失敗したら INACTIVE にして 502（再招待を案内）", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
		vi.mocked(prisma.user.create).mockResolvedValue(makeStaff() as never);
		vi.mocked(reconcileStaff).mockResolvedValue({
			result: "SEND_FAILED",
			staff: makeStaff(),
		});
		vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue(
			makeStaff({ status: "INACTIVE" }) as never,
		);

		await expect(inviteStaff(inviteInput)).rejects.toMatchObject({
			status: 502,
			extra: { retryAction: "REINVITE", staff: { status: "INACTIVE" } },
		});
		expect(prisma.user.updateMany).toHaveBeenCalledWith({
			where: { id: "user-1", status: "PENDING", clerkUserId: null },
			data: { status: "INACTIVE" },
		});
	});

	it("送信結果が不明なら PENDING のまま 502（照合を案内）", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
		vi.mocked(prisma.user.create).mockResolvedValue(makeStaff() as never);
		vi.mocked(reconcileStaff).mockResolvedValue({
			result: "SEND_UNKNOWN",
			staff: makeStaff(),
		});

		await expect(inviteStaff(inviteInput)).rejects.toMatchObject({
			status: 502,
			extra: { retryAction: "SYNC", staff: { status: "PENDING" } },
		});
		expect(prisma.user.updateMany).not.toHaveBeenCalled();
	});

	it("既存アカウントが見つかったら 201 と確認トークンを返す", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
		vi.mocked(prisma.user.create).mockResolvedValue(makeStaff() as never);
		vi.mocked(reconcileStaff).mockResolvedValue({
			result: "CONFIRM_REQUIRED",
			staff: makeStaff(),
			confirmationToken: "token-123",
		});

		const response = await inviteStaff(inviteInput);
		expect(response.result).toBe("CONFIRM_REQUIRED");
		expect(response.confirmationToken).toBe("token-123");
	});
});

describe("照合 syncInvitation", () => {
	it("スタッフがいなければ 404", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
		await expect(syncInvitation("nope")).rejects.toMatchObject({
			status: 404,
		});
	});

	it("照合からの送信が失敗しても PENDING のまま 502（照合を案内）", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(makeStaff() as never);
		vi.mocked(reconcileStaff).mockResolvedValue({
			result: "SEND_FAILED",
			staff: makeStaff(),
		});

		await expect(syncInvitation("user-1")).rejects.toMatchObject({
			status: 502,
			extra: { retryAction: "SYNC" },
		});
		expect(prisma.user.updateMany).not.toHaveBeenCalled();
	});

	it("確認トークンを照合に渡す", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(makeStaff() as never);
		vi.mocked(reconcileStaff).mockResolvedValue({
			result: "LINKED",
			staff: makeStaff({ status: "ACTIVE", clerkUserId: "c1" }),
		});

		const response = await syncInvitation("user-1", "token-123");
		expect(reconcileStaff).toHaveBeenCalledWith(
			expect.objectContaining({ confirmationToken: "token-123" }),
		);
		expect(response.staff.status).toBe("ACTIVE");
	});
});

describe("取消 cancelInvitation", () => {
	it("既に ACTIVE なら 409（無効化を案内）", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(
			makeStaff({ status: "ACTIVE", clerkUserId: "c1" }) as never,
		);
		await expect(cancelInvitation("user-1")).rejects.toMatchObject({
			status: 409,
		});
	});

	it("DB を先に INACTIVE にしてから、自分の招待を失効させる", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(makeStaff() as never);
		vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 } as never);
		vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue(
			makeStaff({ status: "INACTIVE" }) as never,
		);
		vi.mocked(findPendingInvitations)
			.mockResolvedValueOnce({
				kind: "SUCCESS",
				data: [
					{ id: "inv_1", email: "a@example.com", staffUserId: "user-1" },
					{ id: "inv_9", email: "a@example.com", staffUserId: null },
				],
			})
			.mockResolvedValueOnce({ kind: "SUCCESS", data: [] });

		const response = await cancelInvitation("user-1");

		expect(prisma.user.updateMany).toHaveBeenCalledWith({
			where: { id: "user-1", status: "PENDING", clerkUserId: null },
			data: { status: "INACTIVE" },
		});
		// 本システムの招待だけを失効させる
		expect(revokeInvitation).toHaveBeenCalledTimes(1);
		expect(revokeInvitation).toHaveBeenCalledWith("inv_1");
		expect(response.staff.status).toBe("INACTIVE");
	});

	it("失効させても招待が残っていたら 502（取消の再試行を案内）。DB は INACTIVE のまま", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(makeStaff() as never);
		vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 } as never);
		vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue(
			makeStaff({ status: "INACTIVE" }) as never,
		);
		const own = { id: "inv_1", email: "a@example.com", staffUserId: "user-1" };
		vi.mocked(findPendingInvitations).mockResolvedValue({
			kind: "SUCCESS",
			data: [own],
		});

		await expect(cancelInvitation("user-1")).rejects.toMatchObject({
			status: 502,
			extra: { retryAction: "RETRY_CANCEL", staff: { status: "INACTIVE" } },
		});
	});

	it("INACTIVE・未紐付けなら、DB は変えずに失効だけやり直す", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(
			makeStaff({ status: "INACTIVE" }) as never,
		);
		vi.mocked(findPendingInvitations).mockResolvedValue({
			kind: "SUCCESS",
			data: [],
		});

		const response = await cancelInvitation("user-1");
		expect(prisma.user.updateMany).not.toHaveBeenCalled();
		expect(response.staff.status).toBe("INACTIVE");
	});
});

describe("再招待 reinviteStaff", () => {
	function mockReinvitable() {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(
			makeStaff({ status: "INACTIVE" }) as never,
		);
		vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 } as never);
		vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue(
			makeStaff() as never,
		);
		vi.mocked(reconcileStaff).mockResolvedValue({
			result: "SENT",
			staff: makeStaff(),
		});
	}

	it("生年月日などが空欄（undefined）なら、その項目は更新しない", async () => {
		mockReinvitable();

		await reinviteStaff("user-1", {
			role: "NURSE",
			lastName: "田中",
			firstName: "花子",
		});

		expect(prisma.user.updateMany).toHaveBeenCalledWith({
			where: { id: "user-1", status: "INACTIVE", clerkUserId: null },
			data: {
				role: "NURSE",
				lastName: "田中",
				firstName: "花子",
				status: "PENDING",
			},
		});
	});

	it("入力された項目だけを更新する", async () => {
		mockReinvitable();

		await reinviteStaff("user-1", {
			role: "CAREGIVER",
			lastName: "田中",
			firstName: "花子",
			startDate: "2026-11-01",
			gender: "男性",
		});

		expect(prisma.user.updateMany).toHaveBeenCalledWith({
			where: { id: "user-1", status: "INACTIVE", clerkUserId: null },
			data: {
				role: "CAREGIVER",
				lastName: "田中",
				firstName: "花子",
				status: "PENDING",
				startDate: new Date("2026-11-01T00:00:00.000Z"),
				gender: "男性",
			},
		});
	});

	it("取消・失敗した（INACTIVE・未紐付け）スタッフ以外は 409", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(
			makeStaff({ status: "ACTIVE", clerkUserId: "clerk_1" }) as never,
		);
		await expect(
			reinviteStaff("user-1", {
				role: "CAREGIVER",
				lastName: "田中",
				firstName: "花子",
			}),
		).rejects.toMatchObject({ status: 409 });
		expect(prisma.user.updateMany).not.toHaveBeenCalled();
	});
});

describe("ロール変更 changeRole", () => {
	it("自分のロールは変更できない（403）。DB も見ない", async () => {
		// 操作している人は nurse-1（requireRole の偽物が返す）
		await expect(changeRole("nurse-1", "CAREGIVER")).rejects.toMatchObject({
			status: 403,
			code: "FORBIDDEN",
		});
		expect(prisma.user.findUnique).not.toHaveBeenCalled();
		expect(prisma.user.updateMany).not.toHaveBeenCalled();
	});

	it("最後の NURSE を CAREGIVER にすると 403", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(
			makeStaff({
				status: "ACTIVE",
				role: "NURSE",
				clerkUserId: "c1",
			}) as never,
		);
		vi.mocked(prisma.user.count).mockResolvedValue(1 as never);

		await expect(changeRole("user-1", "CAREGIVER")).rejects.toMatchObject({
			status: 403,
			code: "LAST_NURSE",
		});
		expect(prisma.user.updateMany).not.toHaveBeenCalled();
	});

	it("同じロールなら何もせず 200", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(
			makeStaff({ status: "ACTIVE", clerkUserId: "c1" }) as never,
		);
		const response = await changeRole("user-1", "CAREGIVER");
		expect(prisma.user.updateMany).not.toHaveBeenCalled();
		expect(response.staff.role).toBe("CAREGIVER");
	});

	it("ACTIVE でなければ 409", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(makeStaff() as never);
		await expect(changeRole("user-1", "NURSE")).rejects.toMatchObject({
			status: 409,
		});
	});

	it("CAREGIVER を NURSE にできる", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(
			makeStaff({ status: "ACTIVE", clerkUserId: "c1" }) as never,
		);
		vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 } as never);
		vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue(
			makeStaff({
				status: "ACTIVE",
				role: "NURSE",
				clerkUserId: "c1",
			}) as never,
		);

		const response = await changeRole("user-1", "NURSE");
		expect(prisma.user.updateMany).toHaveBeenCalledWith({
			where: { id: "user-1", status: "ACTIVE", role: "CAREGIVER" },
			data: { role: "NURSE" },
		});
		expect(response.staff.role).toBe("NURSE");
	});
});

describe("無効化 deactivateStaff", () => {
	it("自分自身は無効化できない（403）。DB も見ない", async () => {
		// 操作している人は nurse-1（requireRole の偽物が返す）
		await expect(deactivateStaff("nurse-1")).rejects.toMatchObject({
			status: 403,
			code: "FORBIDDEN",
		});
		expect(prisma.user.findUnique).not.toHaveBeenCalled();
		expect(prisma.user.updateMany).not.toHaveBeenCalled();
	});

	it("最後の NURSE は無効化できない（403）", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(
			makeStaff({
				status: "ACTIVE",
				role: "NURSE",
				clerkUserId: "c1",
			}) as never,
		);
		vi.mocked(prisma.user.count).mockResolvedValue(1 as never);
		await expect(deactivateStaff("user-1")).rejects.toMatchObject({
			status: 403,
			code: "LAST_NURSE",
		});
	});

	it("既に無効化済みなら何もせず 200", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(
			makeStaff({ status: "INACTIVE", clerkUserId: "c1" }) as never,
		);
		const response = await deactivateStaff("user-1");
		expect(prisma.user.updateMany).not.toHaveBeenCalled();
		expect(response.staff.status).toBe("INACTIVE");
	});

	it("PENDING は無効化ではなく取消（409）", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(makeStaff() as never);
		await expect(deactivateStaff("user-1")).rejects.toMatchObject({
			status: 409,
			message: expect.stringContaining("「取消」"),
		});
	});

	it("取消済み（INACTIVE・未紐付け）は 409。「取消してください」とは案内しない", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(
			makeStaff({ status: "INACTIVE" }) as never,
		);
		await expect(deactivateStaff("user-1")).rejects.toMatchObject({
			status: 409,
			message: expect.stringContaining("取消済み"),
		});
	});

	it("ACTIVE な CAREGIVER を INACTIVE にする", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(
			makeStaff({ status: "ACTIVE", clerkUserId: "c1" }) as never,
		);
		vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 } as never);
		vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue(
			makeStaff({ status: "INACTIVE", clerkUserId: "c1" }) as never,
		);

		const response = await deactivateStaff("user-1");
		expect(response.staff.status).toBe("INACTIVE");
	});
});

describe("有効化 activateStaff", () => {
	const stopped = makeStaff({ status: "INACTIVE", clerkUserId: "c1" });

	function clerkAccount(overrides: object = {}) {
		return {
			id: "c1",
			primaryEmail: "new@example.com",
			isPrimaryEmailVerified: true,
			staffUserId: null,
			isUsable: true,
			...overrides,
		};
	}

	it("Clerk アカウントがなければ 409", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(stopped as never);
		vi.mocked(getClerkUser).mockResolvedValue({ kind: "SUCCESS", data: null });
		await expect(activateStaff("user-1")).rejects.toMatchObject({
			status: 409,
		});
	});

	it("Clerk を確認できなければ 502。INACTIVE のまま", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(stopped as never);
		vi.mocked(getClerkUser).mockResolvedValue({
			kind: "UNKNOWN",
			reason: "TIMEOUT",
		});
		await expect(activateStaff("user-1")).rejects.toMatchObject({
			status: 502,
		});
		expect(prisma.user.updateMany).not.toHaveBeenCalled();
	});

	it("停止中の Clerk アカウントなら 409", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue(stopped as never);
		vi.mocked(getClerkUser).mockResolvedValue({
			kind: "SUCCESS",
			data: clerkAccount({ isUsable: false }),
		});
		await expect(activateStaff("user-1")).rejects.toMatchObject({
			status: 409,
		});
	});

	it("email が別のスタッフと重複していれば 409", async () => {
		vi.mocked(prisma.user.findUnique)
			.mockResolvedValueOnce(stopped as never)
			.mockResolvedValueOnce(makeStaff({ id: "user-2" }) as never);
		vi.mocked(getClerkUser).mockResolvedValue({
			kind: "SUCCESS",
			data: clerkAccount(),
		});
		await expect(activateStaff("user-1")).rejects.toMatchObject({
			status: 409,
			code: "DUPLICATE",
		});
	});

	it("ACTIVE に戻し、email を最新にする", async () => {
		vi.mocked(prisma.user.findUnique)
			.mockResolvedValueOnce(stopped as never)
			.mockResolvedValueOnce(null as never);
		vi.mocked(getClerkUser).mockResolvedValue({
			kind: "SUCCESS",
			data: clerkAccount(),
		});
		vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 } as never);
		vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue(
			makeStaff({
				status: "ACTIVE",
				clerkUserId: "c1",
				email: "new@example.com",
			}) as never,
		);

		const response = await activateStaff("user-1");
		expect(prisma.user.updateMany).toHaveBeenCalledWith({
			where: { id: "user-1", status: "INACTIVE", clerkUserId: "c1" },
			data: { status: "ACTIVE", email: "new@example.com" },
		});
		expect(response.staff.status).toBe("ACTIVE");
	});
});
