import { NextRequest, NextResponse } from "next/server";
import {
	createElder,
	listElders,
} from "@/features/elder-management/server/elder-service";
import { checkNurseAuth } from "@/features/elder-management/server/elder-auth";
import { ApiError } from "@/shared/lib/api-error";
import { requireStaff } from "@/shared/lib/auth";
import { ElderStatus } from "@/features/elder-management/types/elder.types";
import { elderCreateSchema } from "@/shared/validation/schemas";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export async function GET(request: NextRequest) {
	try {
		// DB 上で ACTIVE なスタッフだけ通す
		// Clerk にログインしていても、無効化されたスタッフは 403 にする
		await requireStaff();

		const { searchParams } = new URL(request.url);
		const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
		const limit = Math.min(
			MAX_LIMIT,
			Math.max(
				1,
				parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10),
			),
		);
		const status = searchParams.get("status") as ElderStatus | null;
		const q = searchParams.get("q") || undefined;

		const result = await listElders({ page, limit, status, q });
		return NextResponse.json(result);
	} catch (error) {
		// requireStaff の 401（未ログイン）・403（ACTIVE でない）
		if (error instanceof ApiError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);
		}
		console.error("GET /api/elders error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const authResult = await checkNurseAuth();
		if ("error" in authResult)
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status },
			);

		const body = await request.json();
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
		console.error("POST /api/elders error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
