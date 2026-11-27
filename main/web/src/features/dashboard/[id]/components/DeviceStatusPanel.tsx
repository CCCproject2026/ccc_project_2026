import { Cpu } from "lucide-react";

// 高齢者に割り当てているデバイスの表示
// バッテリー残量・最終通信は、まだ機器から Web に届く仕組みが無い（未連携）。
// 値を作って表示せず「未連携」と出す（届かないことを「正常」に見せない）。
export interface DeviceStatusPanelProps {
	device: {
		deviceCode: string;
		deviceName: string;
		status: "ACTIVE" | "INACTIVE";
	} | null;
}

export function DeviceStatusPanel({ device }: DeviceStatusPanelProps) {
	return (
		<article className="bg-white rounded-xl border border-gray-200 p-6">
			<h2 className="text-h3 font-semibold text-gray-800 mb-4 flex items-center gap-2">
				<Cpu aria-hidden="true" className="w-4 h-4 text-primary" />
				デバイス状態
			</h2>

			{device === null ? (
				<p className="text-sm text-gray-400 text-center py-8">デバイス未割当</p>
			) : (
				<>
					<div className="bg-primary-bg/60 rounded-lg px-4 py-3 mb-5">
						<p className="font-semibold text-primary-dark font-mono">
							{device.deviceCode}
						</p>
						<p className="text-xs text-gray-500 mt-0.5">{device.deviceName}</p>
					</div>

					<div className="text-sm space-y-2.5 border-t border-gray-100 pt-4">
						<div className="flex justify-between">
							<span className="text-gray-500">バッテリー残量</span>
							<span className="text-gray-400">未連携</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-500">最終通信</span>
							<span className="text-gray-400">未連携</span>
						</div>
						<div className="flex justify-between items-center">
							{/* 登録上の利用状態。通信できているか（オンライン）とは別 */}
							<span className="text-gray-500">利用状態</span>
							<span
								className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
									device.status === "ACTIVE"
										? "bg-online-bg text-online"
										: "bg-gray-100 text-gray-500"
								}`}
							>
								{device.status === "ACTIVE" ? "有効" : "停止中"}
							</span>
						</div>
					</div>
				</>
			)}
		</article>
	);
}
