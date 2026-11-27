import { Cpu } from "lucide-react";
import { BatteryBar } from "@/shared/ui/BatteryBar";

export interface DeviceStatusPanelProps {
	deviceName?: string;
	deviceId?: string;
	batteryLevel?: number;
	lastSeen?: string;
	status: "active" | "inactive";
}

export function DeviceStatusPanel({
	deviceName,
	deviceId,
	batteryLevel,
	lastSeen,
	status,
}: DeviceStatusPanelProps) {
	const isOnline = status === "active";

	if (!deviceName) {
		return (
			<article className="bg-white rounded-xl border border-gray-200 p-6">
				<h2 className="text-h3 font-semibold text-gray-800 mb-4 flex items-center gap-2">
					<Cpu className="w-4 h-4 text-primary" />
					デバイス状態
				</h2>
				<p className="text-sm text-gray-400 text-center py-8">デバイス未割当</p>
			</article>
		);
	}

	return (
		<article className="bg-white rounded-xl border border-gray-200 p-6">
			<h2 className="text-h3 font-semibold text-gray-800 mb-4 flex items-center gap-2">
				<Cpu className="w-4 h-4 text-primary" />
				デバイス状態
			</h2>

			{/* Device name block */}
			<div className="bg-gray-50 rounded-lg px-4 py-3 mb-5">
				<p className="font-semibold text-gray-900 font-mono">{deviceName}</p>
				{deviceId && (
					<p className="text-xs text-gray-400 mt-0.5">ID: {deviceId}</p>
				)}
			</div>

			{/* Battery */}
			<div className="mb-4">
				<div className="flex items-center justify-between mb-1.5">
					<span className="text-sm text-gray-600 flex items-center gap-1.5">
						{/* battery icon */}
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							className="text-green-600"
							aria-hidden="true"
						>
							<rect
								x="1"
								y="4"
								width="12"
								height="8"
								rx="1.5"
								stroke="currentColor"
								strokeWidth="1.2"
							/>
							<rect
								x="13"
								y="6.5"
								width="2"
								height="3"
								rx="0.5"
								fill="currentColor"
							/>
							<rect
								x="2.5"
								y="5.5"
								width={`${((batteryLevel ?? 0) / 100) * 9}`}
								height="5"
								rx="0.5"
								fill="currentColor"
							/>
						</svg>
						バッテリー残量
					</span>
					<span
						className={`text-sm font-bold ${
							(batteryLevel ?? 0) > 50
								? "text-green-600"
								: (batteryLevel ?? 0) > 20
									? "text-yellow-600"
									: "text-red-600"
						}`}
					>
						{batteryLevel ?? 0}%
					</span>
				</div>
				<BatteryBar level={batteryLevel} />
			</div>

			{/* Meta rows */}
			<div className="text-sm space-y-2.5 border-t border-gray-100 pt-4">
				<div className="flex justify-between">
					<span className="text-gray-500">最終通信</span>
					<span className="text-gray-800 font-medium">{lastSeen ?? "—"}</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="text-gray-500">ステータス</span>
					<span
						className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
							isOnline
								? "bg-online-bg text-online"
								: "bg-gray-100 text-gray-500"
						}`}
					>
						{isOnline ? "オンライン" : "オフライン"}
					</span>
				</div>
			</div>
		</article>
	);
}
