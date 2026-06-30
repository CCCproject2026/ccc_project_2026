// Dashboard page shell.
// uses shared/ui/StatCard, shared/ui/Table, shared/tokens/colors

import { AlertTriangle, Cpu, UserCheck, Users } from "lucide-react";
import { StatCard } from "@/shared/ui/StatCard";
import { ResidentCard } from "../components/ResidentCard";

export function DashboardPage() {
	// TODO: Replace with real data from Prisma/API
	const stats = [
		{
			title: "入居者数",
			value: 12,
			icon: <Users className="w-5 h-5 text-green-500" />,
			color: "text-green-600",
		},
		{
			title: "稼働デバイス",
			value: 8,
			icon: <Cpu className="w-5 h-5 text-violet-500" />,
			color: "text-violet-600",
		},
		{
			title: "本日のアラート",
			value: 3,
			icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
			color: "text-red-600",
		},
		{
			title: "オンラインスタッフ",
			value: 5,
			icon: <UserCheck className="w-5 h-5 text-blue-500" />,
			color: "text-blue-600",
		},
	];

	const residents = [
		{
			name: "部屋 1",
			room: "部屋 101",
			batteryLevel: 85,
			variant: "normal" as const,
		},
		{
			name: "部屋 2",
			room: "部屋 102",
			batteryLevel: 72,
			variant: "normal" as const,
		},
		{
			name: "部屋 3",
			room: "部屋 103",
			batteryLevel: 15,
			variant: "alarm" as const,
		},
		// ... more
	];

	return (
		<>
			{/* Stat cards row */}
			<div className="grid grid-cols-4 gap-4 mb-6">
				{stats.map((s) => (
					<StatCard key={s.title} {...s} />
				))}
			</div>

			{/* Resident grid */}
			<h2 className="text-lg font-semibold text-gray-800 mb-3">
				入居者モニタリング
			</h2>
			<div className="grid grid-cols-3 gap-4">
				{residents.map((r) => (
					<ResidentCard key={r.name} {...r} />
				))}
			</div>
		</>
	);
}
