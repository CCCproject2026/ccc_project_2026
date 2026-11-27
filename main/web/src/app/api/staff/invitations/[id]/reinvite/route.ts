// src/app/api/staff/invitations/[id]/reinvite/route.ts
import { NextResponse } from "next/server";
import { staffReinviteSchema } from "@/features/staff-management/schemas/staff-input";
import { reinviteStaff } from "@/features/staff-management/server/staff-service";
import { errorResponse, readJsonBody } from "@/shared/lib/api-error";
import { requireRole } from "@/shared/lib/auth";

// 再招待（email は変更できないので、入力に含めない）
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireRole("NURSE");
		const { id } = await params;
		const input = staffReinviteSchema.parse(await readJsonBody(request));
		const response = await reinviteStaff(id, input);
		return NextResponse.json(response);
	} catch (error) {
		return errorResponse(error);
	}
}
