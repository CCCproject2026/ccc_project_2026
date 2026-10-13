import "server-only";

export type StaffItem = {
	id: string;
	email: string;
	displayName: string; // 姓 名
	role: "NURSE" | "CAREGIVER";
	status: "PENDING" | "ACTIVE" | "INACTIVE";
	availableActions: string[];
};
