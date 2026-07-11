"use client";

import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

export function DesktopSignOutButton() {
	const { signOut } = useClerk();
	return (
		<button
			type="button"
			onClick={() => signOut({ redirectUrl: "/login" })}
			className="hidden md:flex items-center gap-3 px-4 py-3 w-full text-sm text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
		>
			<LogOut className="w-5 h-5" />
			ログアウト
		</button>
	);
}
