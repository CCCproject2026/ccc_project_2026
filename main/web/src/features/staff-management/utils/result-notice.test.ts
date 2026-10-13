import { describe, expect, it } from "vitest";
import type { StaffItem } from "@/features/staff-management/types/staff.types";
import { noticeFromResult } from "./result-notice";

const staff: StaffItem = {
	id: "user-1",
	email: "a@example.com",
	displayName: "田中 花子",
	role: "CAREGIVER",
	status: "PENDING",
	availableActions: ["SYNC", "CANCEL"],
};

describe("noticeFromResult", () => {
	it("招待を送ったら「送信しました」（緑）", () => {
		expect(noticeFromResult({ staff, result: "SENT" }, "既定")).toEqual({
			type: "success",
			message: "招待メールを送信しました",
		});
	});

	it("手動確認が必要なら、理由を表示する（黄）", () => {
		const notice = noticeFromResult(
			{ staff, result: "MANUAL_CHECK_REQUIRED", reason: "ACCOUNT_UNUSABLE" },
			"既定",
		);
		expect(notice).toEqual({
			type: "info",
			message: "Clerk アカウントが停止・ロックされています",
		});
	});

	it("照合の結果がない操作は、既定の文を出す", () => {
		expect(noticeFromResult({ staff }, "ロールを変更しました")).toEqual({
			type: "success",
			message: "ロールを変更しました",
		});
	});
});
