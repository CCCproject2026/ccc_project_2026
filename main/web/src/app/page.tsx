// src/app/page.tsx

import { AlarmBanner } from "@/features/dashboard/components/AlarmBanner";
import { mockAlarmData } from "@/features/dashboard/constants/mockDashboardData";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { Sidebar } from "@/shared/layout/sidebar/Sidebar";
import { TopBar } from "@/shared/layout/TopBar";

export default function HomeRoute() {
	const count = mockAlarmData.count ?? 0; // 通知件数

	return (
		// 画面全体の横幅と高さを固定し、はみ出さないように設定
		<div className="flex h-screen w-screen overflow-hidden bg-gray-50/60 pb-16 md:pb-0">
			{/* 左側の紫色のサイドバー */}
			<Sidebar />

			{/* 右側のメインコンテンツエリア */}
			<div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
				{/* 上部の白ヘッダー（通知バッジ付き） */}
				<TopBar
					title="ダッシュボード"
					breadcrumb="ダッシュボード"
					showNotification={!!count}
					notificationCount={count}
				/>

				{/* メインのスクロール領域 */}
				<main className="flex-1 p-4 md:p-6 overflow-y-auto min-w-0 bg-transparent flex flex-col gap-4 md:gap-5">
					{/* アラームがあれば、最上部に赤い「未対応のアラームがあります」バナーを表示 */}
					{count > 0 && <AlarmBanner />}

					{/* 統計カードや入居者一覧カードが入ったメインコンテンツ */}
					<DashboardPage />
				</main>
			</div>
		</div>
	);
}
