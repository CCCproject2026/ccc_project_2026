// Placeholder BatteryBar component.
// uses shared/tokens/colors, shared/tokens/spacing
export interface BatteryBarProps {
	level?: number;
}

export function BatteryBar({ level = 100 }: BatteryBarProps) {
	const color =
		level > 50 ? "bg-green-500" : level > 20 ? "bg-yellow-500" : "bg-red-500";
	return (
		<div className="flex items-center gap-2">
			<div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
				<div
					className={`h-full rounded-full ${color}`}
					style={{ width: `${level}%` }}
				/>
			</div>
			<span className="text-xs text-gray-500 w-8 text-right">{level}%</span>
		</div>
	);
}
