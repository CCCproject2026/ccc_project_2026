import { beforeEach, describe, expect, it, vi } from "vitest";

// ===== 偽物（モック）=====
vi.mock("./staff-lock", () => ({
	withStaffLock: vi.fn(async (work: (lock: unknown) => Promise<unknown>) =>
		work({ ensureCanContinue: () => {} }),
	),
}));
vi.mock("./clerk-admin", () => ({ listAllPendingInvitations: vi.fn() }));
vi.mock("./staff-service", () => ({ revokeOwnInvitations: vi.fn() }));
vi.mock("@/shared/lib/logger", () => ({ notifyOps: vi.fn() }));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: { user: { findMany: vi.fn(), findUnique: vi.fn() } },
}));

import { notifyOps } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { revokeCancelledInvitations } from "./cancelled-invitations";
import { listAllPendingInvitations } from "./clerk-admin";
import { revokeOwnInvitations } from "./staff-service";

// 取消済み（INACTIVE・未紐付け）のスタッフ
const cancelledStaff = {
	id: "user-1",
	email: "a@example.com",
	status: "INACTIVE",
	clerkUserId: null,
};

// Clerk の有効な招待を設定する
function setPendingInvitations(
	invitations: { id: string; email: string; staffUserId: string | null }[],
) {
	vi.mocked(listAllPendingInvitations).mockResolvedValue({
		kind: "SUCCESS",
		data: invitations,
	});
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("revokeCancelledInvitations", () => {
	it("本システムの招待がなければ、DB も見ずに終わる", async () => {
		setPendingInvitations([
			{ id: "inv_9", email: "x@example.com", staffUserId: null },
		]);
		const report = await revokeCancelledInvitations({ dryRun: false });
		expect(report).toMatchObject({ pendingInvitations: 1, targets: 0 });
		expect(prisma.user.findMany).not.toHaveBeenCalled();
	});

	it("INACTIVE・未紐付けのスタッフだけを探す", async () => {
		setPendingInvitations([
			{ id: "inv_1", email: "a@example.com", staffUserId: "user-1" },
			{ id: "inv_2", email: "b@example.com", staffUserId: "user-2" },
		]);
		vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);

		await revokeCancelledInvitations({ dryRun: false });
		expect(prisma.user.findMany).toHaveBeenCalledWith({
			where: {
				id: { in: ["user-1", "user-2"] },
				status: "INACTIVE",
				clerkUserId: null,
			},
			select: { id: true },
		});
	});

	it("dryRun では数えるだけで、失効させない", async () => {
		setPendingInvitations([
			{ id: "inv_1", email: "a@example.com", staffUserId: "user-1" },
		]);
		vi.mocked(prisma.user.findMany).mockResolvedValue([
			{ id: "user-1" },
		] as never);

		const report = await revokeCancelledInvitations({ dryRun: true });
		expect(report.targets).toBe(1);
		expect(revokeOwnInvitations).not.toHaveBeenCalled();
	});

	it("ロックの中で確認し直してから失効させる", async () => {
		setPendingInvitations([
			{ id: "inv_1", email: "a@example.com", staffUserId: "user-1" },
		]);
		vi.mocked(prisma.user.findMany).mockResolvedValue([
			{ id: "user-1" },
		] as never);
		vi.mocked(prisma.user.findUnique).mockResolvedValue(
			cancelledStaff as never,
		);
		vi.mocked(revokeOwnInvitations).mockResolvedValue(true);

		const report = await revokeCancelledInvitations({ dryRun: false });
		expect(report).toMatchObject({ targets: 1, revoked: 1, failed: 0 });
	});

	it("待っている間に再招待されていたら（PENDING）、失効させない", async () => {
		setPendingInvitations([
			{ id: "inv_1", email: "a@example.com", staffUserId: "user-1" },
		]);
		vi.mocked(prisma.user.findMany).mockResolvedValue([
			{ id: "user-1" },
		] as never);
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			...cancelledStaff,
			status: "PENDING",
		} as never);

		const report = await revokeCancelledInvitations({ dryRun: false });
		expect(report.skipped).toBe(1);
		expect(revokeOwnInvitations).not.toHaveBeenCalled();
	});

	it("失効できなければ failed に数え、担当者に知らせる（次回また試す）", async () => {
		setPendingInvitations([
			{ id: "inv_1", email: "a@example.com", staffUserId: "user-1" },
		]);
		vi.mocked(prisma.user.findMany).mockResolvedValue([
			{ id: "user-1" },
		] as never);
		vi.mocked(prisma.user.findUnique).mockResolvedValue(
			cancelledStaff as never,
		);
		vi.mocked(revokeOwnInvitations).mockResolvedValue(false);

		const report = await revokeCancelledInvitations({ dryRun: false });
		expect(report.failed).toBe(1);
		expect(notifyOps).toHaveBeenCalled();
	});

	it("Clerk の招待一覧を取れなければエラー（担当者に知らせる）", async () => {
		vi.mocked(listAllPendingInvitations).mockResolvedValue({
			kind: "UNKNOWN",
			reason: "TIMEOUT",
		});
		await expect(
			revokeCancelledInvitations({ dryRun: false }),
		).rejects.toThrow();
		expect(notifyOps).toHaveBeenCalled();
	});
});
