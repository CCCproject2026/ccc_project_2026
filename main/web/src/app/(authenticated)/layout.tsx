"use client";

import { usePathname } from "next/navigation";
import { mockAlarmData } from "@/features/dashboard/constants/mockDashboardData";
import { Sidebar } from "@/shared/layout/sidebar/Sidebar";
import { TopBar } from "@/shared/layout/TopBar";

interface AuthenticatedLayoutProps {
	children: React.ReactNode;
}

// Title and breadcrumb mapping based on routes
const ROUTE_META: Record<string, { title: string; breadcrumb?: string }> = {
	"/dashboard": {
		title: "リアルタイム モニタリング",
		breadcrumb: "ダッシュボード",
	},
	"/staff": {
		title: "スタッフ情報管理",
		breadcrumb: "スタッフ管理",
	},
	"/devices": {
		title: "デバイス接続ステータス",
		breadcrumb: "デバイス管理",
	},
	"/response": {
		title: "対応履歴一覧",
		breadcrumb: "対応履歴",
	},
};

export default function AuthenticatedLayout({
	children,
}: AuthenticatedLayoutProps) {
	const pathname = usePathname();
	const count = mockAlarmData.count ?? 0;

	// Fallback to active route or generic system title
	const currentMeta = ROUTE_META[pathname] || {
		title: "転倒予防支援システム",
	};

	return (
		<div className="flex h-screen w-screen overflow-hidden bg-gray-50/60 pb-16 md:pb-0">
			{/* Universal Sidebar */}
			<Sidebar />

			<div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
				{/* Universal TopBar with Dynamic Title */}
				<TopBar
					title={currentMeta.title}
					breadcrumb={currentMeta.breadcrumb}
					showNotification={!!count}
					notificationCount={count}
				/>

				{/* Scrollable Main Content */}
				<main className="flex-1 p-4 md:p-6 overflow-y-auto min-w-0 bg-transparent flex flex-col gap-4 md:gap-5">
					{children}
				</main>
			</div>
		</div>
	);
}
