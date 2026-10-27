// 相対パス「../../../app/api/alert/mock」からエイリアス表記に変更
import Link from "next/link";
import { ResidentCard } from "@/features/dashboard/components/ResidentCard";
import {
	residents,
	stats,
} from "@/features/dashboard/constants/mockDashboardData";
import { StatCard } from "@/shared/ui/StatCard";

///api/alert/mock.tsからモックデータを取得する

export async function DashboardPage() {
	return (
		<div className="flex flex-col gap-6 pb-6 max-w-[1600px] mx-auto w-full">
			{/* 緊急アラームバナーは (authenticated)/layout.tsx で全ページ共通に表示している */}

			{/* Stat Cards */}
			<section className="w-full">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					{stats.map((stat) => (
						<StatCard
							key={stat.title}
							title={stat.title}
							value={stat.value}
							icon={stat.icon}
							color={stat.color}
							description={stat.description}
						/>
					))}
				</div>
			</section>

			{/* Resident Section */}
			<section className="flex flex-col gap-4 w-full">
				<div className="flex items-end justify-between px-1">
					<h2 className="text-xl font-bold text-gray-800">入居者一覧</h2>
					<span className="text-xs text-gray-400 font-medium">
						{residents.length}名
					</span>
				</div>

				{/* semantic: div → ul に変更（一覧構造の明確化） */}
				<ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
					{residents.map((resident) => (
						<li key={resident.id} className="min-w-0 w-full">
							{/* 3. Wrap the card with Link using the dynamic ID path */}
							<Link
								href={`/dashboard/${resident.id}`}
								className="block transition-transform hover:scale-[1.01] active:scale-[0.99]"
							>
								<ResidentCard {...resident} />
							</Link>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}
