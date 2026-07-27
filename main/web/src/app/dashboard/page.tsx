// src/app/dashboard/page.tsx
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
export default function DashboardRoute() {
	return (
		<>
			{/* 統計カードや入居者一覧カードが入ったメインコンテンツ */}
			<DashboardPage />
		</>
	);
}