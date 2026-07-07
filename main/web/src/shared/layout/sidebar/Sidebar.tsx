"use client";

import { Cpu, LayoutDashboard, User, Users } from "lucide-react";
import { mockAlarmData } from "@/features/dashboard/constants/mockDashboardData";
import { SiberHeader } from "./SiberHeader";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarItem } from "./SidebarItem";
import { useClerk } from "@clerk/nextjs";

//const alarmCount=0;
const alarmCount = mockAlarmData.count ?? 0;
export function Sidebar() {
	const { signOut } = useClerk();
	return (
		<>
			{/* パソコン用のUI：画面の左側に固定するサイドバー */}
			{/* スマホのときは非表示、パソコン（mdサイズ以上）のときだけ表示します */}
			<div className="hidden md:block w-64 h-screen shrink-0 bg-sidebar-bg">
				<aside className="w-full h-full flex flex-col gap-2 p-4">
					<SiberHeader />

					{/* 緊急アラームがあるときのボタン */}
					{alarmCount > 0 && (
						<button
							type="button"
							className="flex items-center gap-2 mt-2 px-4 py-3 rounded-xl bg-red-950/70 text-red-300 text-sm font-semibold hover:bg-red-900/70"
						>
							<span className="w-2 h-2 rounded-full bg-alarm animate-pulse" />
							緊急アラーム {alarmCount}件
						</button>
					)}
					{/* メニューのリンク一覧 */}
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

			{/* スマホ用のUI：画面の下に固定するナビゲーションバー */}
			{/* スマホのときだけ表示して、パソコン（mdサイズ以上）のときは非表示（hidden）にします */}
			<nav className="fixed bottom-0 left-0 right-0 h-16 bg-sidebar-bg border-t border-white/10 flex md:hidden items-center justify-around px-2 z-50 shadow-xl">
				{/* ダッシュボードのタブ */}
				<a
					href="/dashboard"
					className="flex flex-col items-center gap-1 text-white text-xs font-medium py-1 w-20 text-center"
				>
					<LayoutDashboard className="w-5 h-5 text-primary" />
					<span>ダッシュ</span>
				</a>

				{/* デバイス管理のタブ */}
				<a
					href="/devices"
					className="flex flex-col items-center gap-1 text-white/60 hover:text-white text-xs font-medium py-1 w-20 text-center transition-colors relative"
				>
					<Cpu className="w-5 h-5" />
					<span>デバイス</span>
					{/* アラームがあるときは、わかりやすいように小さな赤い丸をつけます */}
					{alarmCount > 0 && (
						<span className="absolute top-1 right-5 w-2 h-2 rounded-full bg-alarm animate-pulse" />
					)}
				</a>

				{/* スタッフ管理のタブ */}
				<a
					href="/staff"
					className="flex flex-col items-center gap-1 text-white/60 hover:text-white text-xs font-medium py-1 w-20 text-center transition-colors"
				>
					<Users className="w-5 h-5" />
					<span>スタッフ</span>
				</a>
				{/* 修正：ユーザー情報は、他のボタンと同じサイズで「マイページ」のように並べると、画面が崩れません */}
				<a
					// href="/profile"  なったらいい　いまいち　dashboard　にいくようにしている
					href="/dashboard"
					className="flex flex-col items-center gap-1 text-white/60 hover:text-white text-xs font-medium py-1 w-16 text-center transition-colors"
				>
					<div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-white text-[10px] font-bold">
						田
					</div>
					<span>マイページ</span>
				</a>
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
			</nav>
		</>
	);
}
