import { StaffManagementPage } from "@/features/staff-management/pages/StaffManagementPage";
import { requireRolePage } from "@/shared/lib/auth";

export default async function StaffPage() {
	// スタッフ管理は NURSE だけ
	await requireRolePage("NURSE");

	return <StaffManagementPage />;
}
