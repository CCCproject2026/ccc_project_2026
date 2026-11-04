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

async function handleResponse<T>(res: Response): Promise<T> {
	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: "Unknown error" }));
		throw new Error(err.error || `HTTP ${res.status}`);
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
		const res = await fetch(`${API_BASE}?${search.toString()}`);
		return handleResponse<ElderListResponse>(res);
	},

	get: async (id: string): Promise<Elder> => {
		const res = await fetch(`${API_BASE}/${id}`);
		return handleResponse<Elder>(res);
	},

	create: async (input: CreateElderInput): Promise<Elder> => {
		const res = await fetch(API_BASE, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(input),
		});
		return handleResponse<Elder>(res);
	},

	update: async (id: string, input: UpdateElderInput): Promise<Elder> => {
		const res = await fetch(`${API_BASE}/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(input),
		});
		return handleResponse<Elder>(res);
	},

	delete: async (id: string): Promise<undefined | ReverificationHint> => {
		const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
		if (res.ok) return;
		const body = await res.json().catch(() => null);
		// 再認証が必要な場合は Clerk のヒントをそのまま返し、useReverification に委ねる。
		if (isReverificationHint(body)) return body;
		throw new Error(body?.error || `HTTP ${res.status}`);
	},
};
