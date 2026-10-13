// src/app/api/staff/invitations/[id]/route.ts
import { NextResponse } from "next/server";
import { errorResponse } from "@/shared/lib/api-error";
import { requireRole } from "@/shared/lib/auth";

// 招待の取消（DELETE /api/staff/invitations/:id）
// 中身は T7 で実装する。今は NURSE だけが呼べるようにしておく
export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireRole("NURSE");

		// Next.js 15のルールに従って params を await する
		const { id } = await params;

		return NextResponse.json(
			{ code: "NOT_IMPLEMENTED", message: `未実装です（${id}）` },
			{ status: 501 },
		);
	} catch (error) {
		return errorResponse(error);
	}
}
