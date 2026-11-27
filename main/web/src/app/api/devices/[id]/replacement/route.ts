import { replaceSchema } from "@/features/device-management/schemas/device-input";
import { replaceDevice } from "@/features/device-management/server/assignment-service";
import { handleDeviceRequest } from "@/features/device-management/server/route-helpers";
import { readJsonBody } from "@/shared/lib/api-error";
import { requireStaff } from "@/shared/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// 故障交換（旧デバイスは必ず INACTIVE になる）
export async function POST(request: Request, context: RouteContext) {
	return handleDeviceRequest(async () => {
		const actor = await requireStaff();
		const { id } = await context.params;
		const { newDeviceId, expectedAssignmentId } = replaceSchema.parse(
			await readJsonBody(request),
		);
		return replaceDevice(actor.id, id, newDeviceId, expectedAssignmentId);
	});
}
