import { Role, StaffMember } from "../types";
import { staffDb } from "../data/staff-db";
import { inviteUser, revokeInvitation as revokeInvitationService, updateUserRole } from "../services/clerk";

export function listStaff(): StaffMember[] {
  return staffDb.getStaff();
}

export function listInvitations() {
  return staffDb.getInvitations();
}

export async function inviteStaff(email: string) {
  return inviteUser(email);
}

export async function updateStaffRole(id: string, role: Role) {
  return updateUserRole(id, role);
}

export async function revokeInvitation(id: string) {
  return revokeInvitationService(id);
}
