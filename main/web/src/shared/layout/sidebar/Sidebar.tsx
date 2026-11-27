import type { UserRole } from "@prisma/client";
import { Cpu, LayoutDashboard, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { MobileSignOutButton } from "./MobileSignOutButton";
import { SiberHeader } from "./SiberHeader";
import { SidebarAvatar } from "./SidebarAvatar";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarItem } from "./SidebarItem";

// ログイン中の人の情報（DB の User から渡す）
interface SidebarProps {
	role: UserRole;
	lastName: string;
	firstName: string;
}

export function Sidebar({ role, lastName, firstName }: SidebarProps) {
	// スタッフ管理は NURSE だけが使えるので、NURSE のときだけメニューに出す
	// （メニューを隠すだけでなく、ページと API でも NURSE かどうかチェックしている）
	const canManageStaff = role === "NURSE";

	return (
		<>
			<div className="hidden md:block w-64 h-screen shrink-0 bg-sidebar-bg">
				<aside className="w-full h-full flex flex-col gap-2 p-4">
					<SiberHeader />

					{/* 実データ連携までは、架空の緊急アラームを表示しない。 */}
					<nav className="flex flex-col gap-1 mt-4 flex-1">
						<SidebarItem
							href="/dashboard"
							label="ダッシュボード"
							icon={<LayoutDashboard className="w-5 h-5" />}
						/>
						<SidebarItem
							href="/devices"
							label="デバイス管理"
							icon={<Cpu className="w-5 h-5" />}
						/>
						{canManageStaff && (
							<SidebarItem
								href="/staff"
								label="スタッフ管理"
								icon={<Users className="w-5 h-5" />}
							/>
						)}
						{/* 高齢者管理は全員が見られる（登録・編集は NURSE だけ。API でチェックしている） */}
						<SidebarItem
							href="/elders"
							label="高齢者管理"
							icon={<UserPlus className="w-5 h-5" />}
						/>
					</nav>

					<SidebarFooter
						role={role}
						lastName={lastName}
						firstName={firstName}
					/>
				</aside>
			</div>

			<nav className="fixed bottom-0 left-0 right-0 h-16 bg-sidebar-bg border-t border-white/10 flex md:hidden items-center justify-around px-2 z-50 shadow-xl">
				{/* ダッシュボードのタブ */}
				<Link
					href="/dashboard"
					className="flex flex-col items-center gap-1 text-white text-xs font-medium py-1 w-20 text-center"
				>
					<LayoutDashboard className="w-5 h-5 text-primary" />
					<span>ダッシュ</span>
				</Link>

				<Link
					href="/devices"
					className="flex flex-col items-center gap-1 text-white/60 hover:text-white text-xs font-medium py-1 w-20 text-center transition-colors relative"
				>
					<Cpu className="w-5 h-5" />
					<span>デバイス</span>
				</Link>

				{canManageStaff && (
					<Link
						href="/staff"
						className="flex flex-col items-center gap-1 text-white/60 hover:text-white text-xs font-medium py-1 w-20 text-center transition-colors"
					>
						<Users className="w-5 h-5" />
						<span>スタッフ</span>
					</Link>
				)}
				<Link
					href="/elders"
					className="flex flex-col items-center gap-1 text-white/60 hover:text-white text-xs font-medium py-1 w-20 text-center transition-colors"
				>
					<UserPlus className="w-5 h-5" />
					<span>高齢者</span>
				</Link>
				{/* マイページ（自分のスタッフ情報） */}
				<Link
					href="/profile"
					className="flex flex-col items-center gap-1 text-white/60 hover:text-white text-xs font-medium py-1 w-16 text-center transition-colors"
				>
					<SidebarAvatar
						initial={lastName.charAt(0) || firstName.charAt(0) || "?"}
						name={`${lastName} ${firstName}`}
						size="sm"
					/>
					<span>マイページ</span>
				</Link>
				<MobileSignOutButton />
			</nav>
		</>
	);
}
