import { NextRequest, NextResponse } from "next/server";
import {
	createElder,
	listElders,
} from "@/features/elder-management/server/elder-service";
import { ApiError, errorResponse, readJsonBody } from "@/shared/lib/api-error";
import { requireRole, requireStaff } from "@/shared/lib/auth";
import {
	elderCreateSchema,
	elderListQuerySchema,
} from "@/shared/validation/schemas";

export async function GET(request: NextRequest) {
	try {
		// DB 上で ACTIVE なスタッフだけ通す
		// Clerk にログインしていても、無効化されたスタッフは 403 にする
		await requireStaff();

		// クエリ文字列はすべて文字列で届くため、zod で数値・enum に変換して検証する。
		// 数値でない値（例: page=abc）はここで 400 になり、Prisma に NaN が渡らない。
		const { searchParams } = new URL(request.url);
		const query = elderListQuerySchema.parse({
			// 空文字（?page=）は未指定として扱い、既定値にフォールバックさせる
			page: searchParams.get("page") || undefined,
			limit: searchParams.get("limit") || undefined,
			status: searchParams.get("status") || undefined,
			q: searchParams.get("q")?.trim() || undefined,
		});

		const result = await listElders({
			page: query.page,
			limit: query.limit,
			status: query.status ?? null,
			q: query.q,
		});
		return NextResponse.json(result);
	} catch (error) {
		return errorResponse(error);
	}
}

export async function POST(request: NextRequest) {
	try {
		await requireRole("NURSE");

		const body = await readJsonBody(request);
		const parsed = elderCreateSchema.safeParse(body);
		if (!parsed.success) {
			throw new ApiError(400, "INVALID_INPUT", "入力内容が正しくありません", {
				details: parsed.error.issues,
			});
		}

		const elder = await createElder(parsed.data);

		return NextResponse.json(elder, { status: 201 });
	} catch (error) {
		return errorResponse(error);
	}
}
