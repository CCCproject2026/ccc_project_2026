// src/app/api/staff/invitations/[id]/route.ts
import { NextResponse } from "next/server";
import { cancelInvitation } from "@/features/staff-management/server/staff-service";
import { errorResponse } from "@/shared/lib/api-error";
import { requireRole } from "@/shared/lib/auth";

// 招待の取消（取消処理の再試行も同じ API）
export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireRole("NURSE");
		const { id } = await params;
		const response = await cancelInvitation(id);
		return NextResponse.json(response);
	} catch (error) {
		return errorResponse(error);
	}
}
