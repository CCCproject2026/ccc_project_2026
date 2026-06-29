// Alarm banner placeholder.
// uses shared/ui/Badge, shared/tokens/colors, shared/tokens/spacing

import { AlertTriangle, Icon } from "lucide-react";

interface AlarmBannerProps {
	count?: number;
	residentName?: string;
	room?: string;
	time?: string;
	onRespond?: () => void;
}

export function AlarmBanner(alarmBannerProps: AlarmBannerProps) {
	return (
		//レビューにより mb-6を消しました  <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6">
		<section className="rounded-2xl border border-red-200 bg-red-50 p-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
						<AlertTriangle className="h-6 w-6 text-red-500" />
					</div>

					<div>
						<h3 className="text-lg font-semibold text-red-600">
							未対応のアラームがあります（{alarmBannerProps.count}件）
						</h3>

						<p className="mt-1 text-sm text-gray-600">
							{alarmBannerProps.residentName}（{alarmBannerProps.room}） 検知時刻: {alarmBannerProps.time}
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={alarmBannerProps.onRespond}
					className="rounded-xl bg-red-500 px-5 py-3 font-medium text-white transition hover:bg-red-600"
				>
					対応する 
				</button>
			</div>
		</section>
	);
}
