import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { requireStaffPage } from "@/shared/lib/auth";
import { dashboardPageNumber } from "@/features/dashboard/lib/resident-profile";

export default async function DashboardRoute({ searchParams }: {
	searchParams: Promise<{ page?: string | string[] }>;
}) {
	await requireStaffPage();

	const { page } = await searchParams;
	return (
		<>
			{/* 統計カードや入居者一覧カードが入ったメインコンテンツ */}
			<DashboardPage page={dashboardPageNumber(page)} />
		</>
	);
}
