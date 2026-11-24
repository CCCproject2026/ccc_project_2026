import { auth, reverificationErrorResponse } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import type { ExpectedExitAssignment } from "@/features/device-management/server/assignment-service";
import {
	deactivateElder,
	getElder,
	updateElder,
} from "@/features/elder-management/server/elder-service";
import { ApiError, readJsonBody } from "@/shared/lib/api-error";
import { requireRole, requireStaff } from "@/shared/lib/auth";
import { requiresReverification } from "@/shared/lib/reverification";
import { elderUpdateSchema } from "@/shared/validation/schemas";

interface RouteParams {
	params: Promise<{ id: string }>;
}

// 高齢者 API は docs/agent-coding/skills/nextjs-frontend/SKILL.md:24 および
// docs/agent-coding/investigation.md:62 の契約に従い、エラー本文は { error } 形式を維持する。
function elderErrorResponse(operation: string, error: unknown) {
	if (error instanceof ApiError) {
		return NextResponse.json(
			{ error: error.message },
			{ status: error.status },
		);
	}
	console.error(`${operation} error:`, error);
	return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

// 退所の確認ダイアログまたは連携元で確認した割当を、クエリ文字列から読む
// - ?expectedAssignmentId=<割当の ID> : その割当を終了する前提で確認した
// - ?expectedAssignmentId=none       : 割当がない前提で確認した
// - 省略                             : 400（退所では照合を必須にする）
function parseExpectedAssignmentId(
	request: NextRequest,
): ExpectedExitAssignment {
	const values = request.nextUrl.searchParams.getAll("expectedAssignmentId");
	if (values.length === 0) {
		throw new ApiError(
			400,
			"INVALID_INPUT",
			"expectedAssignmentId は退所時に必須です",
		);
	}
	// 2つ以上あると、どちらで照合するか曖昧なため 400 にする
	if (values.length > 1) {
		throw new ApiError(
			400,
			"INVALID_INPUT",
			"expectedAssignmentId が複数指定されています",
		);
	}
	const value = values[0];
	if (value === "none") {
		return null;
	}
	if (!/^[A-Za-z0-9_-]{1,64}$/.test(value)) {
		throw new ApiError(
			400,
			"INVALID_INPUT",
			"expectedAssignmentId の形式が正しくありません",
		);
	}
	return value;
}

// Prisma の更新先が見つからなかった（P2025）。エラー本文は従来どおり 404 を返す。
function notFoundResponse() {
	return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		// DB 上で ACTIVE なスタッフだけ通す
		// Clerk にログインしていても、無効化されたスタッフは 403 にする
		await requireStaff();

		const { id } = await params;
		const elder = await getElder(id);
		if (!elder) {
			return notFoundResponse();
		}
		return NextResponse.json(elder);
	} catch (error) {
		// requireStaff の 401（未ログイン）・403（ACTIVE でない）
		return elderErrorResponse("GET /api/elders/[id]", error);
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	try {
		// 更新は看護師（管理者）だけ。未ログインは 401、ACTIVE でない・ロール違いは 403
		// actor.id は退所で割当を終了したときの監査記録（操作者）に使う
		const actor = await requireRole("NURSE");

		const { id } = await params;
		const body = await readJsonBody(request);
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
			// PATCH の退所でも、確認した割当（または未割当）を必ず照合する。
			// 同じ値を exitElder のトランザクションに渡すため、照合と更新の間に
			// 別の割当が作られた場合は 409 になり、更新も監査記録もロールバックされる。
			const expectedAssignmentId = parseExpectedAssignmentId(request);
			const elder = await updateElder(
				id,
				parsed.data,
				actor.id,
				expectedAssignmentId,
			);
			if (!elder) {
				return NextResponse.json(
					{ error: "No fields to update" },
					{ status: 400 },
				);
			}

			return NextResponse.json(elder);
		}

		const elder = await updateElder(id, parsed.data, actor.id);
		if (!elder) {
			return NextResponse.json(
				{ error: "No fields to update" },
				{ status: 400 },
			);
		}

		return NextResponse.json(elder);
	} catch (error) {
		if ((error as { code?: string }).code === "P2025") {
			return notFoundResponse();
		}
		return elderErrorResponse("PATCH /api/elders/[id]", error);
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	try {
		// 退所（無効化）は看護師（管理者）だけ。未ログインは 401、非 ACTIVE・ロール違いは 403
		// actor.id は退所で割当を終了したときの監査記録（操作者）に使う
		const actor = await requireRole("NURSE");
		const expectedAssignmentId = parseExpectedAssignmentId(request);

		// 退所（無効化）は誤操作時の影響が大きいため、操作前に再認証を必須にする。
		const reverification = await checkReverification();
		if (reverification) return reverification;

		const { id } = await params;

		// 確認した割当と今の割当が違えば 409（何も変更されない）
		await deactivateElder(id, actor.id, expectedAssignmentId);

		return new NextResponse(null, { status: 204 });
	} catch (error) {
		if ((error as { code?: string }).code === "P2025") {
			return notFoundResponse();
		}
		return elderErrorResponse("DELETE /api/elders/[id]", error);
	}
}
