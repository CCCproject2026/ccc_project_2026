// スタッフ管理（新スタッフ登録）で使う型

// DB の UserRole と同じ値
export type StaffRole = "NURSE" | "CAREGIVER";

// DB の UserStatus と同じ値
export type StaffStatus = "PENDING" | "ACTIVE" | "INACTIVE";

// 画面に表示する操作ボタンの種類
export type StaffAction =
	| "SYNC" // 照合
	| "CANCEL" // 招待の取消
	| "CHANGE_ROLE" // ロール変更
	| "DEACTIVATE" // 無効化
	| "REINVITE" // 再招待
	| "RETRY_CANCEL" // 取消処理の再試行
	| "ACTIVATE"; // 有効化

// エラー（502）のときに、画面が次に案内する操作
export type StaffRetryAction =
	| "SYNC" // 「照合」で確認し直す
	| "RETRY_CANCEL" // 「取消処理を再試行」する
	| "REINVITE"; // 「再招待」する

// API が画面に返すスタッフの情報
// 生年月日・国籍・性別・clerkUserId などの個人情報は入れない
export type StaffItem = {
	id: string;
	email: string;
	displayName: string; // 「姓 名」
	lastName: string; // 姓（再招待フォームで使う）
	firstName: string; // 名（再招待フォームで使う）
	role: StaffRole;
	status: StaffStatus;
	availableActions: StaffAction[];
};

// 照合の結果（API の result）
export type StaffSyncResult =
	| "LINKED" // 紐付けて ACTIVE にした
	| "CONFIRM_REQUIRED" // 既存アカウントの紐付けを NURSE が確認する
	| "ALREADY_INVITED" // 招待は送信済み（再送しない）
	| "SENT" // 招待を送った
	| "RETRY_REQUIRED" // Clerk を確認できない
	| "SEND_FAILED" // 送信が確実に失敗した
	| "SEND_UNKNOWN" // 送信できたか不明
	| "MANUAL_CHECK_REQUIRED"; // 手動で確認が必要

// 手動確認が必要な理由
export type StaffManualCheckReason =
	| "MULTIPLE_ACCOUNTS"
	| "LINKED_TO_OTHER_STAFF"
	| "EMAIL_NOT_VERIFIED"
	| "ACCOUNT_UNUSABLE"
	| "FOREIGN_INVITATION";

// 操作が成功したときの API の応答
export type StaffOperationResult = {
	staff: StaffItem;
	result?: StaffSyncResult;
	reason?: StaffManualCheckReason;
	confirmationToken?: string;
};

// エラーのときの API の応答
export type StaffApiError = {
	code: string;
	message: string;
	staff?: StaffItem; // 今の DB の状態（エラーでも状態が変わっていることがある）
	retryAction?: StaffRetryAction;
};
