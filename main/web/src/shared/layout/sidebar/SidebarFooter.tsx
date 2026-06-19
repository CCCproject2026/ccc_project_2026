import { LogOut } from "lucide-react";

export function SidebarFooter() {
	return (
		<div className="mt-auto">
			<div className="flex items-center gap-3 px-2 py-3 border-t border-slate-800">
				<div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-medium">
					田
				</div>
				<div>
					<p className="text-white text-sm leading-tight">田中 花子</p>
					<p className="text-slate-400 text-xs">看護師（管理者）</p>
				</div>
			</div>
			<button
				type="button"
				className="flex items-center gap-3 px-4 py-3 w-full text-sm text-slate-300 hover:bg-slate-800 rounded-xl"
			>
				<LogOut className="w-5 h-5" />
				ログアウト
			</button>
		</div>
	);
}
