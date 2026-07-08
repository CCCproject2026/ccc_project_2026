// Resident info panel placeholder.
// uses shared/ui/StatCard, shared/ui/TextInput, shared/tokens/spacing
// src/features/dashboard/components/ResidentInfoPanel.tsx

// 1. 親（詳細ページ）から受け取る入居者データの型定義
interface ResidentInfoPanelProps {
	resident: {
		name: string;
		age: number;
		birthday: string;
		room: string;
		// 詳細画面の左側のカード内で表示する統計データ
		stats: {
			fallCount: number;
			falseAlarmCount: number;
			totalCount: number;
		};
	};
}

// 2. 引数で { resident } を受け取るように変更
export function ResidentInfoPanel({ resident }: ResidentInfoPanelProps) {
	return (
		<div className="space-y-6">
			{/* --- 入居者基本情報エリア --- */}
			<div>
				<div className="flex items-center gap-2 mb-4 text-gray-800 font-bold text-lg">
					<span className="text-xl">👤</span>
					<h2>入居者情報</h2>
				</div>

				<div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl text-sm">
					<div>
						<span className="text-gray-400 block text-xs mb-0.5">お名前</span>
						<span className="text-gray-800 font-bold text-base">
							{resident.name}
						</span>
					</div>
					<div>
						<span className="text-gray-400 block text-xs mb-0.5">部屋番号</span>
						<span className="text-gray-800 font-medium">{resident.room}</span>
					</div>
					<div>
						<span className="text-gray-400 block text-xs mb-0.5">年齢</span>
						<span className="text-gray-800 font-medium">{resident.age} 歳</span>
					</div>
					<div>
						<span className="text-gray-400 block text-xs mb-0.5">生年月日</span>
						<span className="text-gray-800 font-medium">
							{resident.birthday}
						</span>
					</div>
				</div>
			</div>

			{/* --- 統計情報エリア（過去の転倒回数など） --- */}
			<div className="border-t border-gray-100 pt-5">
				<div className="grid grid-cols-3 gap-4 text-center">
					<div className="bg-red-50/40 p-3 rounded-xl border border-red-100/50">
						<span className="text-xs text-red-500 font-medium block mb-1">
							転倒回数
						</span>
						<span className="text-2xl font-bold text-red-600">
							{resident.stats.fallCount}
						</span>
						<span className="text-[10px] text-gray-400 block mt-0.5">回</span>
					</div>
					<div className="bg-amber-50/40 p-3 rounded-xl border border-amber-100/50">
						<span className="text-xs text-amber-600 font-medium block mb-1">
							誤検知回数
						</span>
						<span className="text-2xl font-bold text-amber-600">
							{resident.stats.falseAlarmCount}
						</span>
						<span className="text-[10px] text-gray-400 block mt-0.5">回</span>
					</div>
					<div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
						<span className="text-xs text-gray-500 font-medium block mb-1">
							総アラート数
						</span>
						<span className="text-2xl font-bold text-gray-700">
							{resident.stats.totalCount}
						</span>
						<span className="text-[10px] text-gray-400 block mt-0.5">回</span>
					</div>
				</div>
			</div>
		</div>
	);
}
