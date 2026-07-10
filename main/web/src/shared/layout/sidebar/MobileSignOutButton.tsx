"use client";

import { User } from "lucide-react";
import { useClerk } from "@clerk/nextjs";

export function MobileSignOutButton() {
	const { signOut } = useClerk();
	return (
		<button
			type="button"
			onClick={() => signOut({ redirectUrl: "/login" })}
			className="flex flex-col items-center gap-1 text-white/60 hover:text-white text-xs font-medium py-1 w-16 text-center transition-colors"
		>
			<div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-white text-[10px] font-bold">
				<User className="w-3 h-3" />
			</div>
			<span>ログアウト</span>
		</button>
	);
}
