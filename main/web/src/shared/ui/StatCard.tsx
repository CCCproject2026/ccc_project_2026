// Placeholder StatCard component.
// uses shared/tokens/colors, shared/tokens/typography, shared/tokens/spacing
import { Icon, LucideIcon } from "lucide-react";

interface StatCardProps {
	title: string;
	value: number;
	icon: LucideIcon;
	color: string;
	description: string;
}

export function StatCard({
	title,
	value,
	icon,
	color = "text-gray-900",
	description,
}: StatCardProps) {
	const Icon=icon;
	return (
		<article className="bg-white rounded-xl border border-gray-200 p-5">
			<div className="flex items-center justify-between">
				<p className="text-sm text-gray-500">{title}</p>
				<Icon className={`w-6 h-6 ${color}`}/>
			</div>
			<p className={`text-2xl font-bold mt-2 ${color}`}>{value}</p>

			<p className="text-sm text-gray-500 mt-2">{description}</p>
		</article>
	);
}
