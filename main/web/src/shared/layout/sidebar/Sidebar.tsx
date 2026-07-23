import { Cpu, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { mockAlarmData } from "@/features/dashboard/constants/mockDashboardData";
import { MobileSignOutButton } from "./MobileSignOutButton";
import { SiberHeader } from "./SiberHeader";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarItem } from "./SidebarItem";

const alarmCount = mockAlarmData.count ?? 0;
export function Sidebar() {
	return (
		<>
			<div className="hidden md:block w-64 h-screen shrink-0 bg-sidebar-bg">
				<aside className="w-full h-full flex flex-col gap-2 p-4">
					<SiberHeader />

					{alarmCount > 0 && (
						<button
							type="button"
							className="flex items-center gap-2 mt-2 px-4 py-3 rounded-xl bg-red-950/70 text-red-300 text-sm font-semibold hover:bg-red-900/70"
						>
							<span className="w-2 h-2 rounded-full bg-alarm animate-pulse" />
							緊急アラーム {alarmCount}件
						</button>
					)}
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
						<SidebarItem
							href="/staff"
							label="スタッフ管理"
							icon={<Users className="w-5 h-5" />}
						/>
					</nav>

					<SidebarFooter />
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
					{alarmCount > 0 && (
						<span className="absolute top-1 right-5 w-2 h-2 rounded-full bg-alarm animate-pulse" />
					)}
				</Link>

				<Link
					href="/staff"
					className="flex flex-col items-center gap-1 text-white/60 hover:text-white text-xs font-medium py-1 w-20 text-center transition-colors"
				>
					<Users className="w-5 h-5" />
					<span>スタッフ</span>
				</Link>
				{/* 修正：ユーザー情報は、他のボタンと同じサイズで「マイページ」のように並べると、画面が崩れません */}
				<Link
					// href="/profile"  なったらいい　いまいち　dashboard　にいくようにしている
					href="/dashboard"
					className="flex flex-col items-center gap-1 text-white/60 hover:text-white text-xs font-medium py-1 w-16 text-center transition-colors"
				>
					<div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-white text-[10px] font-bold">
						田
					</div>
					<span>マイページ</span>
				</Link>
				<MobileSignOutButton />
			</nav>
		</>
	);
}
