export type Role = "admin" | "manager" | "staff";

export interface StaffMember {
  clerkId: string;
  email: string;
  role: Role;
}
