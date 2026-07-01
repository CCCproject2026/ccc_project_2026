import { StatCard } from "@/shared/ui/StatCard";
import { mockAlarmData } from "../../../app/api/alert/mock";
import { AlarmBanner } from "../components/AlarmBanner";
import { ResidentCard } from "../components/ResidentCard";
import { residents, stats } from "../constants/mockDashboardData";

///api/alert/mock.tsからモックデータを取得する

export async function DashboardPage() {
	const count = mockAlarmData.count ?? 0;
	//const count=0;
	return (
		<div>
			{/* 全体レイアウト間隔は layout 側に寄せるのが理想（ここでは最小限に） */}
			{count > 0 && (
				<AlarmBanner
					count={mockAlarmData.count}
					residentName={mockAlarmData.residentName}
					room={mockAlarmData.room}
					time={mockAlarmData.time}
				/>
			)}

			{/* Stat Cards */}
			<section className="space-y-4">
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
			</section>

			{/* Resident Section */}
			<section>
				<h2 className="mb-4 text-lg font-semibold text-gray-800">
					入居者モニタリング
				</h2>

				{/* semantic: div → ul に変更（一覧構造の明確化） */}
				<ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
					{residents.map((resident) => (
						<li key={resident.name}>
							<ResidentCard {...resident} />
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}
