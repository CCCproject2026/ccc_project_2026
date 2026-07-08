// src/app/dashboard/layout.tsx

import { mockAlarmData } from "@/features/dashboard/constants/mockDashboardData";
import { Sidebar } from "@/shared/layout/sidebar/Sidebar";
import { TopBar } from "@/shared/layout/TopBar";

interface DashboardLayoutProps {
	children: React.ReactNode; // ここに一覧画面や詳細画面が自動で注入されます
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
	const count = mockAlarmData.count ?? 0;

	return (
		<div className="flex h-screen w-screen overflow-hidden bg-gray-50/60 pb-16 md:pb-0">
			{/* 共通サイドバー */}
			<Sidebar />

			<div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
				{/* 共通トップバー */}
				<TopBar
					title="リアルタイム モニタリング"
					breadcrumb="ダッシュボード"
					showNotification={!!count}
					notificationCount={count}
				/>

				{/* メインスクロールエリア：ここが各ページの中身に入れ替わります */}
				<main className="flex-1 p-4 md:p-6 overflow-y-auto min-w-0 bg-transparent flex flex-col gap-4 md:gap-5">
					{children}
				</main>
			</div>
		</div>
	);
}
