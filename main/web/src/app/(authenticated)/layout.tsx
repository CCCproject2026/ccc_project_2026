import { AlarmBanner } from "@/features/dashboard/components/AlarmBanner";
import {
	getMockAlarmData,
	residents,
} from "@/features/dashboard/constants/mockDashboardData";
import { Sidebar } from "@/shared/layout/sidebar/Sidebar";
import { TopBarClient } from "@/shared/layout/TopBarClient";
import { requireStaffPage } from "@/shared/lib/auth";

export default async function AuthenticatedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// ACTIVE なスタッフ以外は、ここで案内ページへ移動する
	// （各ページでも同じチェックをする。layout だけに頼らない）
	const loginUser = await requireStaffPage();

	const alarmData = getMockAlarmData();
	const count = alarmData.count ?? 0;
	// アラーム中の入居者だけを取り出して、バナーに渡す
	const alarmedResidents = residents.filter((r) => r.variant === "alarm");

	return (
		<div className="flex h-screen w-screen overflow-hidden bg-gray-50/60 pb-16 md:pb-0">
			<Sidebar
				role={loginUser.role}
				lastName={loginUser.lastName}
				firstName={loginUser.firstName}
			/>

			<div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
				<TopBarClient count={count} />

				{/* 緊急アラームバナーは全ページ共通で表示する */}
				{/* main の外に置くことで、ページをスクロールしても常に見える */}
				{count > 0 && (
					<div className="px-4 pt-4 md:px-6 md:pt-6">
						<AlarmBanner
							count={count}
							time={alarmData.time}
							alarmedResidents={alarmedResidents}
						/>
					</div>
				)}

				<main className="flex-1 p-4 md:p-6 overflow-y-auto min-w-0 bg-transparent flex flex-col gap-4 md:gap-5">
					{children}
				</main>
			</div>
		</div>
	);
}
