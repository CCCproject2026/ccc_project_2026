import "server-only";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ErrorCode =
	| "INVALID_INPUT" // 400
	| "UNAUTHENTICATED" // 401
	| "FORBIDDEN" // 403
	| "LAST_NURSE" // 403
	| "NOT_FOUND" // 404
	| "INVALID_STATE" // 409
	| "DUPLICATE" // 409
	| "TOKEN_MISMATCH" // 409
	| "EXTERNAL_FAILURE" // 502
	| "TEMPORARILY_UNAVAILABLE" // 503
	| "INTERNAL"; // 500

// extra は機能ごとの追加情報（スタッフ管理なら { staff, retryAction }）。
// shared は features の型に依存しないため、ここでは汎用型にする。
export class ApiError<
	T extends Record<string, unknown> = Record<string, unknown>,
> extends Error {
	constructor(
		readonly status: number,
		readonly code: ErrorCode,
		message: string,
		readonly extra?: T,
	) {
		super(message);
		this.name = "ApiError";
	}
}

export function errorResponse(e: unknown) {
	if (e instanceof ApiError) {
		return NextResponse.json(
			{ code: e.code, message: e.message, ...e.extra },
			{ status: e.status },
		);
	}
	if (e instanceof ZodError) {
		return NextResponse.json(
			{ code: "INVALID_INPUT", message: "入力内容が正しくありません" },
			{ status: 400 },
		);
	}
	if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
		return NextResponse.json(
			{ code: "DUPLICATE", message: "既に登録されています" },
			{ status: 409 },
		);
	}
	// 個人情報を含む可能性があるため、メッセージ本文は出さない
	console.error(
		"[api] unexpected error",
		e instanceof Error ? e.name : typeof e,
	);
	return NextResponse.json(
		{ code: "INTERNAL", message: "サーバーエラーが発生しました" },
		{ status: 500 },
	);
}
