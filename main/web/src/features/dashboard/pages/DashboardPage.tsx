// 相対パス「../../../app/api/alert/mock」からエイリアス表記に変更
import Link from "next/link";
import { AlarmBanner } from "@/features/dashboard/components/AlarmBanner";
import { ResidentCard } from "@/features/dashboard/components/ResidentCard";
import {
	getMockAlarmData,
	residents as mockResidents,
	stats as mockStats,
} from "@/features/dashboard/constants/mockDashboardData";
import { StatCard } from "@/shared/ui/StatCard";
import { residentAge } from "@/features/dashboard/lib/resident-profile";
import { getDashboardPeople } from "@/features/dashboard/server/dashboard-service";

///api/alert/mock.tsからモックデータを取得する

export async function DashboardPage({ page = 1 }: { page?: number }) {
	const data = await getDashboardPeople(page);
	const residents = data.residents.map((resident) => ({
		id: resident.id,
		name: `${resident.lastName} ${resident.firstName}`.trim() || "氏名未登録",
		age: residentAge(resident.dateOfBirth),
		room: resident.roomNumber || "居室未登録",
	}));
	// デバイス・アラームは CCC-248 の対象外。人数だけを DB の意味に合わせる。
	const stats = mockStats.map((stat) => {
		if (stat.title === "入居者数") return { ...stat, value: data.residentCount, description: "在籍中の入居者" };
		if (stat.title === "オンラインスタッフ") return { ...stat, title: "有効スタッフ数", value: data.staffCount, description: "利用可能なスタッフ（招待中・停止中を除く）" };
		return stat;
	});
	// variant が "alarm" の住民をリスト化して直接渡す
	const alarmedResidents = mockResidents.filter((r) => r.variant === "alarm");
	const alarmData = getMockAlarmData();
	const count = alarmData.count ?? 0;
	return (
		<div className="flex flex-col gap-6 pb-6 max-w-[1600px] mx-auto w-full">
			{/* 全体レイアウト間隔は layout 側に寄せるのが理想（ここでは最小限に） */}
			{count > 0 && (
				<AlarmBanner
					count={alarmData.count}
					time={alarmData.time}
					alarmedResidents={alarmedResidents} // 配列をまるごと渡す！
				/>
			)}

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
						{data.residentCount}名
					</span>
				</div>

				{residents.length === 0 && <p className="rounded-xl bg-white p-6 text-gray-500">在籍中の入居者はいません。</p>}
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
				{data.pageCount > 1 && (
					<nav aria-label="入居者一覧のページ" className="flex items-center justify-center gap-4 text-sm">
						{data.page > 1 && <Link href={`/dashboard?page=${data.page - 1}`}>前へ</Link>}
						<span>{data.page} / {data.pageCount}</span>
						{data.page < data.pageCount && <Link href={`/dashboard?page=${data.page + 1}`}>次へ</Link>}
					</nav>
				)}
			</section>
		</div>
	);
}
