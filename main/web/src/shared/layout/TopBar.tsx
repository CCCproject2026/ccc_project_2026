interface TopBarProps {
	title: string;
	breadcrumb?: string;
}

export function TopBar({ title, breadcrumb }: TopBarProps) {
	return (
		<header className="h-14 bg-white border-b border-gray-200 flex items-center px-6">
			<h1 className="text-lg font-semibold text-gray-800">
				{breadcrumb ? `${breadcrumb} / ` : ""}
				{title}
			</h1>
		</header>
	);
}
