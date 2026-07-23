// src/app/dashboard/page.tsx
import { AlarmBanner } from "@/features/dashboard/components/AlarmBanner";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { mockAlarmData } from "@/features/dashboard/constants/mockDashboardData";
export default function DashboardRoute() {
	
	return (
		<>
			
			
			{/* 統計カードや入居者一覧カードが入ったメインコンテンツ */}
			<DashboardPage />
		</>
	);
}