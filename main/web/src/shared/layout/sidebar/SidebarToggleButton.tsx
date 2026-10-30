"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebar } from "./SidebarContext";

const BUTTON_CLASS =
	"shrink-0 items-center justify-center w-10 h-10 rounded-xl text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer";

// トップバー左端の開閉ボタン
// 画面幅で動きが変わるので、ボタンを2つ置いて lg を境に片方だけ表示する
export function SidebarToggleButton() {
	const { isCollapsed, isMobileOpen, toggleCollapsed, openMobile } =
		useSidebar();

	let desktopLabel = "メニューを閉じる";
	if (isCollapsed) {
		desktopLabel = "メニューを開く";
	}

	return (
		<>
			{/* スマホ・タブレット: ドロワーを開く */}
			<button
				type="button"
				onClick={openMobile}
				aria-label="メニューを開く"
				aria-expanded={isMobileOpen}
				aria-controls="app-sidebar"
				className={`flex lg:hidden ${BUTTON_CLASS}`}
			>
				<Menu className="w-5 h-5" />
			</button>

			{/* PC: ラベル付きとアイコンだけの表示を切り替える */}
			<button
				type="button"
				onClick={toggleCollapsed}
				aria-label={desktopLabel}
				title={desktopLabel}
				aria-expanded={!isCollapsed}
				aria-controls="app-sidebar"
				className={`hidden lg:flex ${BUTTON_CLASS}`}
			>
				{isCollapsed ? (
					<PanelLeftOpen className="w-5 h-5" />
				) : (
					<PanelLeftClose className="w-5 h-5" />
				)}
			</button>
		</>
	);
}
