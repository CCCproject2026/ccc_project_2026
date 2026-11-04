import { auth, reverificationErrorResponse } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { checkNurseAuth } from "@/features/elder-management/server/elder-auth";
import {
	deactivateElder,
	getElder,
	updateElder,
} from "@/features/elder-management/server/elder-service";
import { ApiError } from "@/shared/lib/api-error";
import { requireStaff } from "@/shared/lib/auth";
import { requiresReverification } from "@/shared/lib/reverification";
import { elderUpdateSchema } from "@/shared/validation/schemas";

interface RouteParams {
	params: Promise<{ id: string }>;
}

// 退所など影響の大きい操作の前に Clerk の再認証（reverification）を必須にする。
// 未再認証の場合は Clerk のヒント（403）を返し、クライアントの useReverification が
// 再認証モーダルを表示してリクエストを再試行する。
async function checkReverification(): Promise<Response | null> {
	const { has } = await auth();
	if (!has({ reverification: "strict" })) {
		return reverificationErrorResponse("strict");
	}
	return null;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		// DB 上で ACTIVE なスタッフだけ通す
		// Clerk にログインしていても、無効化されたスタッフは 403 にする
		await requireStaff();

		const { id } = await params;
		const elder = await getElder(id);
		if (!elder) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		return NextResponse.json(elder);
	} catch (error) {
		// requireStaff の 401（未ログイン）・403（ACTIVE でない）
		if (error instanceof ApiError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);
		}
		console.error("GET /api/elders/[id] error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	try {
		const authResult = await checkNurseAuth();
		if ("error" in authResult)
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status },
			);

		const { id } = await params;
		const body = await request.json();
		const parsed = elderUpdateSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.issues },
				{ status: 400 },
			);
		}

		// 退所（INACTIVE への変更）は DELETE と同じ扱いにするため、更新経由でも再認証を必須にする。
		if (requiresReverification(parsed.data)) {
			const reverification = await checkReverification();
			if (reverification) return reverification;
		}

		const elder = await updateElder(id, parsed.data);
		if (!elder) {
			return NextResponse.json(
				{ error: "No fields to update" },
				{ status: 400 },
			);
		}

		return NextResponse.json(elder);
	} catch (error) {
		console.error("PATCH /api/elders/[id] error:", error);
		if ((error as { code?: string }).code === "P2025") {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
	try {
		const authResult = await checkNurseAuth();
		if ("error" in authResult)
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status },
			);

		// 退所（無効化）は誤操作時の影響が大きいため、操作前に再認証を必須にする。
		const reverification = await checkReverification();
		if (reverification) return reverification;

		const { id } = await params;

		await deactivateElder(id);

		return new NextResponse(null, { status: 204 });
	} catch (error) {
		console.error("DELETE /api/elders/[id] error:", error);
		if ((error as { code?: string }).code === "P2025") {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
