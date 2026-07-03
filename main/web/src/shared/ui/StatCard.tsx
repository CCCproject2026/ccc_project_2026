// Placeholder StatCard component.
// uses shared/tokens/colors, shared/tokens/typography, shared/tokens/spacing
export interface StatCardProps {
	title: string;
	value: string | number;
	icon?: React.ReactNode;
	color?: string; // tailwind text color class
}

export function StatCard({
	title,
	value,
	icon,
	color = "text-gray-900",
}: StatCardProps) {
	return (
		<article className="bg-white rounded-xl border border-gray-200 p-5">
			<div className="flex items-center justify-between">
				<p className="text-sm text-gray-500">{title}</p>
				{icon}
			</div>
			<p className={`text-2xl font-bold mt-2 ${color}`}>{value}</p>
		</article>
	);
}
