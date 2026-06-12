// import { apiClient } from "@/api/client";
// import { Role } from "@/types/staff";

// export async function inviteUser(email: string) {
//   return apiClient("/clerk/invite", {
//     method: "POST",
//     body: JSON.stringify({ email }),
//   });
// }

// export async function updateUserRole(clerkId: string, role: Role) {
//   return apiClient(`/clerk/${encodeURIComponent(clerkId)}/role`, {
//     method: "PATCH",
//     body: JSON.stringify({ role }),
//   });
// }

// export async function revokeInvitation(inviteId: string) {
//   return apiClient(`/clerk/invitations/${encodeURIComponent(inviteId)}`, {
//     method: "DELETE",
//   });
// }
