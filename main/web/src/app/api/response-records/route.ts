import { NextResponse } from "next/server";
import { responseRecordCreateSchema } from "@/features/response/schemas/response-record-input";
import { createResponseRecord } from "@/features/response/server/response-record-service";
import { errorResponse, readJsonBody } from "@/shared/lib/api-error";
import { requireStaff } from "@/shared/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 対応記録の投稿（CAREGIVER / NURSE の両ロール）
// 201 / 400（入力不正）/ 401（未ログイン）/ 403（無効なスタッフ）/ 404（高齢者なし）
export async function POST(request: Request) {
	try {
		const staff = await requireStaff();
		const body = await readJsonBody(request);
		const input = responseRecordCreateSchema.parse(body);
		const record = await createResponseRecord(staff, input);
		return NextResponse.json(record, { status: 201 });
	} catch (error) {
		// 個人情報を含むため、入力内容はログに出さない（errorResponse も本文を出さない）
		return errorResponse(error);
	}
}
