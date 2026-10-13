import { StaffManagementPage } from "@/features/staff-management/pages/StaffManagementPage";
import { requireRolePage } from "@/shared/lib/auth";

export default async function StaffPage() {
	// スタッフ管理は NURSE だけ
	const loginUser = await requireRolePage("NURSE");

	return <StaffManagementPage currentUserId={loginUser.id} />;
}
