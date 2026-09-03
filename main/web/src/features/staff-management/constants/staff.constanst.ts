import { StaffMember } from "@/features/staff-management/types/staff.types";

export const INITIAL_STAFF_LIST: StaffMember[] = [
	{
		id: "staff-001",
		name: "田中 花子",
		role: "看護師（管理者）",
		isSelf: true,
	},
	{ id: "staff-002", name: "鈴木 一郎", role: "介護士", isSelf: false },
	{ id: "staff-003", name: "佐藤 美紀", role: "介護士", isSelf: false },
	{ id: "staff-004", name: "山本 健太", role: "介護士", isSelf: false },
];
