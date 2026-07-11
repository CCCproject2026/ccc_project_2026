import { DeviceManagementPage } from "@/features/device-management/pages/DeviceManagementPage";
import { Sidebar } from "@/shared/layout/sidebar/Sidebar";

export default function DevicesPage() {
	return (
		<div className="flex h-screen">
			<Sidebar />
			<main className="flex-1 bg-surface p-6 overflow-auto">
				<DeviceManagementPage />
			</main>
		</div>
	);
}
