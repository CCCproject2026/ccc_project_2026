import { InvitationsPage } from "@/features/staff-management/pages/InvitationsPage";
import { requireRolePage } from "@/shared/lib/auth";

export default async function StaffInvitationsPage() {
	// スタッフの招待は NURSE だけ
	await requireRolePage("NURSE");

	return <InvitationsPage />;
}
