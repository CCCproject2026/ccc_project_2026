// src/app/api/staff/[id]/role/route.ts
import { NextResponse } from "next/server";
import { errorResponse } from "@/shared/lib/api-error";
import { requireRole } from "@/shared/lib/auth";

// ロール変更（PATCH /api/staff/:id/role）
// 中身は T8 で実装する。今は NURSE だけが呼べるようにしておく
export async function PATCH(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireRole("NURSE");

		// paramsを正しく非同期で受け取る
		const { id } = await params;

		return NextResponse.json(
			{ code: "NOT_IMPLEMENTED", message: `未実装です（${id}）` },
			{ status: 501 },
		);
	} catch (error) {
		return errorResponse(error);
	}
}
