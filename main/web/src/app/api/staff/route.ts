// src/app/api/staff/route.ts
import { NextResponse } from "next/server";
import { errorResponse } from "@/shared/lib/api-error";
import { requireRole } from "@/shared/lib/auth";

// スタッフ一覧（GET /api/staff）
// 中身は T8 で実装する。今は NURSE だけが呼べるようにしておく
export async function GET() {
	try {
		await requireRole("NURSE");
		return NextResponse.json({ staff: [] });
	} catch (error) {
		return errorResponse(error);
	}
}

// 設計書には POST /api/staff はない（新規は POST /api/staff/invitations を使う）
// 不要なら T8 で削除する
export async function POST() {
	try {
		await requireRole("NURSE");
		return NextResponse.json(
			{ code: "NOT_IMPLEMENTED", message: "未実装です" },
			{ status: 501 },
		);
	} catch (error) {
		return errorResponse(error);
	}
}
