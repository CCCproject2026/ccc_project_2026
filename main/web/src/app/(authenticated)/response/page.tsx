import { dashboardPageNumber } from "@/features/dashboard/lib/resident-profile";
import { ResponseHistoryPage } from "@/features/response/pages/ResponseHistoryPage";
import { judgmentFilterFrom } from "@/features/response/server/response-history-service";

// 対応履歴（全員分の対応記録）
// (authenticated) の layout と、データ取得の requireStaffPage の両方で認可する
export default async function ResponseRoute({
	searchParams,
}: {
	searchParams: Promise<{
		page?: string | string[];
		judgment?: string | string[];
	}>;
}) {
	const { page, judgment } = await searchParams;
	return (
		<ResponseHistoryPage
			page={dashboardPageNumber(page)}
			judgment={judgmentFilterFrom(judgment)}
		/>
	);
}
