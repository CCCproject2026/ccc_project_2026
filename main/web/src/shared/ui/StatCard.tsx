import type { LucideIcon } from "lucide-react";

interface StatCardProps {
	title: string;
	value: number | string;
	icon: LucideIcon;
	color: string; // モックデータから "green", "violet", "red", "blue" を受け取ります
	description?: string;
}

export function StatCard({
	title,
	value,
	icon,
	color,
	description,
}: StatCardProps) {
	const Icon = icon;

	//「濃い文字色」と「薄い背景色」のセットを作っておきます。
	// これを書いておくことで、ビルドしたときも確実に色が表示されます！
	const colorMap: Record<string, { text: string; bg: string }> = {
		green: { text: "text-green-600", bg: "bg-green-50" },
		violet: { text: "text-violet-600", bg: "bg-violet-50" },
		red: { text: "text-red-600", bg: "bg-red-50" },
		blue: { text: "text-blue-600", bg: "bg-blue-50" },
		slate: { text: "text-slate-600", bg: "bg-slate-50" },
	};

	// 指定された色が上のマップになければ、仮として slate（グレー）を使います
	const currentStyles = colorMap[color] || colorMap.slate;

	return (
		<article className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs hover:shadow-md transition-shadow duration-200">
			<div className="flex items-start justify-between">
				{/* 左側：タイトルと 大きな数字 */}
				<div className="flex flex-col gap-1.5">
					{/* デバイスカラー（currentStyles.text）と同じ色でタイトルを表示します */}
					<p
						className={`text-xs font-bold tracking-wider ${currentStyles.text}`}
					>
						{title}
					</p>
					<p className="text-2xl font-black text-gray-900 tracking-tight">
						{value}
					</p>
				</div>

				{/* 右側：薄い背景と、タイトルと同じ濃い色のアイコン */}
				<div
					className={`p-2.5 rounded-xl flex items-center justify-center ${currentStyles.bg}`}
				>
					<Icon className={`w-5 h-5 ${currentStyles.text}`} />
				</div>
			</div>

			{/* 一番下：説明 */}
			{description && (
				<div className="mt-4 pt-3 border-t border-gray-50">
					<p className="text-xs text-gray-400 font-medium">{description}</p>
				</div>
			)}
		</article>
	);
}
