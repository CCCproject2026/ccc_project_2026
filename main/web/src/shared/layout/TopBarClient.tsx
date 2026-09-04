"use client";

import { usePathname } from "next/navigation";
import { TopBar } from "./TopBar";

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

export function TopBarClient({ count }: { count: number }) {
	const pathname = usePathname();
	const meta = ROUTE_META[pathname] || { title: "転倒予防支援システム" };

	return (
		<TopBar
			title={meta.title}
			breadcrumb={meta.breadcrumb}
			showNotification={!!count}
			notificationCount={count}
		/>
	);
}
