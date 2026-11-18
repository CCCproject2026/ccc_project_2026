import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
	createElder,
	listElders,
} from "@/features/elder-management/server/elder-service";
import { ApiError, readJsonBody } from "@/shared/lib/api-error";
import { requireRole, requireStaff } from "@/shared/lib/auth";
import {
	type ElderStatus,
	elderCreateSchema,
} from "@/shared/validation/schemas";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

// 高齢者 API は docs/agent-coding/skills/nextjs-frontend/SKILL.md:24 および
// docs/agent-coding/investigation.md:62 の契約に従い、エラー本文は { error } 形式を維持する。
function elderErrorResponse(operation: string, error: unknown) {
	if (error instanceof ApiError) {
		return NextResponse.json(
			{ error: error.message },
			{ status: error.status },
		);
	}
	if (error instanceof ZodError) {
		return NextResponse.json(
			{ error: "Validation failed", details: error.issues },
			{ status: 400 },
		);
	}
	console.error(`${operation} error:`, error);
	return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(request: NextRequest) {
	try {
		// DB 上で ACTIVE なスタッフだけ通す
		// Clerk にログインしていても、無効化されたスタッフは 403 にする
		await requireStaff();

		const { searchParams } = new URL(request.url);
		const rawPage = searchParams.get("page");
		const pageParsed = rawPage ? parseInt(rawPage, 10) : 1;
		const page =
			Number.isInteger(pageParsed) && pageParsed >= 1 ? pageParsed : 1;

		const rawLimit = searchParams.get("limit");
		const limitParsed = rawLimit ? parseInt(rawLimit, 10) : DEFAULT_LIMIT;
		const limit = Number.isInteger(limitParsed)
			? Math.min(MAX_LIMIT, Math.max(1, limitParsed))
			: DEFAULT_LIMIT;

		const rawStatus = searchParams.get("status");
		const status =
			rawStatus === "ACTIVE" || rawStatus === "INACTIVE"
				? (rawStatus as ElderStatus)
				: null;

		const q = searchParams.get("q")?.trim() || undefined;

		const result = await listElders({ page, limit, status, q });
		return NextResponse.json(result);
	} catch (error) {
		// requireStaff の 401（未ログイン）・403（ACTIVE でない）
		return elderErrorResponse("GET /api/elders", error);
	}
}

export async function POST(request: NextRequest) {
	try {
		// 登録は看護師（管理者）だけ。未ログインは 401、ACTIVE でない・ロール違いは 403
		await requireRole("NURSE");

		const body = await readJsonBody(request);
		const parsed = elderCreateSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.issues },
				{ status: 400 },
			);
		}

		const elder = await createElder(parsed.data);

		return NextResponse.json(elder, { status: 201 });
	} catch (error) {
		return elderErrorResponse("POST /api/elders", error);
	}
}
