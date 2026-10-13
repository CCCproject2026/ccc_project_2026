import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { requireStaffPage } from "@/shared/lib/auth";

export default async function DashboardRoute() {
	await requireStaffPage();

	return (
		<>
			{/* 統計カードや入居者一覧カードが入ったメインコンテンツ */}
			<DashboardPage />
		</>
	);
}
