import type { User } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ログイン確認と DB 更新は偽物にする（ここでは HTTP の入口だけをテストする）
vi.mock("@/shared/lib/auth", () => ({ requireStaff: vi.fn() }));
vi.mock("@/features/profile/server/profile-service", () => ({
	updateMyProfile: vi.fn(),
}));

import { updateMyProfile } from "@/features/profile/server/profile-service";
import type { ProfileInfo } from "@/features/profile/types/profile.type";
import { ApiError } from "@/shared/lib/api-error";
import { requireStaff } from "@/shared/lib/auth";
import { PATCH } from "./route";

// 正しい入力の例
const validBody = {
	lastName: "山田",
	firstName: "太郎",
	dateOfBirth: "1985-12-31",
	nationality: "ベトナム",
	gender: "MALE",
};

// 更新後に返る値の例
const updatedProfile: ProfileInfo = {
	lastName: "山田",
	firstName: "太郎",
	email: "a@example.com",
	role: "CAREGIVER",
	status: "ACTIVE",
	startDate: "2026年10月1日",
	endDate: null,
	dateOfBirth: "1985年12月31日",
	dateOfBirthInput: "1985-12-31",
	nationality: "ベトナム",
	gender: "MALE",
};

function patchRequest(body: unknown): Request {
	return new Request("http://localhost/api/profile", {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	// 何も指定しなければ、ACTIVE な本人がログインしている
	vi.mocked(requireStaff).mockResolvedValue({ id: "user-1" } as User);
	vi.mocked(updateMyProfile).mockResolvedValue(updatedProfile);
});

describe("PATCH /api/profile", () => {
	it("正しい入力なら 200。ログイン中の本人の ID で更新する", async () => {
		const response = await PATCH(patchRequest(validBody));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ profile: updatedProfile });
		expect(updateMyProfile).toHaveBeenCalledWith("user-1", validBody);
	});

	it("入力が不正なら 400。更新しない", async () => {
		const response = await PATCH(patchRequest({ ...validBody, lastName: "" }));

		expect(response.status).toBe(400);
		expect(updateMyProfile).not.toHaveBeenCalled();
	});

	it("role など変更できない項目が含まれていたら 400。更新しない", async () => {
		const response = await PATCH(patchRequest({ ...validBody, role: "NURSE" }));

		expect(response.status).toBe(400);
		expect(updateMyProfile).not.toHaveBeenCalled();
	});

	it("本文が JSON でなければ 400", async () => {
		const request = new Request("http://localhost/api/profile", {
			method: "PATCH",
			body: "not json",
		});
		const response = await PATCH(request);

		expect(response.status).toBe(400);
		expect(updateMyProfile).not.toHaveBeenCalled();
	});

	it("未ログインなら 401", async () => {
		vi.mocked(requireStaff).mockRejectedValue(
			new ApiError(401, "UNAUTHENTICATED", "ログインしてください"),
		);
		const response = await PATCH(patchRequest(validBody));

		expect(response.status).toBe(401);
		expect(updateMyProfile).not.toHaveBeenCalled();
	});

	it("ACTIVE でなければ 403", async () => {
		vi.mocked(requireStaff).mockRejectedValue(
			new ApiError(403, "FORBIDDEN", "このアカウントは利用できません"),
		);
		const response = await PATCH(patchRequest(validBody));

		expect(response.status).toBe(403);
		expect(updateMyProfile).not.toHaveBeenCalled();
	});

	it("更新中に無効化された（0件）なら 403", async () => {
		vi.mocked(updateMyProfile).mockRejectedValue(
			new ApiError(403, "FORBIDDEN", "このアカウントは利用できません"),
		);
		const response = await PATCH(patchRequest(validBody));

		expect(response.status).toBe(403);
	});
});
