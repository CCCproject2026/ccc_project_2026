import { Role, StaffMember } from "@/types/staff";

interface Invitation {
  id: string;
  email: string;
  invitedAt: string;
}

const staff: StaffMember[] = [
  { clerkId: "clerk_1", email: "admin@example.com", role: "admin" },
];
const invitations: Invitation[] = [];

export const staffDb = {
  getStaff(): StaffMember[] {
    return [...staff];
  },
  getInvitations() {
    return [...invitations];
  },
  addInvitation(email: string) {
    const id = `invite_${Math.random().toString(36).slice(2, 10)}`;
    const invite = { id, email, invitedAt: new Date().toISOString() };
    invitations.push(invite);
    return invite;
  },
  revokeInvitation(id: string) {
    const index = invitations.findIndex((item) => item.id === id);
    if (index === -1) throw new Error("Invitation not found");
    invitations.splice(index, 1);
  },
  addOrUpdateStaff(clerkId: string, email: string, role: Role) {
    const existing = staff.find((member) => member.clerkId === clerkId);
    if (existing) {
      existing.role = role;
      return existing;
    }
    const newStaff = { clerkId, email, role };
    staff.push(newStaff);
    return newStaff;
  },
};
