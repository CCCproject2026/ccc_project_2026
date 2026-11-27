import { dashboardPageNumber } from "@/features/dashboard/lib/resident-profile";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";

export default async function DashboardRoute({
	searchParams,
}: {
	searchParams: Promise<{ page?: string | string[] }>;
}) {
	const { page } = await searchParams;
	return (
		<>
			{/* 統計カードや入居者一覧カードが入ったメインコンテンツ */}
			<DashboardPage page={dashboardPageNumber(page)} />
		</>
	);
}
