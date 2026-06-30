// src/app/api/staff/invitations/route.ts
import { NextResponse } from "next/server";

// 招待一覧の取得（GET）または新規招待の作成（POST）が一般的に使われます。
// ここでは一般的な POST と GET の形を置いておきます。
// 本来の処理（DB操作など）に合わせて関数内を修正してください。

export async function GET() {
	return NextResponse.json({ success: true, invitations: [] });
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		return NextResponse.json({ success: true, data: body });
	} catch (_) {
		return NextResponse.json(
			{ success: false, error: "Invalid JSON" },
			{ status: 400 },
		);
	}
}
