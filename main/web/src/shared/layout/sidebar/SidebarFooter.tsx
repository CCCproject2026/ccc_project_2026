"use client";

import type { UserRole } from "@prisma/client";
import Link from "next/link";
import { SidebarAvatar } from "./SidebarAvatar";
import { useSidebar } from "./SidebarContext";
import { SidebarSignOutButton } from "./SidebarSignOutButton";

// 名前とロールは DB の User から受け取る
// （ロールの正は DB。Clerk の publicMetadata は使わない）
interface SidebarFooterProps {
	role: UserRole;
	lastName: string;
	firstName: string;
}

export function SidebarFooter({
	role,
	lastName,
	firstName,
}: SidebarFooterProps) {
	const { isCollapsed, closeMobile } = useSidebar();
	const displayName = `${lastName} ${firstName}`;
	const initial = lastName.charAt(0) || firstName.charAt(0) || "?";

	// ロールを日本語の表示にする
	let roleLabel = "介護士";
	if (role === "NURSE") {
		roleLabel = "看護師（管理者）";
	}

	// アイコンだけの表示では、名前を隠して写真を中央に寄せる
	let layoutClass = "";
	let labelClass = "";
	if (isCollapsed) {
		layoutClass = "lg:justify-center lg:px-0";
		labelClass = "lg:hidden";
	}

	return (
		<div className="mt-auto w-full">
			{/* クリックするとマイページ（自分のスタッフ情報）を開く */}
			<Link
				href="/profile"
				onClick={closeMobile}
				aria-label="マイページ"
				title="マイページ"
				className={`flex items-center gap-3 px-2 py-3 border-t border-slate-800 hover:bg-slate-800/50 rounded-xl transition-colors cursor-pointer group ${layoutClass}`}
			>
				<SidebarAvatar initial={initial} name={displayName} />
				<div className={`whitespace-nowrap ${labelClass}`}>
					<p className="text-white text-sm leading-tight group-hover:text-primary transition-colors">
						{displayName}
					</p>
					<p className="text-slate-400 text-xs">{roleLabel}</p>
				</div>
			</Link>

			<SidebarSignOutButton />
		</div>
	);
}
