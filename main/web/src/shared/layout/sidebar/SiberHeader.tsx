"use client";

import { Activity, X } from "lucide-react";
import { useSidebar } from "./SidebarContext";

export function SiberHeader() {
	const { isCollapsed, closeMobile } = useSidebar();

	// アイコンだけの表示では、ロゴだけを中央に出す
	let layoutClass = "";
	let labelClass = "";
	if (isCollapsed) {
		layoutClass = "lg:justify-center lg:px-0";
		labelClass = "lg:hidden";
	}

	return (
		<div className={`flex items-center gap-3 px-2 py-2 ${layoutClass}`}>
			<div className="w-11 h-11 shrink-0 rounded-xl bg-violet-600 flex items-center justify-center">
				<Activity className="w-6 h-6 text-white" />
			</div>
			<div className={`flex-1 whitespace-nowrap ${labelClass}`}>
				<p className="text-white font-bold text-base leading-tight">転倒予防</p>
				<p className="text-slate-400 text-xs">支援システム</p>
			</div>
			{/* ドロワーを閉じるボタン（PC ではトップバーのボタンを使う） */}
			<button
				type="button"
				onClick={closeMobile}
				aria-label="メニューを閉じる"
				className="flex lg:hidden shrink-0 items-center justify-center w-10 h-10 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
			>
				<X className="w-5 h-5" />
			</button>
		</div>
	);
}
