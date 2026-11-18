import { auth, reverificationErrorResponse } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import {
	deactivateElder,
	getElder,
	updateElder,
} from "@/features/elder-management/server/elder-service";
import { ApiError, errorResponse, readJsonBody } from "@/shared/lib/api-error";
import { requireRole, requireStaff } from "@/shared/lib/auth";
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
			throw new ApiError(404, "NOT_FOUND", "高齢者が見つかりません");
		}
		return NextResponse.json(elder);
	} catch (error) {
		return errorResponse(error);
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	try {
		await requireRole("NURSE");

		const { id } = await params;
		const body = await readJsonBody(request);
		const parsed = elderUpdateSchema.safeParse(body);
		if (!parsed.success) {
			throw new ApiError(400, "INVALID_INPUT", "入力内容が正しくありません", {
				details: parsed.error.issues,
			});
		}

		// 退所（INACTIVE への変更）は DELETE と同じ扱いにするため、更新経由でも再認証を必須にする。
		if (requiresReverification(parsed.data)) {
			const reverification = await checkReverification();
			if (reverification) return reverification;
		}

		const elder = await updateElder(id, parsed.data);
		if (!elder) {
			throw new ApiError(400, "INVALID_INPUT", "更新する項目がありません");
		}

		return NextResponse.json(elder);
	} catch (error) {
		return errorResponse(error);
	}
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
	try {
		await requireRole("NURSE");

		// 退所（無効化）は誤操作時の影響が大きいため、操作前に再認証を必須にする。
		const reverification = await checkReverification();
		if (reverification) return reverification;

		const { id } = await params;

		await deactivateElder(id);

		return new NextResponse(null, { status: 204 });
	} catch (error) {
		return errorResponse(error);
	}
}
