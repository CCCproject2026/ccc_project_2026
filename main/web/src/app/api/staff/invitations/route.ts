// src/app/api/staff/invitations/route.ts
import { NextResponse } from "next/server";
import { errorResponse } from "@/shared/lib/api-error";
import { requireRole } from "@/shared/lib/auth";

// 中身は T6 で実装する。今は NURSE だけが呼べるようにしておく

// 登録待ち（PENDING）一覧
export async function GET() {
	try {
		await requireRole("NURSE");
		return NextResponse.json({ staff: [] });
	} catch (error) {
		return errorResponse(error);
	}
}

// 新規招待
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
