// 対応記録 API をブラウザから呼ぶ
import type { ResponseRecordCreateInput } from "../schemas/response-record-input";

// 保存できたかどうか分からない失敗（通信断・Heroku の30秒の時間切れなど）
// 「もう一度保存」と案内すると、二重に記録されることがあるので案内を分ける
const UNKNOWN_RESULT_STATUSES = [502, 503, 504];
const UNKNOWN_RESULT_MESSAGE =
	"保存できたか確認できませんでした。二重の記録を防ぐため、すぐに保存し直さず、管理者に記録の有無を確認してください";

export class ResponseRecordApiError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
		this.name = "ResponseRecordApiError";
	}
}

export async function postResponseRecord(
	input: ResponseRecordCreateInput,
): Promise<{ id: string; completedAt: string }> {
	let response: Response;
	try {
		response = await fetch("/api/response-records", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(input),
		});
	} catch {
		throw new ResponseRecordApiError(0, UNKNOWN_RESULT_MESSAGE);
	}

	// 途中で切れた・時間切れ: サーバーでは保存できている可能性がある
	if (UNKNOWN_RESULT_STATUSES.includes(response.status)) {
		throw new ResponseRecordApiError(response.status, UNKNOWN_RESULT_MESSAGE);
	}

	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as {
			message?: unknown;
		} | null;
		let message = "保存できませんでした。もう一度保存してください";
		if (response.status === 401) {
			message = "ログインしてください";
		} else if (typeof body?.message === "string" && body.message !== "") {
			message = body.message;
		}
		throw new ResponseRecordApiError(response.status, message);
	}
	return response.json();
}
