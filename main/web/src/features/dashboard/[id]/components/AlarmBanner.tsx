"use client";
import { AlertTriangle, Clock, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

// 個々の住民データの型定義
interface Resident {
	name: string;
	room: string;
	variant: string;
}

interface AlarmBannerProps {
	count?: number;
	time?: string;
	// 変更点: アラーム中の一人だけではなく、アラーム中の住民全員の配列を受け取れるようにします
	alarmedResidents?: readonly Resident[];
}

export function AlarmBanner({
	count = 0,
	time = "10:15",
	alarmedResidents = [],
}: AlarmBannerProps) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [elapsedText, setElapsedText] = useState("計算中...");

	// 最初のアラーム発生者の名前（メインバナーの簡易表示用）
	const firstResidentName = alarmedResidents[0]?.name || "不明な入居者";
	const firstRoom = alarmedResidents[0]?.room || "-号室";

	// 経過時間をリアルタイムに計算するロジック
	useEffect(() => {
		if (count === 0) return;

		function calculateElapsedTime() {
			const now = new Date();
			const alarmDate = new Date();
			const [hours, minutes] = time.split(":").map(Number);
			if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
				alarmDate.setHours(hours, minutes, 0, 0);
			}

			const diffMs = now.getTime() - alarmDate.getTime();
			const diffMins = Math.floor(diffMs / (1000 * 60));

			if (diffMins < 1) setElapsedText("たった今");
			else if (diffMins < 60) setElapsedText(`${diffMins}分前`);
			else setElapsedText(`${Math.floor(diffMins / 60)}時間前`);
		}

		calculateElapsedTime();
		const timer = setInterval(calculateElapsedTime, 60000);
		return () => clearInterval(timer);
	}, [time, count]);

	// アラームが0件のときは、何も画面に表示しません
	if (count === 0) return null;

	return (
		<section
			className="rounded-2xl border border-red-200 bg-red-50/80 p-5 shadow-xs animate-pulse-slow"
			role="status"
		>
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				{/* 左側：アイコン ＆ アラーム概要 */}
				<div className="flex items-center gap-4">
					<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100">
						<AlertTriangle className="h-5 w-5 text-red-600" />
					</div>

					<div>
						<div className="flex items-center gap-2 flex-wrap">
							<span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">
								<span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
								未対応
							</span>
							<span className="text-base font-black text-red-700">
								緊急アラームが {count} 件 発生しています
							</span>
						</div>

						{/* 複数いる場合は「ほか〇名」と表示して、情報が崩れるのを防ぎます */}
						<p className="mt-1 text-sm text-gray-600 font-medium">
							対象:{" "}
							<span className="font-bold text-gray-950">
								{firstResidentName}
							</span>{" "}
							({firstRoom})
							{count > 1 && (
								<span className="text-red-600 font-bold ml-1">
									{" "}
									ほか {count - 1} 名
								</span>
							)}
							<span className="mx-2 text-gray-300">|</span>
							検知時刻:{" "}
							<span className="text-red-600 font-semibold">{time}</span>
						</p>
					</div>
				</div>

				{/* 右側：対応ボタン */}
				<button
					type="button"
					onClick={() => setIsModalOpen(true)}
					className="w-full shrink-0 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.98] md:w-auto cursor-pointer"
				>
					現場確認・対応する ({count}件)
				</button>

				{/* ── モーダル画面（ポップアップ） ── */}
				{isModalOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
						<div className="relative w-[95%] max-w-2xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl flex flex-col max-h-[90vh]">
							{/* 閉じるボタン */}
							<button
								type="button"
								onClick={() => setIsModalOpen(false)}
								className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer"
							>
								✕
							</button>

							{/* ヘッダーエリア */}
							<div className="text-center pb-4 border-b border-gray-100">
								<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
									<AlertTriangle className="h-6 w-6 text-red-500" />
								</div>
								<h2 className="mt-2 text-xl font-black text-red-600">
									緊急転倒アラート詳細
								</h2>
								<p className="text-xs text-gray-400 mt-1">
									現在 {count} 箇所の部屋で異常体勢変化を検知しています
								</p>
							</div>

							{/* アラームが発生している全員のリスト表示エリア（スクロール可能） */}
							<div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1 max-h-[45vh]">
								{alarmedResidents.map((resident) => (
									<div
										key={resident.room}
										className="rounded-2xl border border-red-100 bg-red-50/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
									>
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<span className="text-lg font-bold text-gray-900">
													{resident.name}
												</span>
												<span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-md">
													要確認
												</span>
											</div>
											<div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
												<span className="flex items-center gap-1">
													<MapPin className="w-3.5 h-3.5 text-gray-400" />
													{resident.room}
												</span>
												<span className="flex items-center gap-1">
													<Clock className="w-3.5 h-3.5 text-gray-400" />
													{time} ({elapsedText})
												</span>
											</div>
										</div>

										{/* 住民ごとの個別対応ボタン */}

										<button
											type="button"
											disabled={true}
											className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
										>
											{/* すでにインポートされている AlertTriangle を使うことでエラーを防ぎます */}
											<AlertTriangle className="w-4 h-4" />
											現場確認・対応する
										</button>
									</div>
								))}
							</div>

							{/* フッターエリア */}
							<div className="mt-6 pt-4 border-t border-gray-100 flex flex-col items-center gap-3">
								<button
									type="button"
									onClick={() => setIsModalOpen(false)}
									className="w-full sm:w-32 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer text-center"
								>
									閉じる
								</button>
								<p className="text-center text-[11px] text-gray-400 font-medium">
									緊急時は直ちに担当医師へ連絡してください
								</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</section>
	);
}
