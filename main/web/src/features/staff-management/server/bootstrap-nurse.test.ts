import { beforeEach, describe, expect, it, vi } from "vitest";

// ===== 偽物（モック）=====
vi.mock("./staff-lock", () => ({
	withStaffLock: vi.fn(async (work: (lock: unknown) => Promise<unknown>) =>
		work({ ensureCanContinue: () => {} }),
	),
}));
vi.mock("./clerk-admin", () => ({
	findClerkUsersByEmail: vi.fn(),
	createClerkUserWithPassword: vi.fn(),
}));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		user: {
			count: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		},
	},
}));

import { prisma } from "@/shared/lib/prisma";
import { bootstrapNurse } from "./bootstrap-nurse";
import {
	createClerkUserWithPassword,
	findClerkUsersByEmail,
} from "./clerk-admin";

const input = {
	email: "nurse@example.com",
	password: "a-strong-password",
	role: "NURSE" as const,
	lastName: "山田",
	firstName: "花子",
	dateOfBirth: "1990-04-01",
	startDate: "2026-10-01",
	nationality: "日本",
	gender: "FEMALE" as const,
};

// Clerk アカウントの偽物
function clerkAccount(overrides: object = {}) {
	return {
		id: "clerk_1",
		primaryEmail: "nurse@example.com",
		isPrimaryEmailVerified: true,
		staffUserId: null,
		isUsable: true,
		...overrides,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	// 何も設定しなければ「NURSE なし」「DB 行なし」
	vi.mocked(prisma.user.count).mockResolvedValue(0 as never);
	vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
	vi.mocked(prisma.user.create).mockResolvedValue({ id: "user-1" } as never);
	vi.mocked(prisma.user.update).mockResolvedValue({ id: "user-1" } as never);
});

describe("bootstrapNurse", () => {
	it("ACTIVE な NURSE が既にいれば、何もしない", async () => {
		vi.mocked(prisma.user.count).mockResolvedValue(1 as never);
		await expect(bootstrapNurse(input)).rejects.toThrow("既にいる");
		expect(findClerkUsersByEmail).not.toHaveBeenCalled();
	});

	it("新規なら Clerk アカウントを作り、ACTIVE・NURSE で保存する", async () => {
		vi.mocked(findClerkUsersByEmail).mockResolvedValue({
			kind: "SUCCESS",
			data: [],
		});
		vi.mocked(createClerkUserWithPassword).mockResolvedValue({
			kind: "SUCCESS",
			data: clerkAccount(),
		});

		const result = await bootstrapNurse(input);

		expect(result.isClerkUserCreated).toBe(true);
		expect(prisma.user.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				email: "nurse@example.com",
				clerkUserId: "clerk_1",
				role: "NURSE",
				status: "ACTIVE",
			}),
		});
	});

	it("途中失敗で Clerk だけ作られていた場合、再実行でそのアカウントを使う", async () => {
		vi.mocked(findClerkUsersByEmail).mockResolvedValue({
			kind: "SUCCESS",
			data: [clerkAccount()],
		});

		const result = await bootstrapNurse(input);
		expect(result.isClerkUserCreated).toBe(false);
		expect(createClerkUserWithPassword).not.toHaveBeenCalled();
		expect(prisma.user.create).toHaveBeenCalled();
	});

	it("同じ email の DB 行が残っていれば、その行を使う", async () => {
		vi.mocked(prisma.user.findUnique)
			.mockResolvedValueOnce({
				id: "user-1",
				email: "nurse@example.com",
				clerkUserId: null,
			} as never) // email で探す
			.mockResolvedValueOnce(null as never); // clerkUserId で探す
		vi.mocked(findClerkUsersByEmail).mockResolvedValue({
			kind: "SUCCESS",
			data: [clerkAccount()],
		});

		await bootstrapNurse(input);
		expect(prisma.user.update).toHaveBeenCalledWith({
			where: { id: "user-1" },
			data: expect.objectContaining({ clerkUserId: "clerk_1" }),
		});
		expect(prisma.user.create).not.toHaveBeenCalled();
	});

	it("既存の DB 行が別の Clerk アカウントに紐付いていたら止める（上書きしない）", async () => {
		vi.mocked(prisma.user.findUnique)
			.mockResolvedValueOnce({
				id: "user-1",
				email: "nurse@example.com",
				clerkUserId: "clerk_other",
			} as never)
			.mockResolvedValueOnce(null as never);
		vi.mocked(findClerkUsersByEmail).mockResolvedValue({
			kind: "SUCCESS",
			data: [clerkAccount()],
		});

		await expect(bootstrapNurse(input)).rejects.toThrow("別の Clerk");
		expect(prisma.user.update).not.toHaveBeenCalled();
	});

	it("Clerk アカウントが別のスタッフに紐付いていたら止める", async () => {
		vi.mocked(prisma.user.findUnique)
			.mockResolvedValueOnce(null as never)
			.mockResolvedValueOnce({
				id: "user-9",
				email: "other@example.com",
			} as never);
		vi.mocked(findClerkUsersByEmail).mockResolvedValue({
			kind: "SUCCESS",
			data: [clerkAccount()],
		});

		await expect(bootstrapNurse(input)).rejects.toThrow("別のスタッフ");
		expect(prisma.user.create).not.toHaveBeenCalled();
	});

	it("Clerk の email が未確認なら止める", async () => {
		vi.mocked(findClerkUsersByEmail).mockResolvedValue({
			kind: "SUCCESS",
			data: [clerkAccount({ isPrimaryEmailVerified: false })],
		});
		await expect(bootstrapNurse(input)).rejects.toThrow("一致しません");
	});

	it("Clerk アカウントが停止中なら止める", async () => {
		vi.mocked(findClerkUsersByEmail).mockResolvedValue({
			kind: "SUCCESS",
			data: [clerkAccount({ isUsable: false })],
		});
		await expect(bootstrapNurse(input)).rejects.toThrow("停止");
	});

	it("Clerk を確認できなければ止める（何も作らない）", async () => {
		vi.mocked(findClerkUsersByEmail).mockResolvedValue({
			kind: "UNKNOWN",
			reason: "TIMEOUT",
		});
		await expect(bootstrapNurse(input)).rejects.toThrow("確認できません");
		expect(createClerkUserWithPassword).not.toHaveBeenCalled();
		expect(prisma.user.create).not.toHaveBeenCalled();
	});
});
