import { Role } from "@/types/staff";
import { staffDb } from "@/lib/staff-db";

export async function inviteUser(email: string) {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is required to call Clerk");
  }

  // TODO: Replace with Clerk REST API call to create an invitation.
  const invite = staffDb.addInvitation(email);
  return invite;
}

export async function updateUserRole(clerkId: string, role: Role) {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is required to call Clerk");
  }

  // TODO: Replace with Clerk REST API call to patch user metadata.
  return staffDb.addOrUpdateStaff(clerkId, `${clerkId}@example.com`, role);
}

export async function revokeInvitation(inviteId: string) {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is required to call Clerk");
  }

  staffDb.revokeInvitation(inviteId);
  return { ok: true };
}
