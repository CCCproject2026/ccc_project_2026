"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

interface TopBarProps {
	title: string;
	/** Pass a string for a single prefix, or an array for multi-level breadcrumbs */
	breadcrumb?: string | string[];
	/** Number of unread notifications to show on the bell badge */
	notificationCount?: number;
}

function FormattedDate() {
	const [label, setLabel] = useState("");
	useEffect(() => {
		const d = new Date();
		const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
		const y = d.getFullYear();
		const m = d.getMonth() + 1;
		const day = d.getDate();
		const w = weekdays[d.getDay()];
		setLabel(`${y}年${m}月${day}日（${w}）`);
	}, []);
	return (
		<span className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">
			{label}
		</span>
	);
}

export function TopBar({ title, breadcrumb, notificationCount }: TopBarProps) {
	const crumbs = Array.isArray(breadcrumb)
		? breadcrumb
		: breadcrumb
			? [breadcrumb]
			: [];
	return (
		<header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
			<h1 className="text-sm font-medium text-gray-700 flex items-center gap-1">
				{crumbs.map((crumb, i) => (
					<span key={crumb} className="flex items-center gap-1">
						<span className="text-gray-500">{crumb}</span>
						<span className="text-gray-400 mx-0.5">›</span>
					</span>
				))}
				<span className="text-gray-800 font-semibold">{title}</span>
			</h1>
			<div className="flex items-center gap-3">
				<div className="relative">
					<button
						type="button"
						aria-label="通知"
						className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
					>
						<Bell className="w-4 h-4" />
					</button>
					{notificationCount != null && notificationCount > 0 && (
						<span className="absolute -top-1 -right-1 w-4 h-4 bg-alarm text-white text-[10px] font-bold rounded-full flex items-center justify-center">
							{notificationCount}
						</span>
					)}
				</div>
				<FormattedDate />
			</div>
		</header>
	);
}
