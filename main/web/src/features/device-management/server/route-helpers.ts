import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { ApiError, errorResponse } from "@/shared/lib/api-error";

// デバイス管理の Route Handler で共通に使う処理

// クエリ文字列を zod で検査する
// 同じキーが2回以上あるときは、どちらを使うか曖昧なため 400 にする
export function parseSearchParams<T extends z.ZodType>(
	request: Request,
	schema: T,
): z.infer<T> {
	const { searchParams } = new URL(request.url);
	const values: Record<string, string> = {};
	for (const [key, value] of searchParams) {
		if (key in values) {
			throw new ApiError(
				400,
				"INVALID_INPUT",
				"同じパラメータが複数指定されています",
			);
		}
		values[key] = value;
	}
	return schema.parse(values);
}

// 処理を実行し、成功なら JSON、失敗なら共通形式のエラーを返す
// デバイスの状態や割当先はすぐ変わるため、ブラウザや中継サーバーにキャッシュさせない
export async function handleDeviceRequest(
	run: () => Promise<unknown>,
	successStatus = 200,
): Promise<NextResponse> {
	let response: NextResponse;
	try {
		const body = await run();
		response = NextResponse.json(body, { status: successStatus });
	} catch (error) {
		response = errorResponse(error);
	}
	response.headers.set("Cache-Control", "no-store");
	return response;
}
