import { beforeEach, describe, expect, it, vi } from "vitest";
import { notifyOps } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { getClerkUser } from "./clerk-admin";
import { deleteStaffOfDeletedClerkUser } from "./clerk-webhook";
import { reconcileDeletedClerkUsers } from "./deleted-clerk-users";
import { withStaffLock } from "./staff-lock";

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { user: { findMany: vi.fn() } },
}));

vi.mock("@/shared/lib/logger", () => ({ notifyOps: vi.fn() }));

vi.mock("./clerk-admin", () => ({ getClerkUser: vi.fn() }));

vi.mock("./clerk-webhook", () => ({ deleteStaffOfDeletedClerkUser: vi.fn() }));

vi.mock("./staff-lock", () => ({
	withStaffLock: vi.fn(async (work: (lock: unknown) => Promise<unknown>) =>
		work({ ensureCanContinue: () => {} }),
	),
}));

const findMany = vi.mocked(prisma.user.findMany);
const getClerkUserMock = vi.mocked(getClerkUser);
const deleteMock = vi.mocked(deleteStaffOfDeletedClerkUser);
const withLockMock = vi.mocked(withStaffLock);

beforeEach(() => {
	vi.clearAllMocks();
});

describe("reconcileDeletedClerkUsers", () => {
	it("Clerk にいないアカウントの行だけを削除する", async () => {
		findMany.mockResolvedValue([
			{ id: "u1", clerkUserId: "c1" }, // Clerk にいない → 削除
			{ id: "u2", clerkUserId: "c2" }, // まだいる → そのまま
		] as never);
		getClerkUserMock
			.mockResolvedValueOnce({ kind: "SUCCESS", data: null })
			.mockResolvedValueOnce({
				kind: "SUCCESS",
				data: {
					id: "c2",
					primaryEmail: "a@example.com",
					isPrimaryEmailVerified: true,
					staffUserId: null,
					isUsable: true,
				},
			});

		const report = await reconcileDeletedClerkUsers({ dryRun: false });

		expect(report).toEqual({ scanned: 2, deleted: 1, failed: 0 });
		expect(deleteMock).toHaveBeenCalledTimes(1);
		expect(deleteMock).toHaveBeenCalledWith("c1", expect.anything());
	});

	it("dry-run では削除せず数えるだけ", async () => {
		findMany.mockResolvedValue([{ id: "u1", clerkUserId: "c1" }] as never);
		getClerkUserMock.mockResolvedValue({ kind: "SUCCESS", data: null });

		const report = await reconcileDeletedClerkUsers({ dryRun: true });

		expect(report).toEqual({ scanned: 1, deleted: 1, failed: 0 });
		expect(deleteMock).not.toHaveBeenCalled();
		expect(withLockMock).not.toHaveBeenCalled();
	});

	it("Clerk に到達できないときは消えたと判断しない（次回に回す）", async () => {
		findMany.mockResolvedValue([{ id: "u1", clerkUserId: "c1" }] as never);
		getClerkUserMock.mockResolvedValue({ kind: "UNKNOWN", reason: "TIMEOUT" });

		const report = await reconcileDeletedClerkUsers({ dryRun: false });

		expect(report).toEqual({ scanned: 1, deleted: 0, failed: 1 });
		expect(deleteMock).not.toHaveBeenCalled();
	});

	it("ロックが取れなかったものは failed にして次回に回す", async () => {
		findMany.mockResolvedValue([{ id: "u1", clerkUserId: "c1" }] as never);
		getClerkUserMock.mockResolvedValue({ kind: "SUCCESS", data: null });
		withLockMock.mockRejectedValueOnce(new Error("lock timeout"));

		const report = await reconcileDeletedClerkUsers({ dryRun: false });

		expect(report).toEqual({ scanned: 1, deleted: 0, failed: 1 });
		expect(notifyOps).toHaveBeenCalledWith(
			"DELETED_CLERK_USER_RECONCILE_FAILED",
			expect.objectContaining({ targetId: "u1" }),
		);
	});
});
