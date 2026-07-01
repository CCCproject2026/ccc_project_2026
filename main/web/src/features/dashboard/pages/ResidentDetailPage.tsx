import { AlertTriangle, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/shared/ui/StatCard";
import { ResidentInfoPanel } from "../components/ResidentInfoPanel";
import {
	type ResponseHistoryEntry,
	ResponseHistoryTable,
} from "../components/ResponseHistoryTable";

interface MockResident {
	id: string;
	name: string;
	roomNumber: string;
	age: number;
	deviceName?: string;
	batteryLevel?: number;
	status: "active" | "inactive";
	fallRiskLevel: "low" | "medium" | "high";
	totalFalls: number;
	falseDetections: number;
	totalAlerts: number;
	logs: ResponseHistoryEntry[];
}

const MOCK_RESIDENTS: Record<string, MockResident> = {
	"1": {
		id: "1",
		name: "田中 一郎",
		roomNumber: "301号室",
		age: 85,
		deviceName: "ESP32-101",
		batteryLevel: 87,
		status: "active",
		fallRiskLevel: "medium",
		totalFalls: 1,
		falseDetections: 2,
		totalAlerts: 3,
		logs: [
			{
				id: "log-1",
				detectedAt: "2026/06/17 21:40",
				staffName: "山田 花子",
				isActualFall: true,
				notes: "ベッド横で転倒を確認。骨折の疑いがないためお声がけして復帰。",
			},
			{
				id: "log-2",
				detectedAt: "2026/06/15 14:05",
				staffName: "佐藤 太郎",
				isActualFall: false,
				notes: "センサーが寝返りの衝撃を誤検知。ご本人は安眠中。",
			},
			{
				id: "log-3",
				detectedAt: "2026/06/12 09:30",
				staffName: null,
				isActualFall: null,
				notes: null,
			},
		],
	},
	"2": {
		id: "2",
		name: "鈴木 みやこ",
		roomNumber: "302号室",
		age: 78,
		deviceName: "ESP32-102",
		batteryLevel: 42,
		status: "active",
		fallRiskLevel: "low",
		totalFalls: 0,
		falseDetections: 1,
		totalAlerts: 1,
		logs: [
			{
				id: "log-4",
				detectedAt: "2026/06/18 08:15",
				staffName: null,
				isActualFall: null,
				notes: null,
			},
		],
	},
	"3": {
		id: "3",
		name: "小林 健二",
		roomNumber: "305号室",
		age: 91,
		deviceName: "ESP32-103",
		batteryLevel: 15,
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
		age: 82,
		status: "active",
		fallRiskLevel: "low",
		totalFalls: 0,
		falseDetections: 0,
		totalAlerts: 0,
		logs: [],
	},
};

export function ResidentDetailPage({ id }: { id: string }) {
	const resident = MOCK_RESIDENTS[id] ?? MOCK_RESIDENTS["1"];

	const hasActiveAlarm = resident.logs.some((log) => log.isActualFall === null);

	return (
		<>
			{hasActiveAlarm && (
				<div className="mb-6 bg-alarm-bg border border-border-alarm rounded-xl p-4 flex items-center gap-3">
					<AlertTriangle className="w-5 h-5 text-alarm shrink-0" />
					<div>
						<p className="text-sm font-semibold text-alarm">
							未対応のアラームがあります
						</p>
						<p className="text-xs text-alarm/80 mt-0.5">
							直ちに現場確認してください
						</p>
					</div>
				</div>
			)}

			<div className="mb-4">
				<Link
					href="/dashboard"
					className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
				>
					<ChevronLeft className="w-4 h-4" />
					ダッシュボードに戻る
				</Link>
			</div>

			<div className="grid grid-cols-3 gap-6 mb-6">
				<div className="col-span-1">
					<ResidentInfoPanel
						name={resident.name}
						roomNumber={resident.roomNumber}
						age={resident.age}
						deviceName={resident.deviceName}
						batteryLevel={resident.batteryLevel}
						status={resident.status}
						fallRiskLevel={resident.fallRiskLevel}
					/>
				</div>
				<div className="col-span-2 space-y-4">
					<div className="grid grid-cols-3 gap-4">
						<StatCard
							title="今週の転倒数"
							value={resident.totalFalls}
							icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
							color="text-red-600"
						/>
						<StatCard
							title="誤検知"
							value={resident.falseDetections}
							icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />}
							color="text-yellow-600"
						/>
						<StatCard
							title="合計アラーム"
							value={resident.totalAlerts}
							icon={<AlertTriangle className="w-5 h-5 text-violet-500" />}
							color="text-violet-600"
						/>
					</div>
					<ResponseHistoryTable entries={resident.logs} />
				</div>
			</div>
		</>
	);
}
