import { ResidentDetailPage } from "@/features/dashboard/[id]/pages/ResidentDetailPage";
import { Sidebar } from "@/shared/layout/sidebar/Sidebar";
import { TopBar } from "@/shared/layout/TopBar";

export default async function ResidentDetailRoute({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	return (
		<div className="flex h-screen">
			<Sidebar />
			<div className="flex-1 flex flex-col overflow-hidden">
				<TopBar
					title={`山田 太郎`}
					breadcrumb={["ダッシュボード", "入所者一覧"]}
					notificationCount={1}
				/>
				<main className="flex-1 bg-gray-50 p-6 overflow-auto">
					<ResidentDetailPage id={id} />
				</main>
			</div>
		</div>
	);
}
