// Resident detail page shell.
// uses shared/ui/ResidentInfoPanel, shared/ui/StatCard, shared/tokens/spacing
// src/features/dashboard/pages/ResidentDetailPage.tsx

"use client"; // Next.jsのApp Routerで、ルーター（遷移機能）やボタンのクリックイベントを使うために必須の宣言

import { useRouter } from "next/navigation"; // 画面遷移を行うためのNext.js公式フック
import { ResidentInfoPanel } from "../components/ResidentInfoPanel"; // すでに用意されている入居者情報パネル
import { ResponseHistoryTable } from "../components/ResponseHistoryTable"; // すでに用意されている対応履歴テーブル

// getResidentDetailById から渡されるデータの型定義（TypeScript用）
interface ResidentDetailPageProps {
	initialData: {
		id: string;
		name: string;
		age: number;
		birthday: string;
		room: string;
		deviceName: string;
		batteryLevel: number;
		variant: string;
		device: {
			name: string;
			id: string;
			battery: number;
			lastCommunication: string;
			status: string;
		};
		stats: {
			fallCount: number;
			falseAlarmCount: number;
			totalCount: number;
		};
		history: Array<{
			id: string;
			createdAt: string;
			respondedAt: string;
			duration: string;
			judgment: string;
			staff: string;
			memo: string;
		}>;
	};
}

export function ResidentDetailPage({ initialData }: ResidentDetailPageProps) {
	const router = useRouter(); // 画面遷移をコントロールするルーターインスタンス
	const data = initialData; // [id]/page.tsx から渡された入居者の特定データ

	return (
		<main className="min-h-screen bg-gray-50/50 p-6 w-full">
			<div className="mx-auto max-w-[1600px] space-y-6">
				{/* 「一覧に戻る」ボタン */}
				<div>
					<button
						type="button"
						onClick={() => router.push("/dashboard")} // クリックしたらダッシュボード（一覧画面）へ戻る
						className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
					>
						一覧に戻る
					</button>
				</div>

				{/*  メインコンテンツ：横並び2カラム（グリッドレイアウト） */}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
					{/* 左側カラム (12列中7列を占有)：入居者基本情報 ＆ 統計情報 */}
					<div className="lg:col-span-7 bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
						{/* 既存のコンポーネントへ、この入居者固有のデータをそのまま流し込む */}
						<ResidentInfoPanel resident={data} />
					</div>

					{/* 右側カラム (12列中5列を占有)：デバイス状態パネル */}
					<div className="lg:col-span-5 bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
						<div>
							{/* パネルのタイトル */}
							<div className="flex items-center gap-2 mb-5 text-gray-800 font-bold text-lg">
								<span className="text-xl">📱</span>
								<h2>デバイス状態</h2>
							</div>

							{/* デバイスの基本情報（青い枠のエリア） */}
							<div className="bg-blue-50/60 rounded-xl p-4 mb-5">
								<div className="text-blue-600 font-bold text-base">
									{data.device.name}
								</div>
								<div className="text-xs text-gray-400 mt-0.5">
									ID: {data.device.id}
								</div>
							</div>

							{/* バッテリー残量 ＆ インジケーターバー */}
							<div className="space-y-5">
								<div>
									<div className="flex justify-between text-sm mb-1.5">
										<span className="text-gray-500 font-medium">
											バッテリー残量
										</span>
										{/* バッテリーが20%以下なら赤、それ以外は緑にテキスト色を変化 */}
										<span
											className={`font-bold ${data.device.battery <= 20 ? "text-red-500" : "text-emerald-600"}`}
										>
											{data.device.battery}%
										</span>
									</div>
									{/* バッテリーのバーグラフの背景 */}
									<div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
										{/* バッテリー残量に応じて横幅（width）と色を動的に変更 */}
										<div
											className={`h-full transition-all ${data.device.battery <= 20 ? "bg-red-500" : "bg-emerald-500"}`}
											style={{ width: `${data.device.battery}%` }}
										></div>
									</div>
								</div>

								{/* 最終通信時刻 */}
								<div className="flex justify-between border-t border-gray-100 pt-4 text-sm">
									<span className="text-gray-500">最終通信時刻</span>
									<span className="text-gray-700 font-medium">
										{data.device.lastCommunication}
									</span>
								</div>
							</div>
						</div>

						{/* 下部のステータスバッジエリア */}
						<div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-6 text-sm">
							<span className="text-gray-500">接続ステータス</span>
							{/* アラーム中(赤)、バッテリー低下(黄)、正常(緑)でバッジの色を切り替え */}
							<span
								className={`px-3 py-1 rounded-full text-xs font-bold ${
									data.variant === "alarm"
										? "bg-red-50 text-red-600"
										: data.device.battery <= 20
											? "bg-amber-50 text-amber-600"
											: "bg-emerald-50 text-emerald-600"
								}`}
							>
								{data.device.status}
							</span>
						</div>
					</div>
				</div>

				{/* 4. 下段：対応履歴ログ（テーブル） */}
				<div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
					<div className="flex items-center gap-2 mb-4 text-gray-800 font-bold text-lg">
						<h2>対応履歴ログ</h2>
					</div>
					{/* 既存のテーブルコンポーネントに配列データを渡して一覧表示 */}
					<ResponseHistoryTable data={data.history} />
				</div>
			</div>
		</main>
	);
}
