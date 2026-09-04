export type RoleType = "看護師（管理者）" | "介護士";

export interface StaffMember {
	id: string;
	name: string;
	role: RoleType;
	isSelf?: boolean;
}
