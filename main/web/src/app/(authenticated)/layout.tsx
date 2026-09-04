import { getMockAlarmData } from "@/features/dashboard/constants/mockDashboardData";
import { Sidebar } from "@/shared/layout/sidebar/Sidebar";
import { TopBarClient } from "@/shared/layout/TopBarClient";

export default function AuthenticatedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const count = getMockAlarmData().count ?? 0;

	return (
		<div className="flex h-screen w-screen overflow-hidden bg-gray-50/60 pb-16 md:pb-0">
			<Sidebar />

			<div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
				<TopBarClient count={count} />

				<main className="flex-1 p-4 md:p-6 overflow-y-auto min-w-0 bg-transparent flex flex-col gap-4 md:gap-5">
					{children}
				</main>
			</div>
		</div>
	);
}
