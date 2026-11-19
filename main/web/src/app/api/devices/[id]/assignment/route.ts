import {
	assignSchema,
	transferSchema,
	unassignQuerySchema,
} from "@/features/device-management/schemas/device-input";
import {
	assignDevice,
	transferDevice,
	unassignDevice,
} from "@/features/device-management/server/assignment-service";
import {
	handleDeviceRequest,
	parseSearchParams,
} from "@/features/device-management/server/route-helpers";
import { readJsonBody } from "@/shared/lib/api-error";
import { requireStaff } from "@/shared/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// 割当
export async function POST(request: Request, context: RouteContext) {
	return handleDeviceRequest(async () => {
		const actor = await requireStaff();
		const { id } = await context.params;
		const { elderId } = assignSchema.parse(await readJsonBody(request));
		return assignDevice(actor.id, id, elderId);
	}, 201);
}

// 付け替え（同じデバイスを別の高齢者へ移す）
export async function PUT(request: Request, context: RouteContext) {
	return handleDeviceRequest(async () => {
		const actor = await requireStaff();
		const { id } = await context.params;
		const { elderId, expectedAssignmentId } = transferSchema.parse(
			await readJsonBody(request),
		);
		return transferDevice(actor.id, id, elderId, expectedAssignmentId);
	});
}

// 解除（DELETE /api/devices/[id]/assignment?assignmentId=...）
export async function DELETE(request: Request, context: RouteContext) {
	return handleDeviceRequest(async () => {
		const actor = await requireStaff();
		const { id } = await context.params;
		const { assignmentId } = parseSearchParams(request, unassignQuerySchema);
		return unassignDevice(actor.id, id, assignmentId);
	});
}
