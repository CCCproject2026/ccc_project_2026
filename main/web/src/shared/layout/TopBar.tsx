import { Bell } from "lucide-react";

interface TopBarProps {
	title: string;
	breadcrumb: string;
	dateLabel?: string;
	showNotification?: boolean;
	notificationCount?: number;
}
const today = new Date().toLocaleDateString("ja-JP", {
	weekday: "long",
	year: "numeric",
	month: "long",
	day: "numeric",
});

export function TopBar({
	title,
	breadcrumb,

	showNotification,
	notificationCount,
}: TopBarProps) {
	return (
		// backdrop-blur-md を少しだけ混ぜて、スクロールしたときに後ろが綺麗に透ける柔軟なヘッダーにします
		<header className="h-16 bg-white/90 backdrop-blur-xs border-b border-gray-100 flex items-center justify-between px-4 md:px-6 shrink-0 w-full sticky top-0 z-40 transition-all">
			{/* 左側：パンくずリスト（今の場所）と タイトル */}
			{/* min-w-0 を入れることで、タイトルが長すぎても右側のボタンを押しつぶさないようになります */}
			<div className="min-w-0 flex-1 mr-4">
				{/* truncate を追加し、文字が長すぎるときは自動で「...」になるようにして崩れを防ぎます */}
				<h1 className="text-sm md:text-base font-black text-gray-900 tracking-tight truncate">
					{breadcrumb ? (
						<span className="text-gray-400 font-medium mr-1">
							{breadcrumb} /
						</span>
					) : (
						""
					)}
					{title}
				</h1>
			</div>

			{/* 右側：日付と 通知（お知らせ）ボタン */}
			{/* shrink-0 を入れ、画面が狭くなっても右側のパーツが絶対に小さくならないようにガードします */}
			<div className="flex items-center gap-3 md:gap-4 shrink-0">
				{/* スマホのときは 日付を非表示にします。画面が狭くなるからです */}
				{today && (
					<span className="hidden sm:inline-block text-xs font-bold text-gray-400 bg-gray-50/80 px-3 py-1.5 rounded-xl border border-gray-100">
						{today}
					</span>
				)}

				{showNotification && (
					<button
						type="button"
						className="relative p-2 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors border border-transparent sm:border-gray-100 cursor-pointer"
						aria-label="Notifications"
					>
						<Bell className="w-5 h-5 text-gray-500" />

						{/* 通知が 1件以上あるときだけ、赤い丸を表示します */}
						{notificationCount && notificationCount > 0 && (
							<span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full ring-2 ring-white animate-pulse">
								{notificationCount > 99 ? "99+" : notificationCount}
							</span>
						)}
					</button>
				)}
			</div>
		</header>
	);
}
