// Placeholder StatCard component.
// uses shared/tokens/colors, shared/tokens/typography, shared/tokens/spacing
export interface StatCardProps {
	title?: string;
	value?: string;
}

export function StatCard({ title, value }: StatCardProps) {
	return (
		<article>
			<h3>{title}</h3>
			<p>{value}</p>
		</article>
	);
}
