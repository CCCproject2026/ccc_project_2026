import { StaffManagementPage } from "@/features/staff-management/pages/StaffManagementPage";
import { Sidebar } from "@/shared/layout/sidebar/Sidebar";

export const dynamic = "force-dynamic";

export default function StaffPage() {
	return (
		<div className="flex h-screen">
			<Sidebar />
			<main className="flex-1 bg-surface p-6 overflow-auto">
				<StaffManagementPage />
			</main>
		</div>
	);
}
