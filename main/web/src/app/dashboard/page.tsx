// src/app/dashboard/page.tsx
import { AlarmBanner } from "@/features/dashboard/components/AlarmBanner";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { mockAlarmData } from "@/features/dashboard/constants/mockDashboardData";
export default function DashboardRoute() {
	const count = mockAlarmData.count ?? 0;
	 // 仮の通知件数
	return (
		<>
			{/* アラームがあれば、最上部に赤いバナーを表示 */}
			{count > 0 && <AlarmBanner />}
			
			{/* 統計カードや入居者一覧カードが入ったメインコンテンツ */}
			<DashboardPage />
		</>
	);
}