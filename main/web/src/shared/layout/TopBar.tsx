import { Bell } from "lucide-react";

interface TopBarProps {
	title: string;
	breadcrumb?: string;
}

export function TopBar({ title, breadcrumb }: TopBarProps) {
	const today = new Date().toLocaleDateString("jp", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return (
		<header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
			<h1 className="text-lg font-semibold text-gray-800">
				{breadcrumb ? `${breadcrumb} / ` : ""}
				{title}
			</h1>

			<div className="flex items-center gap-4">
				<span className="text-sm text-gray-500">{today}</span>

				<button
					type="button"
					className="relative p-2 rounded-lg hover:bg-gray-100 transition"
				>
					<Bell className="w-5 h-5 text-gray-600" />

					{/* Notification Badge */}
					<span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
				</button>
			</div>
		</header>
	);
}
