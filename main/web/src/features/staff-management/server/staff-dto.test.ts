import { describe, expect, it } from "vitest";
import { toStaffItem } from "./staff-dto";

// テスト用のスタッフ。各テストでは、ここから必要な項目だけ変える
const caregiver = {
	id: "user-1",
	email: "tanaka@example.com",
	lastName: "田中",
	firstName: "花子",
	role: "CAREGIVER" as const,
	status: "ACTIVE" as const,
	clerkUserId: "clerk_1",
};

describe("toStaffItem", () => {
	it("表示名は「姓 名」になる", () => {
		const item = toStaffItem(caregiver, 2);
		expect(item.displayName).toBe("田中 花子");
	});

	it("決められた項目だけを返す（個人情報を返さない）", () => {
		const item = toStaffItem(caregiver, 2);
		const keys = Object.keys(item).sort();
		expect(keys).toEqual([
			"availableActions",
			"displayName",
			"email",
			"firstName",
			"id",
			"lastName",
			"role",
			"status",
		]);
	});

	it("PENDING は「照合」「取消」", () => {
		const pending = {
			...caregiver,
			status: "PENDING" as const,
			clerkUserId: null,
		};
		expect(toStaffItem(pending, 1).availableActions).toEqual([
			"SYNC",
			"CANCEL",
		]);
	});

	it("ACTIVE は「ロール変更」「無効化」", () => {
		expect(toStaffItem(caregiver, 1).availableActions).toEqual([
			"CHANGE_ROLE",
			"DEACTIVATE",
		]);
	});

	it("最後の NURSE は操作できない", () => {
		const lastNurse = { ...caregiver, role: "NURSE" as const };
		expect(toStaffItem(lastNurse, 1).availableActions).toEqual([]);
	});

	it("NURSE が2人以上いれば、NURSE も操作できる", () => {
		const nurse = { ...caregiver, role: "NURSE" as const };
		expect(toStaffItem(nurse, 2).availableActions).toEqual([
			"CHANGE_ROLE",
			"DEACTIVATE",
		]);
	});

	it("INACTIVE で Clerk 未紐付けは「再招待」「取消の再試行」", () => {
		const cancelled = {
			...caregiver,
			status: "INACTIVE" as const,
			clerkUserId: null,
		};
		expect(toStaffItem(cancelled, 1).availableActions).toEqual([
			"REINVITE",
			"RETRY_CANCEL",
		]);
	});

	it("INACTIVE で Clerk 紐付け済みは「有効化」", () => {
		const stopped = { ...caregiver, status: "INACTIVE" as const };
		expect(toStaffItem(stopped, 1).availableActions).toEqual(["ACTIVATE"]);
	});
});
