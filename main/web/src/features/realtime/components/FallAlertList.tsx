"use client";

// 未対応アラートの一覧（詳細設計 web/03 の8章の文言）
// AI の結果は転倒の「可能性」。ここでは表示だけで、対応記録やアラーム音は #246 で扱う。
// 受信した文字列は React のテキストとして出し、HTML として表示しない。
import { AlertTriangle } from "lucide-react";
import { useFallReceiverContext } from "./FallReceiverProvider";
import { formatClockTime } from "./time-format";

export function FallAlertList() {
	const { state } = useFallReceiverContext();
	if (state.alerts.length === 0) return null;

	return (
		<section
			aria-label="転倒の可能性（未対応）"
			className="rounded-2xl border border-red-200 bg-red-50/80 p-4"
		>
			<h2 className="mb-2 flex items-center gap-2 text-base font-black text-red-700">
				<AlertTriangle aria-hidden="true" className="h-5 w-5" />
				転倒の可能性 {state.alerts.length}件（未対応）
			</h2>
			<ul className="flex flex-col gap-2">
				{state.alerts.map((alert) => (
					<li
						key={alert.alertId}
						className="rounded-xl bg-white p-3 text-sm text-gray-700"
					>
						<p className="font-bold text-gray-900">
							{alert.elder === null
								? `未割当の機器（${alert.deviceCode}）`
								: `${alert.elder.name}（${alert.elder.room}）`}
							{alert.late && (
								<span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800">
									遅れて届いた
								</span>
							)}
						</p>
						<p>
							検知: {formatClockTime(alert.firstDetectedAt)}
							{alert.fallCount > 1 &&
								` 〜 ${formatClockTime(alert.lastDetectedAt)}（${alert.fallCount}件）`}
							<span className="ml-2 text-gray-400">
								機器 {alert.deviceCode}
							</span>
						</p>
					</li>
				))}
			</ul>
		</section>
	);
}
