// src/app/api/staff/[id]/route.ts
import { NextResponse } from "next/server";
import { deactivateStaff } from "@/features/staff-management/server/staff-service";
import { errorResponse } from "@/shared/lib/api-error";
import { requireRole } from "@/shared/lib/auth";

// 無効化（User は物理削除しない。status を INACTIVE にする）
export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireRole("NURSE");
		const { id } = await params;
		const response = await deactivateStaff(id);
		return NextResponse.json(response);
	} catch (error) {
		return errorResponse(error);
	}
}
