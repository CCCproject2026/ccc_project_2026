// src/app/api/staff/invitations/[id]/sync/route.ts
import { NextResponse } from "next/server";
import { staffSyncSchema } from "@/features/staff-management/schemas/staff-input";
import { syncInvitation } from "@/features/staff-management/server/staff-service";
import { errorResponse, readJsonBody } from "@/shared/lib/api-error";
import { requireRole } from "@/shared/lib/auth";

// 照合（既存アカウントを紐付けるときは confirmationToken を付ける）
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireRole("NURSE");
		const { id } = await params;
		const input = staffSyncSchema.parse(await readJsonBody(request));
		const response = await syncInvitation(id, input.confirmationToken);
		return NextResponse.json(response);
	} catch (error) {
		return errorResponse(error);
	}
}
