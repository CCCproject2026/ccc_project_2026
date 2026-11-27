import { dashboardPageNumber } from "@/features/dashboard/lib/resident-profile";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { FallAlertList } from "@/features/realtime/components/FallAlertList";
import { FallReceiverProvider } from "@/features/realtime/components/FallReceiverProvider";
import { ReceiverStatus } from "@/features/realtime/components/ReceiverStatus";
import { getDeviceDirectory } from "@/features/realtime/server/device-directory";

export default async function DashboardRoute({
	searchParams,
}: {
	searchParams: Promise<{ page?: string | string[] }>;
}) {
	const { page } = await searchParams;
	// 機器 → 利用者の一覧。ブラウザで受けた AI の判定結果から利用者を探すのに使う
	const directory = await getDeviceDirectory();
	return (
		<FallReceiverProvider directory={directory}>
			<div className="flex flex-col gap-4 max-w-[1600px] mx-auto w-full">
				{/* AI の判定結果の受信状態と、転倒の可能性（未対応）の一覧 */}
				<ReceiverStatus />
				<FallAlertList />
			</div>
			{/* 統計カードや入居者一覧カードが入ったメインコンテンツ */}
			<DashboardPage page={dashboardPageNumber(page)} />
		</FallReceiverProvider>
	);
}
