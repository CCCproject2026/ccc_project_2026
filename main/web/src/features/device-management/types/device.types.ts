// デバイス管理の API の応答の型（画面とサーバーで共有する）
// 日時は JSON では ISO 8601 の文字列になるため string にする

export type DeviceStatus = "ACTIVE" | "INACTIVE";

// 割当先の高齢者（選択肢・一覧・詳細で表示する項目だけ）
export type ElderSummary = {
	id: string;
	lastName: string;
	firstName: string;
	roomNumber: string;
};

export type CurrentAssignment = {
	id: string;
	assignedAt: string;
	elder: ElderSummary;
};

export type DeviceListItem = {
	id: string;
	deviceCode: string;
	deviceName: string;
	status: DeviceStatus;
	createdAt: string;
	updatedAt: string; // 編集の楽観的ロックに使う
	currentAssignment: CurrentAssignment | null;
};

export type AssignmentHistoryItem = {
	id: string;
	assignedAt: string;
	unassignedAt: string | null;
	elder: ElderSummary;
};

export type DeviceDetail = DeviceListItem & {
	history: AssignmentHistoryItem[]; // 新しい順で最大50件
};

export type DeviceSummary = {
	total: number; // 総デバイス数
	assigned: number; // 割当済み
	unassigned: number; // ACTIVE で未割当
	inactive: number; // 停止中（INACTIVE）
};

export type DeviceListResponse = {
	data: DeviceListItem[];
	total: number; // 条件に合う件数
	page: number;
	limit: number;
	summary: DeviceSummary;
};

export type AssignableEldersResponse = {
	data: ElderSummary[];
	total: number;
	page: number;
	limit: number;
};

// 409 INVALID_STATE の理由（詳細設計 03 の5章）
export type DeviceErrorReason =
	| "DEVICE_NOT_ACTIVE"
	| "ELDER_NOT_ACTIVE"
	| "DEVICE_ALREADY_ASSIGNED"
	| "ELDER_ALREADY_ASSIGNED"
	| "NEW_DEVICE_NOT_ACTIVE"
	| "NEW_DEVICE_ALREADY_ASSIGNED"
	| "SAME_TARGET"
	| "ASSIGNMENT_CHANGED"
	| "DEVICE_CHANGED"
	| "DEVICE_HAS_ASSIGNMENT"
	| "DEVICE_HAS_HISTORY";

// 404 で、どの行が見つからなかったか
export type NotFoundTarget = "device" | "newDevice" | "elder" | "assignment";
