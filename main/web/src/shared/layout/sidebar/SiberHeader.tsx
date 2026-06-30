import { Activity } from "lucide-react";

export function SiberHeader() {
	return (
		<div className="flex items-center gap-3 px-2 py-2">
			<div className="w-11 h-11 rounded-xl bg-violet-600 flex items-center justify-center">
				<Activity className="w-6 h-6 text-white" />
			</div>
			<div>
				<p className="text-white font-bold text-base leading-tight">転倒予防</p>
				<p className="text-slate-400 text-xs">支援システム</p>
			</div>
		</div>
	);
}
