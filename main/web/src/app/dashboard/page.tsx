import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { Sidebar } from "@/shared/layout/sidebar/Sidebar";
import { TopBar } from "@/shared/layout/TopBar";

export default function DashboardRoute() {
	return (
		<div className="flex h-screen">
			<Sidebar />
			<div className="flex-1 flex flex-col overflow-hidden">
				<TopBar title="リアルタイムモニタリング" breadcrumb="ダッシュボード " />
				<main className="flex-1 bg-gray-50 p-6 overflow-auto">
					<DashboardPage />
				</main>
			</div>
		</div>
	);
}
