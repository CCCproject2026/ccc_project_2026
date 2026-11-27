// src/app/api/staff/[id]/activate/route.ts
import { NextResponse } from "next/server";
import { activateStaff } from "@/features/staff-management/server/staff-service";
import { errorResponse } from "@/shared/lib/api-error";
import { requireRole } from "@/shared/lib/auth";

// 有効化（ロールを変える場合は、有効化の後にロール変更 API を使う）
export async function POST(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireRole("NURSE");
		const { id } = await params;
		const response = await activateStaff(id);
		return NextResponse.json(response);
	} catch (error) {
		return errorResponse(error);
	}
}
