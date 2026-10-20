import type { User } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// DB は偽物
vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		user: { updateMany: vi.fn(), findUnique: vi.fn() },
	},
}));

import { ApiError } from "@/shared/lib/api-error";
import { prisma } from "@/shared/lib/prisma";
import { toProfileInfo, updateMyProfile } from "./profile-service";

function makeUser(overrides: Partial<User> = {}): User {
	return {
		id: "user-1",
		clerkUserId: "clerk-1",
		firstName: "花子",
		lastName: "田中",
		email: "a@example.com",
		role: "CAREGIVER",
		startDate: new Date("2026-10-01T00:00:00.000Z"),
		endDate: null,
		dateOfBirth: new Date("1990-04-01T00:00:00.000Z"),
		nationality: "日本",
		gender: "FEMALE",
		status: "ACTIVE",
		createdAt: new Date("2026-10-13T00:00:00.000Z"),
		updatedAt: new Date("2026-10-13T00:00:00.000Z"),
		...overrides,
	};
}

// チェック済みの入力の例
const input = {
	lastName: "山田",
	firstName: "太郎",
	dateOfBirth: "1985-12-31",
	nationality: "ベトナム",
	gender: "MALE" as const,
};

describe("toProfileInfo", () => {
	it("表示用の日付と、フォーム用の YYYY-MM-DD を作る", () => {
		const profile = toProfileInfo(makeUser());
		expect(profile.dateOfBirth).toBe("1990年4月1日");
		expect(profile.dateOfBirthInput).toBe("1990-04-01");
		expect(profile.startDate).toBe("2026年10月1日");
		expect(profile.endDate).toBeNull();
	});

	it("id・clerkUserId などの内部情報は含めない", () => {
		const profile = toProfileInfo(makeUser());
		expect(profile).not.toHaveProperty("id");
		expect(profile).not.toHaveProperty("clerkUserId");
		expect(profile).not.toHaveProperty("createdAt");
	});

	it("退職日があれば表示用に変換する", () => {
		const profile = toProfileInfo(
			makeUser({ endDate: new Date("2027-03-31T00:00:00.000Z") }),
		);
		expect(profile.endDate).toBe("2027年3月31日");
	});
});

describe("updateMyProfile", () => {
	const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

	beforeEach(() => {
		vi.mocked(prisma.user.updateMany).mockReset();
		vi.mocked(prisma.user.findUnique).mockReset();
		infoSpy.mockClear();
	});

	afterEach(() => {
		infoSpy.mockClear();
	});

	it("本人の行を ACTIVE の条件付きで更新し、更新後の値を返す", async () => {
		vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 });
		vi.mocked(prisma.user.findUnique).mockResolvedValue(
			makeUser({
				lastName: "山田",
				firstName: "太郎",
				dateOfBirth: new Date("1985-12-31T00:00:00.000Z"),
				nationality: "ベトナム",
				gender: "MALE",
			}),
		);

		const profile = await updateMyProfile("user-1", input);

		expect(prisma.user.updateMany).toHaveBeenCalledWith({
			where: { id: "user-1", status: "ACTIVE" },
			data: {
				lastName: "山田",
				firstName: "太郎",
				dateOfBirth: new Date("1985-12-31T00:00:00.000Z"),
				nationality: "ベトナム",
				gender: "MALE",
			},
		});
		expect(profile.lastName).toBe("山田");
		expect(profile.dateOfBirthInput).toBe("1985-12-31");
		expect(profile.gender).toBe("MALE");
	});

	it("role・status・email・startDate は更新しない", async () => {
		vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 });
		vi.mocked(prisma.user.findUnique).mockResolvedValue(makeUser());

		await updateMyProfile("user-1", input);

		const data = vi.mocked(prisma.user.updateMany).mock.calls[0][0]?.data;
		expect(data).not.toHaveProperty("role");
		expect(data).not.toHaveProperty("status");
		expect(data).not.toHaveProperty("email");
		expect(data).not.toHaveProperty("startDate");
		expect(data).not.toHaveProperty("endDate");
	});

	it("更新が0件（無効化された直後など）なら 403", async () => {
		vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 });

		const error = await updateMyProfile("user-1", input).catch((e) => e);

		expect(error).toBeInstanceOf(ApiError);
		expect(error.status).toBe(403);
		expect(prisma.user.findUnique).not.toHaveBeenCalled();
		expect(infoSpy).not.toHaveBeenCalled();
	});

	it("ログには ID だけを出し、個人情報は出さない", async () => {
		vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 });
		vi.mocked(prisma.user.findUnique).mockResolvedValue(makeUser());

		await updateMyProfile("user-1", input);

		expect(infoSpy).toHaveBeenCalledTimes(1);
		const logged = JSON.parse(infoSpy.mock.calls[0][0] as string);
		expect(logged).toMatchObject({
			type: "profile_update",
			actorId: "user-1",
			targetId: "user-1",
		});
		const text = infoSpy.mock.calls[0][0] as string;
		expect(text).not.toContain("山田");
		expect(text).not.toContain("1985-12-31");
		expect(text).not.toContain("ベトナム");
		expect(text).not.toContain("a@example.com");
	});
});
