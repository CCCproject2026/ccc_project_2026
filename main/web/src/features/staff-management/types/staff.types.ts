export type RoleType = "看護師（管理者）" | "介護士";

export interface StaffMember {
	id: string;
	name: string;
	role: RoleType;
	mail: string;
	isSelf?: boolean;
}

// ===== ここから下は新スタッフ登録（API）で使う型 =====

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
	role: StaffRole;
	status: StaffStatus;
	availableActions: StaffAction[];
};
