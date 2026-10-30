"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { SIDEBAR_COLLAPSED_COOKIE } from "./sidebarCookie";

// Cookie の保存期間（1年）
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

interface SidebarContextValue {
	isCollapsed: boolean; // PC: アイコンだけの細い表示かどうか
	isMobileOpen: boolean; // スマホ・タブレット: ドロワーが開いているかどうか
	toggleCollapsed: () => void;
	openMobile: () => void;
	closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

// サイドバーとトップバーのボタンの両方で開閉状態を使うので、Context で共有する
export function SidebarProvider({
	initialCollapsed,
	children,
}: {
	initialCollapsed: boolean; // サーバーが Cookie から読んだ値（再読み込みしても表示が変わらないように）
	children: ReactNode;
}) {
	const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
	const [isMobileOpen, setIsMobileOpen] = useState(false);

	// ドロワーが開いている間だけ、Esc キーで閉じられるようにする
	useEffect(() => {
		if (!isMobileOpen) {
			return;
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setIsMobileOpen(false);
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isMobileOpen]);

	function toggleCollapsed() {
		const nextCollapsed = !isCollapsed;
		setIsCollapsed(nextCollapsed);
		// biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API は古い iOS Safari で使えないため
		document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${nextCollapsed}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
	}

	function openMobile() {
		setIsMobileOpen(true);
	}

	function closeMobile() {
		setIsMobileOpen(false);
	}

	return (
		<SidebarContext.Provider
			value={{
				isCollapsed,
				isMobileOpen,
				toggleCollapsed,
				openMobile,
				closeMobile,
			}}
		>
			{children}
		</SidebarContext.Provider>
	);
}

export function useSidebar() {
	const value = useContext(SidebarContext);
	if (value === null) {
		throw new Error("useSidebar は SidebarProvider の中で使ってください");
	}
	return value;
}
