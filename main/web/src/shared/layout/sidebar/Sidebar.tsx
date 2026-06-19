import { Cpu, LayoutDashboard, Users } from "lucide-react";
import { SiberHeader } from "./SiberHeader";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarItem } from "./SidebarItem";

export function Sidebar() {
	return (
		<aside className="w-64 h-screen bg-slate-900 flex flex-col gap-2 p-4">
			<SiberHeader />

			{/* Emergency alarm banner */}
			<button
				type="button"
				className="flex items-center gap-2 mt-2 px-4 py-3 rounded-xl bg-red-950/70 text-red-300 text-sm font-semibold hover:bg-red-900/70"
			>
				<span className="w-2 h-2 rounded-full bg-red-500" />
				緊急アラーム 1件
			</button>

			{/* Navigation */}
			<nav className="flex flex-col gap-1 mt-4">
				<SidebarItem
					href="/dashboard"
					label="ダッシュボード"
					active
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
	);
}
