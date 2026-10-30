"use client";

import type { UserRole } from "@prisma/client";
import { Cpu, LayoutDashboard, UserPlus, Users } from "lucide-react";
import { SiberHeader } from "./SiberHeader";
import { useSidebar } from "./SidebarContext";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarItem } from "./SidebarItem";

// ログイン中の人の情報（DB の User から渡す）
interface SidebarProps {
	role: UserRole;
	lastName: string;
	firstName: string;
	alarmCount: number;
}

export function Sidebar({
	role,
	lastName,
	firstName,
	alarmCount,
}: SidebarProps) {
	const { isCollapsed, isMobileOpen, closeMobile } = useSidebar();

	// スタッフ管理は NURSE だけが使えるので、NURSE のときだけメニューに出す
	// （メニューを隠すだけでなく、ページと API でも NURSE かどうかチェックしている）
	const canManageStaff = role === "NURSE";

	// PC（lg 以上）は幅を変えるだけ。アイコンだけのときは文字を隠す
	let desktopWidthClass = "lg:w-64";
	let alarmLayoutClass = "";
	let alarmLabelClass = "";
	if (isCollapsed) {
		desktopWidthClass = "lg:w-20";
		alarmLayoutClass = "lg:justify-center lg:px-0";
		alarmLabelClass = "lg:hidden";
	}

	// スマホ・タブレット（lg 未満）は画面の外に隠し、開いたときだけ左から出す
	// invisible にしておくと、閉じている間は Tab キーでも選べない
	let mobilePositionClass = "-translate-x-full invisible";
	if (isMobileOpen) {
		mobilePositionClass = "translate-x-0 visible";
	}

	return (
		<>
			{/* ドロワーの後ろの暗い背景。押すと閉じる */}
			{isMobileOpen && (
				<button
					type="button"
					onClick={closeMobile}
					aria-label="メニューを閉じる"
					className="fixed inset-0 z-50 bg-black/50 lg:hidden"
				/>
			)}

			<aside
				id="app-sidebar"
				aria-label="メインメニュー"
				className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col gap-2 p-4 overflow-x-hidden overflow-y-auto bg-sidebar-bg transition-[width,translate,visibility] duration-200 motion-reduce:transition-none lg:static lg:h-full lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:visible ${desktopWidthClass} ${mobilePositionClass}`}
			>
				<SiberHeader />

				{alarmCount > 0 && (
					<button
						type="button"
						aria-label={`緊急アラーム ${alarmCount}件`}
						title={`緊急アラーム ${alarmCount}件`}
						className={`flex items-center gap-2 mt-2 px-4 py-3 rounded-xl bg-red-950/70 text-red-300 text-sm font-semibold hover:bg-red-900/70 whitespace-nowrap ${alarmLayoutClass}`}
					>
						<span className="w-2 h-2 shrink-0 rounded-full bg-alarm animate-pulse" />
						<span className={alarmLabelClass}>緊急アラーム {alarmCount}件</span>
					</button>
				)}
				<nav className="flex flex-col gap-1 mt-4 flex-1">
					<SidebarItem
						href="/dashboard"
						label="ダッシュボード"
						icon={<LayoutDashboard className="w-5 h-5 shrink-0" />}
					/>
					<SidebarItem
						href="/devices"
						label="デバイス管理"
						icon={<Cpu className="w-5 h-5 shrink-0" />}
					/>
					{canManageStaff && (
						<SidebarItem
							href="/staff"
							label="スタッフ管理"
							icon={<Users className="w-5 h-5 shrink-0" />}
						/>
					)}
					{/* 高齢者管理は全員が見られる（登録・編集は NURSE だけ。API でチェックしている） */}
					<SidebarItem
						href="/elders"
						label="高齢者管理"
						icon={<UserPlus className="w-5 h-5 shrink-0" />}
					/>
				</nav>

				<SidebarFooter role={role} lastName={lastName} firstName={firstName} />
			</aside>
		</>
	);
}
