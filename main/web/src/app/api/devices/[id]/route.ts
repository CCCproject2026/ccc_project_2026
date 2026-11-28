import { deviceUpdateSchema } from "@/features/device-management/schemas/device-input";
import {
	getDeviceDetail,
	updateDevice,
} from "@/features/device-management/server/device-service";
import { handleDeviceRequest } from "@/features/device-management/server/route-helpers";
import { readJsonBody } from "@/shared/lib/api-error";
import { requireStaff } from "@/shared/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// デバイス詳細（現在の割当と、新しい順で最大50件の割当履歴）
export async function GET(_request: Request, context: RouteContext) {
	return handleDeviceRequest(async () => {
		await requireStaff();
		const { id } = await context.params;
		return getDeviceDetail(id);
	});
}

// 名前・コードの編集（expectedUpdatedAt で楽観的ロック）
export async function PATCH(request: Request, context: RouteContext) {
	return handleDeviceRequest(async () => {
		const actor = await requireStaff();
		const { id } = await context.params;
		const input = deviceUpdateSchema.parse(await readJsonBody(request));
		return updateDevice(actor.id, id, input);
	});
}
