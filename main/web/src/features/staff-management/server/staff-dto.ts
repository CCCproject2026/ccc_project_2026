import "server-only";
import type {
	StaffAction,
	StaffItem,
	StaffRole,
	StaffStatus,
} from "@/features/staff-management/types/staff.types";

// DTO を作るのに必要な User の項目だけ
// （生年月日などはここに入れないので、間違って画面に返すことがない）
type StaffUser = {
	id: string;
	email: string;
	lastName: string;
	firstName: string;
	role: StaffRole;
	status: StaffStatus;
	clerkUserId: string | null;
};

// そのスタッフに対して、画面で使える操作の一覧を返す
// activeNurseCount: ACTIVE な NURSE の人数（呼び出す側で DB から数えて渡す）
export function getAvailableActions(
	user: StaffUser,
	activeNurseCount: number,
): StaffAction[] {
	// 登録待ち
	if (user.status === "PENDING") {
		return ["SYNC", "CANCEL"];
	}

	// 利用中
	if (user.status === "ACTIVE") {
		// 最後の NURSE は、降格も無効化もできない（画面ではボタンを無効表示にする）
		const isLastNurse = user.role === "NURSE" && activeNurseCount <= 1;
		if (isLastNurse) {
			return [];
		}
		return ["CHANGE_ROLE", "DEACTIVATE"];
	}

	// ここからは INACTIVE
	// Clerk と紐付いていない = 招待の取消・失敗
	if (user.clerkUserId === null) {
		return ["REINVITE", "RETRY_CANCEL"];
	}
	// Clerk と紐付いている = 利用停止中
	return ["ACTIVATE"];
}

// DB の User を、画面に返す StaffItem に変換する
export function toStaffItem(
	user: StaffUser,
	activeNurseCount: number,
): StaffItem {
	return {
		id: user.id,
		email: user.email,
		displayName: `${user.lastName} ${user.firstName}`,
		role: user.role,
		status: user.status,
		availableActions: getAvailableActions(user, activeNurseCount),
	};
}
