// src/app/api/staff/route.ts
import { NextResponse } from "next/server";

// スタッフ一覧の取得（GET）や新規スタッフの登録（POST）の雛形です。
// 本来の仕様やDB操作のロジックに合わせて、中身を書き換えてください。

export async function GET() {
	return NextResponse.json({ success: true, staff: [] });
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		return NextResponse.json({ success: true, data: body });
	} catch {
		return NextResponse.json(
			{ success: false, error: "Invalid JSON" },
			{ status: 400 },
		);
	}
}
