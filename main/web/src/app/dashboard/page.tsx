// 相対パスからエイリアスに変更
import { mockAlarmData } from "@/features/dashboard/constants/mockDashboardData";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { Sidebar } from "@/shared/layout/sidebar/Sidebar";
import { TopBar } from "@/shared/layout/TopBar";

export default function DashboardRoute() {
	const count = mockAlarmData.count ?? 0; // 仮の通知件数

	return (
		// Enforced w-screen (Full Viewport width) to keep content rendering fluidly
		// pb-16 があることで、スマホの下部バー（メニュー）とバナーやコンテンツが重なりません！
		<div className="flex h-screen w-screen overflow-hidden bg-gray-50/60 pb-16 md:pb-0">
			{/* Now it safely handles width collapses inside its own layout wrappers */}
			<Sidebar />

			{/* The primary dashboard view content workspace context */}
			<div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
				<TopBar
					title="リアルタイム モニタリング"
					breadcrumb="ダッシュボード"
					showNotification={!!count}
					notificationCount={count}
				/>

				{/*  修正：メインスクロールエリア */}
				{/* flex flex-col と gap-4 を追加し、スマホ（p-4）とPC（md:p-6）で余白が綺麗に切り替わります */}
				<main className="flex-1 p-4 md:p-6 overflow-y-auto min-w-0 bg-transparent flex flex-col gap-4 md:gap-5">
					{/* メインの統計カードや住民リストのコンポーネント */}
					<DashboardPage />
				</main>
			</div>
		</div>
	);
}
