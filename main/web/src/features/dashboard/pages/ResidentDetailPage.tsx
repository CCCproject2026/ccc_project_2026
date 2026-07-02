import { ChevronLeft, Clock, FileText, User } from "lucide-react";
import Link from "next/link";
import { DeviceStatusPanel } from "../components/DeviceStatusPanel";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ResponseHistoryEntry {
	id: string;
	detectedAt: string;
	respondedAt?: string | null;
	responseMinutes?: number | null;
	isActualFall: boolean | null;
	staffName: string | null;
	notes: string | null;
}

interface MockResident {
	id: string;
	name: string;
	roomNumber: string;
	birthDate: string;
	age: number;
	deviceName?: string;
	deviceId?: string;
	batteryLevel?: number;
	lastSeen?: string;
	status: "active" | "inactive";
	fallRiskLevel: "low" | "medium" | "high";
	totalFalls: number;
	falseDetections: number;
	totalAlerts: number;
	logs: ResponseHistoryEntry[];
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_RESIDENTS: Record<string, MockResident> = {
	"1": {
		id: "1",
		name: "山田 太郎",
		roomNumber: "101号室",
		birthDate: "1935/3/15",
		age: 91,
		deviceName: "ESP32-101",
		deviceId: "dev-001",
		batteryLevel: 87,
		lastSeen: "2026/06/10 09:10",
		status: "active",
		fallRiskLevel: "medium",
		totalFalls: 0,
		falseDetections: 2,
		totalAlerts: 2,
		logs: [
			{
				id: "log-1",
				detectedAt: "2026/06/09 14:15",
				respondedAt: "2026/06/09 14:18",
				responseMinutes: 3,
				isActualFall: false,
				staffName: "佐藤 美紀",
				notes: "体位変換時の一時的な姿勢崩れ。実際の転倒なし。問題なし。",
			},
			{
				id: "log-2",
				detectedAt: "2026/06/08 16:30",
				respondedAt: "2026/06/08 16:34",
				responseMinutes: 4,
				isActualFall: false,
				staffName: "佐藤 美紀",
				notes: "体操中の大きな動作を誤検知。問題なし。",
			},
		],
	},
	"2": {
		id: "2",
		name: "田中 一郎",
		roomNumber: "301号室",
		birthDate: "1941/8/22",
		age: 85,
		deviceName: "ESP32-102",
		deviceId: "dev-002",
		batteryLevel: 42,
		lastSeen: "2026/06/10 08:55",
		status: "active",
		fallRiskLevel: "low",
		totalFalls: 1,
		falseDetections: 2,
		totalAlerts: 3,
		logs: [
			{
				id: "log-3",
				detectedAt: "2026/06/17 21:40",
				respondedAt: "2026/06/17 21:47",
				responseMinutes: 7,
				isActualFall: true,
				staffName: "山田 花子",
				notes: "ベッド横で転倒を確認。骨折の疑いがないためお声がけして復帰。",
			},
			{
				id: "log-4",
				detectedAt: "2026/06/15 14:05",
				respondedAt: "2026/06/15 14:08",
				responseMinutes: 3,
				isActualFall: false,
				staffName: "佐藤 太郎",
				notes: "センサーが寝返りの衝撃を誤検知。ご本人は安眠中。",
			},
			{
				id: "log-5",
				detectedAt: "2026/06/12 09:30",
				respondedAt: null,
				responseMinutes: null,
				isActualFall: null,
				staffName: null,
				notes: null,
			},
		],
	},
	"3": {
		id: "3",
		name: "鈴木 みやこ",
		roomNumber: "302号室",
		birthDate: "1948/5/10",
		age: 78,
		deviceName: "ESP32-103",
		deviceId: "dev-003",
		batteryLevel: 15,
		lastSeen: "2026/06/10 07:30",
		status: "active",
		fallRiskLevel: "high",
		totalFalls: 0,
		falseDetections: 0,
		totalAlerts: 0,
		logs: [],
	},
	"4": {
		id: "4",
		name: "渡辺 恵子",
		roomNumber: "308号室",
		birthDate: "1944/11/3",
		age: 82,
		status: "active",
		fallRiskLevel: "low",
		totalFalls: 0,
		falseDetections: 0,
		totalAlerts: 0,
		logs: [],
	},
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FallJudgementBadge({ isActualFall }: { isActualFall: boolean | null }) {
	if (isActualFall === null)
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-alarm-bg text-alarm">
				未対応
			</span>
		);
	if (isActualFall)
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
				転倒
			</span>
		);
	return (
		<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-warning-bg text-warning">
			誤検知
		</span>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ResidentDetailPage({ id }: { id: string }) {
	const resident = MOCK_RESIDENTS[id] ?? MOCK_RESIDENTS["1"];

	return (
		<>
			{/* Back link */}
			<div className="mb-5">
				<Link
					href="/dashboard"
					className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-gray-50"
				>
					<ChevronLeft className="w-4 h-4" />
					一覧に戻る
				</Link>
			</div>

			{/* Top row: resident info (left) + device status (right) */}
			<div className="grid grid-cols-2 gap-6 mb-6">
				{/* 入所者情報 */}
				<article className="bg-white rounded-xl border border-gray-200 p-6">
					<h2 className="text-h3 font-semibold text-gray-800 mb-4 flex items-center gap-2">
						<User className="w-4 h-4 text-primary" />
						入所者情報
					</h2>
					<div className="flex items-center gap-3 mb-5">
						<div className="w-12 h-12 rounded-full bg-primary-bg flex items-center justify-center text-primary-dark font-bold text-lg shrink-0">
							{resident.name.charAt(0)}
						</div>
						<div>
							<p className="text-xl font-bold text-gray-900">{resident.name}</p>
							<p className="text-sm text-gray-400">{resident.age}歳</p>
						</div>
					</div>
					<div className="text-sm space-y-3 border-t border-gray-100 pt-4 mb-5">
						<div className="flex justify-between">
							<span className="text-gray-500">居室番号</span>
							<span className="text-gray-800 font-medium">{resident.roomNumber}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-500">生年月日</span>
							<span className="text-gray-800 font-medium">{resident.birthDate}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-500">年齢</span>
							<span className="text-gray-800 font-medium">{resident.age}歳</span>
						</div>
					</div>
					<div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-4">
						<div className="flex flex-col items-center gap-0.5">
							<span className="text-2xl font-bold text-alarm">{resident.totalFalls}</span>
							<span className="text-xs text-gray-500">転倒</span>
						</div>
						<div className="flex flex-col items-center gap-0.5">
							<span className="text-2xl font-bold text-warning">{resident.falseDetections}</span>
							<span className="text-xs text-gray-500">誤検知</span>
						</div>
						<div className="flex flex-col items-center gap-0.5">
							<span className="text-2xl font-bold text-primary">{resident.totalAlerts}</span>
							<span className="text-xs text-gray-500">合計</span>
						</div>
					</div>
				</article>

				{/* デバイス状態 */}
				<DeviceStatusPanel
					deviceName={resident.deviceName}
					deviceId={resident.deviceId}
					batteryLevel={resident.batteryLevel}
					lastSeen={resident.lastSeen}
					status={resident.status}
				/>
			</div>

			{/* Bottom: full-width response history log */}
			<section className="bg-white rounded-xl border border-gray-200 p-6">
				<h3 className="text-h3 font-semibold text-gray-800 mb-4 flex items-center gap-2">
					<FileText className="w-4 h-4 text-primary" />
					対応履歴ログ
					<span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-primary-bg text-primary">
						{resident.logs.length}件
					</span>
				</h3>
				{resident.logs.length === 0 ? (
					<p className="text-sm text-gray-400 text-center py-8">対応履歴はありません</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm table-fixed">
							<colgroup>
								<col className="w-52" />
								<col className="w-52" />
								<col className="w-32" />
								<col className="w-32" />
								<col className="w-36" />
								<col />
							</colgroup>
							<thead>
								<tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wider">
									<th className="pb-3 pr-4 font-medium">発生日時</th>
									<th className="pb-3 pr-4 font-medium">対応日時</th>
									<th className="pb-3 pr-4 font-medium">所要時間</th>
									<th className="pb-3 pr-4 font-medium">転倒判定</th>
									<th className="pb-3 pr-4 font-medium">対応スタッフ</th>
									<th className="pb-3 font-medium">状況メモ</th>
								</tr>
							</thead>
							<tbody>
								{resident.logs.map((entry) => (
									<tr
										key={entry.id}
										className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
									>
										<td className="py-3 pr-6 text-gray-700 whitespace-nowrap">
											{entry.detectedAt}
										</td>
										<td className="py-3 pr-6 text-gray-700 whitespace-nowrap">
											{entry.respondedAt ?? "—"}
										</td>
										<td className="py-3 pr-6 text-gray-600 whitespace-nowrap">
											{entry.responseMinutes != null ? (
												<span className="inline-flex items-center gap-1">
													<Clock className="w-3.5 h-3.5 text-gray-400" />
													{entry.responseMinutes}分
												</span>
											) : (
												"—"
											)}
										</td>
										<td className="py-3 pr-6">
											<FallJudgementBadge isActualFall={entry.isActualFall} />
										</td>
										<td className="py-3 pr-6 text-gray-700 whitespace-nowrap">
											{entry.staffName ?? "—"}
										</td>
										<td className="py-3 text-gray-500 max-w-xs">
											{entry.notes ?? "—"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>
		</>
	);
}
