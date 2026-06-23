import { BatteryBar } from "@/shared/ui/BatteryBar";

export interface ResidentCardProps {
	name: string;
	room: string;
	deviceName?: string;
	batteryLevel?: number;
	variant?: "normal" | "alarm";
}

export function ResidentCard({
	name,
	room,
	deviceName,
	batteryLevel = 100,
	variant = "normal",
}: ResidentCardProps) {
	const isAlarm = variant === "alarm";
	return (
		<section
			className={`bg-white rounded-xl border-2 p-4 transition-all
      ${isAlarm ? "border-red-500 bg-red-50 shadow-red-100 shadow-lg" : "border-gray-200"}`}
		>
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm">
						{name.charAt(0)}
					</div>
					<div>
						<p className="font-semibold text-gray-900 text-sm">{name}</p>
						<p className="text-xs text-gray-500">{room}</p>
					</div>
				</div>
				{isAlarm && (
					<span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-md">
						ALERT
					</span>
				)}
			</div>
			{deviceName && <p className="text-xs text-gray-400 mt-2">{deviceName}</p>}
			<div className="mt-3">
				<BatteryBar level={batteryLevel} />
			</div>
		</section>
	);
}
