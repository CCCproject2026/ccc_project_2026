import { ElderListParams, ElderListResponse, CreateElderInput, UpdateElderInput, Elder } from "@/features/elder-management/types/elder.types";

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

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
  },
};