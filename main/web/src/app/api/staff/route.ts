// src/app/api/staff/route.ts
import { NextResponse } from "next/server";
import { staffListQuerySchema } from "@/features/staff-management/schemas/staff-input";
import { listStaff } from "@/features/staff-management/server/staff-service";
import { errorResponse } from "@/shared/lib/api-error";
import { requireRole } from "@/shared/lib/auth";

// スタッフ一覧（GET /api/staff?status=ACTIVE または INACTIVE。省略すると両方）
// 新規登録は POST /api/staff/invitations を使う
export async function GET(request: Request) {
	try {
		await requireRole("NURSE");

		const searchParams = new URL(request.url).searchParams;
		const query = staffListQuerySchema.parse({
			status: searchParams.get("status") ?? undefined,
		});

		const response = await listStaff(query.status);
		return NextResponse.json(response);
	} catch (error) {
		return errorResponse(error);
	}
}
