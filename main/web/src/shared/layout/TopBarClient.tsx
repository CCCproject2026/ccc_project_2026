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
	"/staff/invitations": {
		title: "スタッフ招待",
		breadcrumb: "スタッフ管理",
	},
	"/devices": {
		title: "デバイス一覧",
		breadcrumb: "デバイス管理",
	},
	"/profile": {
		title: "マイページ",
		breadcrumb: "アカウント",
	},
	"/response": {
		title: "対応履歴一覧",
		breadcrumb: "対応履歴",
	},
};

export function TopBarClient({ count }: { count: number }) {
	const pathname = usePathname();
	let meta = ROUTE_META[pathname] || { title: "転倒予防支援システム" };
	// デバイス詳細（/devices/[id]）は id が変わるため、前方一致で決める
	if (pathname.startsWith("/devices/")) {
		meta = { title: "デバイス詳細", breadcrumb: "デバイス管理" };
	}

	return (
		<TopBar
			title={meta.title}
			breadcrumb={meta.breadcrumb}
			showNotification={!!count}
			notificationCount={count}
		/>
	);
}
