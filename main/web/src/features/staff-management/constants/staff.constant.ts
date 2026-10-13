import type {
	StaffManualCheckReason,
	StaffRole,
	StaffStatus,
	StaffSyncResult,
} from "@/features/staff-management/types/staff.types";

// 画面に表示するロール名
export const ROLE_LABELS: Record<StaffRole, string> = {
	NURSE: "看護師（管理者）",
	CAREGIVER: "介護士",
};

// 画面に表示する状態名
export const STATUS_LABELS: Record<StaffStatus, string> = {
	PENDING: "登録待ち",
	ACTIVE: "利用中",
	INACTIVE: "停止中",
};

// 照合・招待の結果ごとに表示するメッセージ
export const SYNC_RESULT_MESSAGES: Record<StaffSyncResult, string> = {
	LINKED:
		"Clerk アカウントと紐付けました。このスタッフはシステムを利用できます",
	CONFIRM_REQUIRED:
		"既存の Clerk アカウントが見つかりました。紐付けるか確認してください",
	ALREADY_INVITED: "招待メールは送信済みです（再送はしていません）",
	SENT: "招待メールを送信しました",
	RETRY_REQUIRED:
		"Clerk を確認できませんでした。しばらくしてから「照合」してください",
	SEND_FAILED: "招待メールを送信できませんでした",
	SEND_UNKNOWN:
		"招待メールを送信できたか確認できませんでした。「照合」してください",
	MANUAL_CHECK_REQUIRED: "自動で処理できない状態です。確認が必要です",
};

// 手動確認が必要な理由ごとに表示するメッセージ
export const MANUAL_CHECK_MESSAGES: Record<StaffManualCheckReason, string> = {
	MULTIPLE_ACCOUNTS:
		"同じメールアドレスの Clerk アカウントが複数あります。Clerk の管理画面で確認してください",
	LINKED_TO_OTHER_STAFF:
		"この Clerk アカウントは、既に別のスタッフに紐付いています",
	EMAIL_NOT_VERIFIED:
		"Clerk アカウントのメールアドレスが確認されていない、または一致しません",
	ACCOUNT_UNUSABLE: "Clerk アカウントが停止・ロックされています",
	FOREIGN_INVITATION:
		"このメールアドレスに、本システム以外で作成された招待が残っています。Clerk の管理画面で確認してください",
};
