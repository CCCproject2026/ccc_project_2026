import { notFound } from "next/navigation";
import { DeviceDetailPage } from "@/features/device-management/pages/DeviceDetailPage";
import { deviceExists } from "@/features/device-management/server/device-service";
import { requireStaffPage } from "@/shared/lib/auth";

export default async function DeviceDetailRoute({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await requireStaffPage();
	const { id } = await params;

	// デバイスがなければ not-found を表示する（詳細設計 03 の8章）
	if (!(await deviceExists(id))) {
		notFound();
	}

	return <DeviceDetailPage id={id} />;
}
