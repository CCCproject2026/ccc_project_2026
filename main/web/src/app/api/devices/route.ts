import {
	deviceCreateSchema,
	deviceListQuerySchema,
} from "@/features/device-management/schemas/device-input";
import {
	createDevice,
	listDevices,
} from "@/features/device-management/server/device-service";
import {
	handleDeviceRequest,
	parseSearchParams,
} from "@/features/device-management/server/route-helpers";
import { readJsonBody } from "@/shared/lib/api-error";
import { requireStaff } from "@/shared/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// デバイス一覧と集計
export async function GET(request: Request) {
	return handleDeviceRequest(async () => {
		await requireStaff();
		const query = parseSearchParams(request, deviceListQuerySchema);
		return listDevices(query);
	});
}

// デバイス登録
export async function POST(request: Request) {
	return handleDeviceRequest(async () => {
		const actor = await requireStaff();
		const input = deviceCreateSchema.parse(await readJsonBody(request));
		return createDevice(actor.id, input);
	}, 201);
}
