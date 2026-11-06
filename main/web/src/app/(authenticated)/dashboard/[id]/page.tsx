import { ResidentDetailPage } from "@/features/dashboard/[id]/pages/ResidentDetailPage";

export default async function DashboardDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	return <ResidentDetailPage id={id} />;
}
