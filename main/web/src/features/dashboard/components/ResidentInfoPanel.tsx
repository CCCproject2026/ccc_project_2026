import { BatteryBar } from "@/shared/ui/BatteryBar";

export interface ResidentInfoPanelProps {
	name: string;
	roomNumber: string;
	age: number;
	deviceName?: string;
	batteryLevel?: number;
	status: "active" | "inactive";
	fallRiskLevel?: "low" | "medium" | "high";
}

const riskLabel: Record<string, string> = {
	low: "低",
	medium: "中",
	high: "高",
};

const riskColor: Record<string, string> = {
	low: "bg-green-100 text-green-700",
	medium: "bg-yellow-100 text-yellow-700",
	high: "bg-red-100 text-red-700",
};

export function ResidentInfoPanel({
	name,
	roomNumber,
	age,
	deviceName,
	batteryLevel,
	status,
	fallRiskLevel,
}: ResidentInfoPanelProps) {
	const initial = name.charAt(0);
	const isActive = status === "active";

	return (
		<article className="bg-white rounded-xl border border-gray-200 p-6">
			<div className="flex items-start gap-4">
				<div className="w-14 h-14 rounded-full bg-primary-bg flex items-center justify-center text-primary-dark font-bold text-xl shrink-0">
					{initial}
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-3 flex-wrap">
						<h2 className="text-h2 font-semibold text-gray-900">{name}</h2>
						<span
							className={`px-2 py-0.5 text-xs font-medium rounded-full ${
								isActive
									? "bg-online-bg text-online"
									: "bg-gray-100 text-gray-500"
							}`}
						>
							{isActive ? "在籍中" : "退所"}
						</span>
						{fallRiskLevel && (
							<span
								className={`px-2 py-0.5 text-xs font-medium rounded-full ${riskColor[fallRiskLevel]}`}
							>
								転倒リスク: {riskLabel[fallRiskLevel]}
							</span>
						)}
					</div>
					<div className="mt-2 text-sm text-gray-500 space-y-1">
						<p>{roomNumber}</p>
						<p>{age}歳</p>
					</div>
				</div>
			</div>

			{deviceName && (
				<div className="mt-5 pt-5 border-t border-gray-100">
					<p className="text-sm font-medium text-gray-700 mb-2">割当デバイス</p>
					<div className="flex items-center justify-between">
						<p className="text-sm text-gray-600 font-mono">{deviceName}</p>
						<span className="text-xs text-online bg-online-bg px-2 py-0.5 rounded-full font-medium">
							オンライン
						</span>
					</div>
					<div className="mt-3">
						<BatteryBar level={batteryLevel} />
					</div>
				</div>
			)}

			{!deviceName && (
				<div className="mt-5 pt-5 border-t border-gray-100">
					<p className="text-sm text-gray-400">デバイス未割当</p>
				</div>
			)}
		</article>
	);
}
