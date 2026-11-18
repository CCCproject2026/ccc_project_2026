import {
	CreateElderInput,
	Elder,
	ElderListParams,
	ElderListResponse,
	UpdateElderInput,
} from "@/features/elder-management/types/elder.types";
import {
	isReverificationHint,
	type ReverificationHint,
} from "@/shared/lib/reverification";

const API_BASE = "/api/elders";

// fetch 自体の reject（オフライン・DNS 失敗など）を拾い、利用者に分かりやすい日本語メッセージにする
async function request(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	try {
		return await fetch(input, init);
	} catch {
		throw new Error("通信に失敗しました。ネットワークを確認してください");
	}
}

// 高齢者 API のエラー本文は既存契約として { error: string } 形式。
// 移行期や共通エラーも考慮し、error または message または code を順に参照する。
async function readErrorMessage(res: Response): Promise<string> {
	const body = await res
		.json()
		.catch(() => ({ error: "Unknown error", message: "Unknown error" }));
	return body.error || body.message || body.code || `HTTP ${res.status}`;
}

async function handleResponse<T>(res: Response): Promise<T> {
	if (!res.ok) {
		throw new Error(await readErrorMessage(res));
	}
	return res.json();
}

export const elderApi = {
	list: async (params: ElderListParams = {}): Promise<ElderListResponse> => {
		const search = new URLSearchParams();
		if (params.status) search.set("status", params.status);
		if (params.q) search.set("q", params.q);
		if (params.page) search.set("page", String(params.page));
		if (params.limit) search.set("limit", String(params.limit));
		const res = await request(`${API_BASE}?${search.toString()}`);
		return handleResponse<ElderListResponse>(res);
	},

	get: async (id: string): Promise<Elder> => {
		const res = await request(`${API_BASE}/${id}`);
		return handleResponse<Elder>(res);
	},

	create: async (input: CreateElderInput): Promise<Elder> => {
		const res = await request(API_BASE, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(input),
		});
		return handleResponse<Elder>(res);
	},

	update: async (id: string, input: UpdateElderInput): Promise<Elder> => {
		const res = await request(`${API_BASE}/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(input),
		});
		return handleResponse<Elder>(res);
	},

	delete: async (id: string): Promise<undefined | ReverificationHint> => {
		const res = await request(`${API_BASE}/${id}`, { method: "DELETE" });
		if (res.ok) return;
		const body = await res.json().catch(() => null);
		// 再認証が必要な場合は Clerk のヒントをそのまま返し、useReverification に委ねる。
		if (isReverificationHint(body)) return body;
		throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
	},
};
