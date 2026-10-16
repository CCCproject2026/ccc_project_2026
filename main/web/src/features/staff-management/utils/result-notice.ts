import {
	MANUAL_CHECK_MESSAGES,
	SYNC_RESULT_MESSAGES,
} from "@/features/staff-management/constants/staff.constant";
import type { StaffOperationResult } from "@/features/staff-management/types/staff.types";
import type { Notice } from "@/shared/ui/NoticeBanner";

// 操作が成功したときの API の応答から、画面に出すお知らせを作る
// defaultMessage: 照合をしない操作（ロール変更など）のときに出す文
export function noticeFromResult(
	data: StaffOperationResult,
	defaultMessage: string,
): Notice {
	// 手動確認が必要 → 理由を出す（黄色）
	if (data.result === "MANUAL_CHECK_REQUIRED" && data.reason !== undefined) {
		return { type: "info", message: MANUAL_CHECK_MESSAGES[data.reason] };
	}
	// 照合の結果があれば、その文を出す
	if (data.result !== undefined) {
		return { type: "success", message: SYNC_RESULT_MESSAGES[data.result] };
	}
	return { type: "success", message: defaultMessage };
}
