import { beforeEach, describe, expect, it, vi } from "vitest";

// 本物の Clerk・DB・redirect の代わりに、偽物（モック）を使う
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: { user: { findUnique: vi.fn() } },
}));
vi.mock("next/navigation", () => ({
	// 本物の redirect はエラーを投げて処理を止めるので、同じように投げる
	redirect: vi.fn((url: string) => {
		throw new Error(`REDIRECT:${url}`);
	}),
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/shared/lib/prisma";
import {
	requireRole,
	requireRolePage,
	requireStaff,
	requireStaffPage,
} from "./auth";

// ログイン状態を設定する（null = ログインしていない）
function setClerkUser(userId: string | null) {
	vi.mocked(auth).mockResolvedValue({ userId } as never);
}

// DB にいる User を設定する（null = いない）
function setDbUser(user: { status: string; role: string } | null) {
	vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("requireStaff（API用）", () => {
	it("ログインしていなければ 401", async () => {
		setClerkUser(null);
		await expect(requireStaff()).rejects.toMatchObject({ status: 401 });
	});

	it("DB にいなければ 403", async () => {
		setClerkUser("clerk_1");
		setDbUser(null);
		await expect(requireStaff()).rejects.toMatchObject({ status: 403 });
	});

	it("INACTIVE なら 403", async () => {
		setClerkUser("clerk_1");
		setDbUser({ status: "INACTIVE", role: "NURSE" });
		await expect(requireStaff()).rejects.toMatchObject({ status: 403 });
	});

	it("ACTIVE なら User を返す", async () => {
		setClerkUser("clerk_1");
		setDbUser({ status: "ACTIVE", role: "CAREGIVER" });
		await expect(requireStaff()).resolves.toMatchObject({ status: "ACTIVE" });
	});

	it("Clerk の ID で DB を探している", async () => {
		setClerkUser("clerk_1");
		setDbUser({ status: "ACTIVE", role: "CAREGIVER" });
		await requireStaff();
		expect(prisma.user.findUnique).toHaveBeenCalledWith({
			where: { clerkUserId: "clerk_1" },
		});
	});
});

describe("requireRole（API用）", () => {
	it("CAREGIVER が NURSE 専用を呼ぶと 403", async () => {
		setClerkUser("clerk_1");
		setDbUser({ status: "ACTIVE", role: "CAREGIVER" });
		await expect(requireRole("NURSE")).rejects.toMatchObject({ status: 403 });
	});

	it("INACTIVE の NURSE は 403", async () => {
		setClerkUser("clerk_1");
		setDbUser({ status: "INACTIVE", role: "NURSE" });
		await expect(requireRole("NURSE")).rejects.toMatchObject({ status: 403 });
	});

	it("ACTIVE な NURSE は通る", async () => {
		setClerkUser("clerk_1");
		setDbUser({ status: "ACTIVE", role: "NURSE" });
		await expect(requireRole("NURSE")).resolves.toMatchObject({
			role: "NURSE",
		});
	});
});

describe("requireStaffPage / requireRolePage（ページ用）", () => {
	it("ログインしていなければ /login へ", async () => {
		setClerkUser(null);
		await expect(requireStaffPage()).rejects.toThrow("REDIRECT:/login");
	});

	it("DB にいなければ /account-status へ", async () => {
		setClerkUser("clerk_1");
		setDbUser(null);
		await expect(requireStaffPage()).rejects.toThrow(
			"REDIRECT:/account-status",
		);
	});

	it("INACTIVE なら /account-status へ", async () => {
		setClerkUser("clerk_1");
		setDbUser({ status: "INACTIVE", role: "NURSE" });
		await expect(requireStaffPage()).rejects.toThrow(
			"REDIRECT:/account-status",
		);
	});

	it("ACTIVE なら User を返す", async () => {
		setClerkUser("clerk_1");
		setDbUser({ status: "ACTIVE", role: "CAREGIVER" });
		await expect(requireStaffPage()).resolves.toMatchObject({
			status: "ACTIVE",
		});
	});

	it("CAREGIVER が NURSE 専用ページを開くと /dashboard へ", async () => {
		setClerkUser("clerk_1");
		setDbUser({ status: "ACTIVE", role: "CAREGIVER" });
		await expect(requireRolePage("NURSE")).rejects.toThrow(
			"REDIRECT:/dashboard",
		);
	});
});
