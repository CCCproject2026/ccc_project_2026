import { deviceStatusChangeSchema } from "@/features/device-management/schemas/device-input";
import { changeDeviceStatus } from "@/features/device-management/server/device-service";
import { handleDeviceRequest } from "@/features/device-management/server/route-helpers";
import { readJsonBody } from "@/shared/lib/api-error";
import { requireStaff } from "@/shared/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// 状態変更（ACTIVE ⇔ INACTIVE）
export async function PATCH(request: Request, context: RouteContext) {
	return handleDeviceRequest(async () => {
		const actor = await requireStaff();
		const { id } = await context.params;
		const { status } = deviceStatusChangeSchema.parse(
			await readJsonBody(request),
		);
		return changeDeviceStatus(actor.id, id, status);
	});
}
