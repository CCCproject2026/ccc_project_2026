import { ElderManagementPage } from "@/features/elder-management/pages/ElderManagementPage";
import { requireStaffPage } from "@/shared/lib/auth";

// 一覧の閲覧は ACTIVE なスタッフ全員（介護士含む）。
// 登録・編集・退所は API 側で requireRole("NURSE") にしているため、
// ロールを画面に渡して、使えない操作を表示しない。
export default async function EldersPage() {
	const user = await requireStaffPage();
	return <ElderManagementPage role={user.role} />;
}
