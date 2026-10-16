import type { RoleType } from "@/shared/validation/schemas";

export type { RoleType };

export interface StaffMember {
	id: string;
	name: string;
	role: RoleType;
	mail: string;
	isSelf?: boolean;
}
