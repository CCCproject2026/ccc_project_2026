"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { DesktopSignOutButton } from "./DesktopSignOutButton";

export function SidebarFooter() {
	const { user } = useUser();
	const firstName = user?.firstName ?? "";
	const lastName = user?.lastName ?? "";
	const displayName = [firstName, lastName].filter(Boolean).join(" ") || "未設定";
	const initial = lastName?.charAt(0) || firstName?.charAt(0) || "?";
	const role = user?.publicMetadata?.role === "nurse_admin"
		? "看護師（管理者）"
		: "介護士";

	return (
		<div className="mt-auto md:w-full">
			<Link
				href="/dashboard"
				className="hidden md:flex items-center gap-3 px-2 py-3 border-t border-slate-800 hover:bg-slate-800/50 rounded-xl transition-colors cursor-pointer group"
			>
				<div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-medium">
					{initial}
				</div>
				<div>
					<p className="text-white text-sm leading-tight group-hover:text-primary transition-colors">
						{displayName}
					</p>
					<p className="text-slate-400 text-xs">{role}</p>
				</div>
			</Link>

			<DesktopSignOutButton />
		</div>
	);
}
