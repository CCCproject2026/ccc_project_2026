import { AlertTriangle, Cpu, UserCheck, Users } from "lucide-react";
import { StatCard } from "@/shared/ui/StatCard";
import { mockAlarmData } from "../../../app/api/alert/mock";
import { AlarmBanner } from "../components/AlarmBanner";
import { ResidentCard } from "../components/ResidentCard";
///api/alert/mock.tsからモックデータを取得する

export async function DashboardPage() {
	// TODO: Replace with real data from Prisma/API
	const stats = [
		{
			title: "入居者数",
			value: 12,
			icon: <Users className="h-5 w-5 text-green-500" />,
			color: "text-green-600",
			describe: "入居者の総数を表示します。",
		},
		{
			title: "稼働デバイス",
			value: 8,
			icon: <Cpu className="h-5 w-5 text-violet-500" />,
			color: "text-violet-600",
			describe: "現在稼働中のデバイスの数を表示します。",
		},
		{
			title: "本日のアラート",
			value: 3,
			icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
			color: "text-red-600",
			describe: "本日発生したアラートの総数を表示します。",
		},
		{
			title: "オンラインスタッフ",
			value: 5,
			icon: <UserCheck className="h-5 w-5 text-blue-500" />,
			color: "text-blue-600",
			describe: "現在オンラインのスタッフの数を表示します。",
		},
	];

	const residents = [
		{
			name: "山田 太郎",
			age: 91,
			room: "101号室",
			deviceName: "ESP32-101",
			batteryLevel: 87,
			falls: 0,
			falseAlarms: 2,
			totalAlarms: 2,
			variant: "normal" as const,
		},
		{
			name: "中村 きみ",
			age: 87,
			room: "102号室",
			deviceName: "ESP32-102",
			batteryLevel: 18,
			falls: 1,
			falseAlarms: 0,
			totalAlarms: 1,
			variant: "alarm" as const,
		},
		{
			name: "伊藤 茂",
			age: 89,
			room: "203号室",
			deviceName: "ESP32-203",
			batteryLevel: 65,
			falls: 0,
			falseAlarms: 1,
			totalAlarms: 1,
			variant: "normal" as const,
		},
	];

	return (
		<div className="space-y-6">
			<AlarmBanner
				count={mockAlarmData.count}
				residentName={mockAlarmData.residentName}
				room={mockAlarmData.room}
				time={mockAlarmData.time}
			/>

			{/* Stat Cards */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
				{stats.map((stat) => (
					<StatCard
						key={stat.title}
						title={stat.title}
						value={stat.value}
						icon={stat.icon}
						color={stat.color}
						description={stat.describe}
					/>
				))}
			</div>

			{/* Resident Section */}
			<div>
				<h2 className="mb-4 text-lg font-semibold text-gray-800">
					入居者モニタリング
				</h2>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
					{residents.map((resident) => (
						<ResidentCard key={resident.name} {...resident} />
					))}
				</div>
			</div>
		</div>
	);
}
