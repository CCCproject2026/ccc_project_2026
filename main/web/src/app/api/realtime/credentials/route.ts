import { NextResponse } from "next/server";
import { getBrowserBrokerCredentials } from "@/features/realtime/server/broker-credentials";
import { errorResponse } from "@/shared/lib/api-error";
import { requireStaff } from "@/shared/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ブラウザが Broker に接続するための情報（詳細設計 web/03 の7.1）
// 200 / 401（未ログイン）/ 403（無効なスタッフ）/ 503（接続先が未設定）
export async function GET() {
	try {
		await requireStaff();
		const credentials = getBrowserBrokerCredentials();
		return NextResponse.json(credentials, {
			headers: { "Cache-Control": "no-store" },
		});
	} catch (error) {
		const response = errorResponse(error);
		response.headers.set("Cache-Control", "no-store");
		return response;
	}
}
