// src/app/api/webhooks/clerk/route.ts
import { NextResponse } from "next/server";

// ClerkからのWebhook（ユーザー作成・更新など）を受け取るPOSTメソッドの雛形です。
// あとで実際のロジック（署名検証やユーザー同期など）を実装してください。
export async function POST(request: Request) {
	try {
		const payload = await request.json();
		return NextResponse.json({ success: true, message: "Webhook received" });
	} catch {
		return NextResponse.json(
			{ success: false, error: "Invalid Webhook Request" },
			{ status: 400 },
		);
	}
}
