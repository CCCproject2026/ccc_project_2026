"use client";

import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { useSidebar } from "./SidebarContext";

export function SidebarSignOutButton() {
	const { signOut } = useClerk();
	const { isCollapsed } = useSidebar();

	// アイコンだけの表示では、文字を隠してアイコンを中央に寄せる
	let layoutClass = "";
	let labelClass = "";
	let title: string | undefined;
	if (isCollapsed) {
		layoutClass = "lg:justify-center lg:px-0";
		labelClass = "lg:hidden";
		title = "ログアウト";
	}

	return (
		<button
			type="button"
			onClick={() => signOut({ redirectUrl: "/login" })}
			aria-label="ログアウト"
			title={title}
			className={`flex items-center gap-3 px-4 py-3 w-full text-sm text-slate-300 hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap ${layoutClass}`}
		>
			<LogOut className="w-5 h-5 shrink-0" />
			<span className={labelClass}>ログアウト</span>
		</button>
	);
}
