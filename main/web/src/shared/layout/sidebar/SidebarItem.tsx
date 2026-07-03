"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface SidebarItemProps {
	icon: ReactNode;
	label: string;
	href: string;
	active?: boolean;
}

export function SidebarItem({ icon, label, href, active }: SidebarItemProps) {
	const pathname = usePathname();
	const isActive = pathname === href;
	return (
		<Link
			href={href}
			className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
				isActive || active
					? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
					: "text-slate-300 hover:bg-slate-800"
			}`}
		>
			{icon}
			<span>{label}</span>
		</Link>
	);
}
