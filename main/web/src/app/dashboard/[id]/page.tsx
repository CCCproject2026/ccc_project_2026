import { ResidentDetailPage } from "@/features/dashboard/[id]/pages/ResidentDetailPage";
import { Sidebar } from "@/shared/layout/sidebar/Sidebar";
import { TopBar } from "@/shared/layout/TopBar";

export default async function ResidentDetailRoute({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	return <ResidentDetailPage id={id} />;
}
