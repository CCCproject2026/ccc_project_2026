import { assignableEldersQuerySchema } from "@/features/device-management/schemas/device-input";
import { listAssignableElders } from "@/features/device-management/server/assignment-service";
import {
	handleDeviceRequest,
	parseSearchParams,
} from "@/features/device-management/server/route-helpers";
import { requireStaff } from "@/shared/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 割当先に選べる入所者（ACTIVE かつ未割当）。検索とページングに対応する
export async function GET(request: Request) {
	return handleDeviceRequest(async () => {
		await requireStaff();
		const query = parseSearchParams(request, assignableEldersQuerySchema);
		return listAssignableElders(query);
	});
}
