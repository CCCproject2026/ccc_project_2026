import { Bell } from "lucide-react";

interface TopBarProps {
	title: string;
	breadcrumb: string;
	dateLabel?: string;
	showNotification?: boolean;
	notificationCount?: number;
}

export function TopBar({
	title,
	breadcrumb,
	dateLabel,
	showNotification,
	notificationCount,
}: TopBarProps) {
	return (
		<header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
			<h1 className="text-lg font-semibold text-gray-800">
				{breadcrumb ? `${breadcrumb} / ` : ""}
				{title}
			</h1>

			<div className="flex items-center gap-4">
				{dateLabel && (
					<span className="text-sm text-gray-500">{dateLabel}</span>
				)}

				{showNotification && (
					<button
						type="button"
						className="relative p-2 rounded-lg hover:bg-gray-100 transition"
					>
						<Bell className="w-5 h-5 text-gray-600" />
						{notificationCount && notificationCount > 0 && (
							<span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center text-[10px] bg-red-500 text-white rounded-full">
								{notificationCount > 99 ? "99+" : notificationCount}
							</span>
						)}
					</button>
				)}
			</div>
		</header>
	);
}
