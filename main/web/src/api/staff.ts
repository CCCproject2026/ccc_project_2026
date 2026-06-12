// import { apiClient } from "@/api/client";
// import { Role, StaffMember } from "@/types/staff";

// export async function listStaff(): Promise<StaffMember[]> {
//   return apiClient("/staff", { method: "GET" });
// }

// export async function updateStaffRole(id: string, role: Role): Promise<StaffMember> {
//   return apiClient(`/staff/${encodeURIComponent(id)}/role`, {
//     method: "PATCH",
//     body: JSON.stringify({ role }),
//   });
// }

// export async function listInvitations(): Promise<Array<{ id: string; email: string }>> {
//   return apiClient("/staff/invitations", { method: "GET" });
// }

// export async function inviteStaff(email: string): Promise<void> {
//   await apiClient("/staff/invitations", {
//     method: "POST",
//     body: JSON.stringify({ email }),
//   });
// }

// export async function revokeInvitation(id: string): Promise<void> {
//   await apiClient(`/staff/invitations/${encodeURIComponent(id)}`, {
//     method: "DELETE",
//   });
// }
