import type {
	CreateElderInput,
	ElderStatus,
	Gender,
	UpdateElderInput,
} from "@/shared/validation/schemas";

export type { CreateElderInput, ElderStatus, Gender, UpdateElderInput };

export interface Elder {
	id: string;
	firstName: string;
	lastName: string;
	roomNumber: string;
	status: ElderStatus;
	dateOfBirth: string;
	gender: Gender;
	createdAt: string;
	updatedAt: string;
}

export interface ElderRow extends Elder {
	currentDeviceId: string | null;
}

// GET /api/elders/[id] の応答。
// 退所の確定時に「確認ダイアログで見せた割当」と「サーバーで終了する割当」が同じかを
// 照合するため、有効な割当の ID も返す（割当がなければ null）
export interface ElderDetail extends ElderRow {
	currentAssignmentId: string | null;
}

export interface ElderListParams {
	status?: ElderStatus;
	q?: string;
	page?: number;
	limit?: number;
}

export interface ElderSummary {
	total: number;
	active: number;
	inactive: number;
}

export interface ElderListResponse {
	data: ElderRow[];
	total: number;
	page: number;
	limit: number;
	summary: ElderSummary;
}
