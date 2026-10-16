import { ResidentDetailPage } from "@/features/dashboard/[id]/pages/ResidentDetailPage";
import { requireStaffPage } from "@/shared/lib/auth";

export default async function DashboardDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await requireStaffPage();

	const { id } = await params;

	return <ResidentDetailPage id={id} />;
}
