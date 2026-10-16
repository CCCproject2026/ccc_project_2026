import type { UserRole } from "@prisma/client";
import Link from "next/link";
import { DesktopSignOutButton } from "./DesktopSignOutButton";

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
	const displayName = `${lastName} ${firstName}`;
	const initial = lastName.charAt(0) || firstName.charAt(0) || "?";

	// ロールを日本語の表示にする
	let roleLabel = "介護士";
	if (role === "NURSE") {
		roleLabel = "看護師（管理者）";
	}

	return (
		<div className="mt-auto md:w-full">
			{/* クリックするとマイページ（自分のスタッフ情報）を開く */}
			<Link
				href="/profile"
				title="マイページ"
				className="hidden md:flex items-center gap-3 px-2 py-3 border-t border-slate-800 hover:bg-slate-800/50 rounded-xl transition-colors cursor-pointer group"
			>
				<div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-medium">
					{initial}
				</div>
				<div>
					<p className="text-white text-sm leading-tight group-hover:text-primary transition-colors">
						{displayName}
					</p>
					<p className="text-slate-400 text-xs">{roleLabel}</p>
				</div>
			</Link>

			<DesktopSignOutButton />
		</div>
	);
}
