import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { Sidebar } from "@/shared/layout/sidebar/Sidebar";
import { TopBar } from "@/shared/layout/TopBar";
import { mockAlarmData } from "../api/alert/mock";

export default function DashboardRoute() {
	const count = mockAlarmData.count ?? 0; // 仮の通知件数
	//const count=0;
	const today = new Date().toLocaleDateString("ja-JP", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
	return (
		<div className="flex h-screen">
			<Sidebar />
			<div className="flex-1 flex flex-col overflow-hidden">
				<TopBar
					title="リアルタイムモニタリング"
					dateLabel={today}
					breadcrumb={"ダッシュボード"}
					showNotification={!!count}
					notificationCount={count}
				/>
				<main className="flex-1 bg-gray-50 p-6 overflow-auto">
					<DashboardPage />
				</main>
			</div>
		</div>
	);
}
