import type {
	StaffGender,
	StaffRole,
	StaffStatus,
} from "@/features/staff-management/types/staff.types";

export type ProfileInfo = {
	lastName: string;
	firstName: string;
	email: string;
	role: StaffRole;
	status: StaffStatus;
	startDate: string; // 表示用（例: 2026年10月1日）
	endDate: string | null; // 退職日（なければ null）
	dateOfBirth: string; // 表示用（例: 1990年4月1日）
	dateOfBirthInput: string; // 編集フォームの初期値用（例: 1990-04-01）
	nationality: string;
	gender: StaffGender; // DB の値（MALE / FEMALE）。表示は getGenderLabel() で日本語にする
};
