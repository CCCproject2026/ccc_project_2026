"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useSidebar } from "./SidebarContext";

interface SidebarItemProps {
	icon: ReactNode;
	label: string;
	href: string;
}

export function SidebarItem({ icon, label, href }: SidebarItemProps) {
	const pathname = usePathname();
	const { isCollapsed, closeMobile } = useSidebar();
	// 子ページ（例: /staff/invitations）を開いているときも、親のメニューを選択中にする
	const isActive = pathname === href || pathname.startsWith(`${href}/`);

	// アイコンだけの表示では、文字を隠してアイコンを中央に寄せる
	// 文字が見えないので、マウスを乗せたときに title で名前を出す
	let layoutClass = "";
	let labelClass = "";
	let title: string | undefined;
	if (isCollapsed) {
		layoutClass = "lg:justify-center lg:px-0";
		labelClass = "lg:hidden";
		title = label;
	}

	return (
		<Link
			href={href}
			onClick={closeMobile}
			aria-label={label}
			title={title}
			className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${layoutClass} ${
				isActive
					? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
					: "text-slate-300 hover:bg-slate-800"
			}`}
		>
			{icon}
			<span className={labelClass}>{label}</span>
		</Link>
	);
}
