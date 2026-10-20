import { DeviceManagementPage } from "@/features/device-management/pages/DeviceManagementPage";
import { requireStaffPage } from "@/shared/lib/auth";

export default async function DevicesPage() {
	await requireStaffPage();

	return <DeviceManagementPage />;
}
