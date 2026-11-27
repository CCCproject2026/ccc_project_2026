import {
	CreateElderInput,
	Elder,
	ElderDetail,
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
function apiErrorMessage(body: unknown, status: number): string {
	if (body && typeof body === "object") {
		const record = body as Record<string, unknown>;
		if (typeof record.error === "string" && record.error !== "") {
			return record.error;
		}
		if (typeof record.message === "string" && record.message !== "") {
			return record.message;
		}
		if (typeof record.code === "string" && record.code !== "") {
			return record.code;
		}
	}
	return `HTTP ${status}`;
}

// HTTP のステータスも持つエラー。画面で 409（競合）だけ扱いを変えるために使う
export class ElderApiError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
		this.name = "ElderApiError";
	}
}

// 退所の確定時に、確認した割当が変わっていた（409）かどうか
export function isElderConflictError(error: unknown): boolean {
	return error instanceof ElderApiError && error.status === 409;
}

async function handleResponse<T>(res: Response): Promise<T> {
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new ElderApiError(res.status, apiErrorMessage(body, res.status));
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

	// GET /api/elders/[id] は、割当中のデバイス（currentDeviceId）と割当の ID（currentAssignmentId）も返す
	get: async (id: string): Promise<ElderDetail> => {
		const res = await request(`${API_BASE}/${encodeURIComponent(id)}`);
		return handleResponse<ElderDetail>(res);
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

	// 退所。expectedAssignmentId は確認ダイアログで見せた割当の ID（割当がなければ null）。
	// サーバーは今の割当と照合し、違えば 409 を返して何も変更しない
	delete: async (
		id: string,
		expectedAssignmentId: string | null,
	): Promise<undefined | ReverificationHint> => {
		const search = new URLSearchParams();
		search.set("expectedAssignmentId", expectedAssignmentId ?? "none");
		const res = await request(
			`${API_BASE}/${encodeURIComponent(id)}?${search.toString()}`,
			{ method: "DELETE" },
		);
		if (res.ok) return;
		const body = await res.json().catch(() => null);
		// 再認証が必要な場合は Clerk のヒントをそのまま返し、useReverification に委ねる。
		if (isReverificationHint(body)) return body;
		throw new ElderApiError(res.status, apiErrorMessage(body, res.status));
	},
};
