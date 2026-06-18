// Placeholder BatteryBar component.
// uses shared/tokens/colors, shared/tokens/spacing
export interface BatteryBarProps {
	level?: number;
}

export function BatteryBar({ level = 100 }: BatteryBarProps) {
	return <div aria-label="battery-bar-placeholder">Battery {level}%</div>;
}
