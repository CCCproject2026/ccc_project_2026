import { AlertTriangle, Cpu, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { ResidentCard } from "@/shared/ui/ResidentCard";
import { StatCard } from "@/shared/ui/StatCard";
import { Sidebar } from "@/shared/layout/sidebar/Sidebar";
import { TopBar } from "@/shared/layout/TopBar";

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
		id: "1",
		name: "田中 一郎",
		room: "301号室",
		deviceName: "ESP32-101",
		batteryLevel: 85,
		variant: "normal" as const,
	},
	{
		id: "2",
		name: "鈴木 みやこ",
		room: "302号室",
		deviceName: "ESP32-102",
		batteryLevel: 72,
		variant: "normal" as const,
	},
	{
		id: "3",
		name: "小林 健二",
		room: "305号室",
		deviceName: "ESP32-103",
		batteryLevel: 15,
		variant: "alarm" as const,
	},
	{
		id: "4",
		name: "渡辺 恵子",
		room: "308号室",
		deviceName: undefined,
		batteryLevel: undefined,
		variant: "normal" as const,
	},
];

export default function DashboardRoute() {
	return (
		<div className="flex h-screen">
			<Sidebar />
			<div className="flex-1 flex flex-col overflow-hidden">
				<TopBar title="リアルタイムモニタリング" breadcrumb="ダッシュボード " />
				<main className="flex-1 bg-gray-50 p-6 overflow-auto">
					<div className="grid grid-cols-4 gap-4 mb-6">
						{stats.map((s) => (
							<StatCard key={s.title} {...s} />
						))}
					</div>

					<h2 className="text-lg font-semibold text-gray-800 mb-3">
						入居者モニタリング
					</h2>
					<div className="grid grid-cols-3 gap-4">
						{residents.map((r) => (
							<Link key={r.id} href={`/dashboard/${r.id}`}>
								<ResidentCard
									name={r.name}
									room={r.room}
									deviceName={r.deviceName}
									batteryLevel={r.batteryLevel}
									variant={r.variant}
								/>
							</Link>
						))}
					</div>
				</main>
			</div>
		</div>
	);
}
