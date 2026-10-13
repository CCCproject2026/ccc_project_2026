// src/app/api/staff/[id]/role/route.ts
import { NextResponse } from "next/server";
import { staffRoleChangeSchema } from "@/features/staff-management/schemas/staff-input";
import { changeRole } from "@/features/staff-management/server/staff-service";
import { errorResponse, readJsonBody } from "@/shared/lib/api-error";
import { requireRole } from "@/shared/lib/auth";

// ロール変更
export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireRole("NURSE");
		const { id } = await params;
		const input = staffRoleChangeSchema.parse(await readJsonBody(request));
		const response = await changeRole(id, input.role);
		return NextResponse.json(response);
	} catch (error) {
		return errorResponse(error);
	}
}
