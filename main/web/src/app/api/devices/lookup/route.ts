import { deviceLookupQuerySchema } from "@/features/device-management/schemas/device-lookup";
import { lookupAssignmentAt } from "@/features/device-management/server/assignment-service";
import {
	handleDeviceRequest,
	parseSearchParams,
} from "@/features/device-management/server/route-helpers";
import { requireStaff } from "@/shared/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 検知時刻に割り当てられていた高齢者を返す（ダッシュボード用）
// by-code の下に置かない（middleware の公開経路に含めないため）
export async function GET(request: Request) {
	return handleDeviceRequest(async () => {
		await requireStaff();
		const { deviceCode, at } = parseSearchParams(
			request,
			deviceLookupQuerySchema,
		);
		return lookupAssignmentAt(deviceCode, at);
	});
}
