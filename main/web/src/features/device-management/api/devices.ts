import type {
	AssignableEldersResponse,
	DeviceDetail,
	DeviceErrorReason,
	DeviceListResponse,
	DeviceStatus,
	NotFoundTarget,
} from "../types/device.types";

// デバイス管理の API を画面から呼ぶ関数（詳細設計 03 の5章）
// エラーの応答は { code, message, reason?, target? } の形で届く

// API がエラーを返したときに投げる。画面は reason・target を見てメッセージを決める
export class DeviceApiError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
		readonly reason?: DeviceErrorReason,
		readonly target?: NotFoundTarget,
	) {
		super(message);
		this.name = "DeviceApiError";
	}
}

type ErrorBody = {
	code?: string;
	message?: string;
	reason?: DeviceErrorReason;
	target?: NotFoundTarget;
};

async function request<T>(
	path: string,
	method: string,
	body?: unknown,
): Promise<T> {
	let res: Response;
	try {
		res = await fetch(path, {
			method,
			headers: body === undefined ? {} : { "Content-Type": "application/json" },
			body: body === undefined ? undefined : JSON.stringify(body),
		});
	} catch {
		// サーバーに届かなかった（ネットワークの切断など）
		throw new DeviceApiError(0, "NETWORK", "通信できませんでした");
	}

	if (res.ok) {
		return (await res.json()) as T;
	}

	// エラーの本文が JSON でない場合（Clerk の画面など）でも落ちないようにする
	const error = (await res.json().catch(() => null)) as ErrorBody | null;
	throw new DeviceApiError(
		res.status,
		error?.code ?? "UNKNOWN",
		error?.message ?? `HTTP ${res.status}`,
		error?.reason,
		error?.target,
	);
}

// 値がある項目だけをクエリ文字列にする
function toQuery(params: Record<string, string | number | undefined>): string {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== "") {
			search.set(key, String(value));
		}
	}
	const text = search.toString();
	if (text === "") {
		return "";
	}
	return `?${text}`;
}

export type DeviceListParams = {
	status?: DeviceStatus;
	assigned?: "true" | "false";
	q?: string;
	page?: number;
	limit?: number;
};

export type AssignableEldersParams = {
	q?: string;
	page?: number;
	limit?: number;
};

// id は URL に入れるため、必ずエンコードする
function devicePath(id: string): string {
	return `/api/devices/${encodeURIComponent(id)}`;
}

export const deviceApi = {
	list: (params: DeviceListParams) =>
		request<DeviceListResponse>(`/api/devices${toQuery(params)}`, "GET"),

	get: (id: string) => request<DeviceDetail>(devicePath(id), "GET"),

	create: (input: { deviceName: string; deviceCode: string }) =>
		request<DeviceDetail>("/api/devices", "POST", input),

	update: (
		id: string,
		input: {
			expectedUpdatedAt: string;
			deviceName?: string;
			deviceCode?: string;
		},
	) => request<DeviceDetail>(devicePath(id), "PATCH", input),

	changeStatus: (id: string, status: DeviceStatus) =>
		request<DeviceDetail>(`${devicePath(id)}/status`, "PATCH", { status }),

	assign: (id: string, elderId: string) =>
		request<DeviceDetail>(`${devicePath(id)}/assignment`, "POST", {
			elderId,
		}),

	transfer: (id: string, elderId: string, expectedAssignmentId: string) =>
		request<DeviceDetail>(`${devicePath(id)}/assignment`, "PUT", {
			elderId,
			expectedAssignmentId,
		}),

	unassign: (id: string, assignmentId: string) =>
		request<DeviceDetail>(
			`${devicePath(id)}/assignment${toQuery({ assignmentId })}`,
			"DELETE",
		),

	replace: (id: string, newDeviceId: string, expectedAssignmentId: string) =>
		request<DeviceDetail>(`${devicePath(id)}/replacement`, "POST", {
			newDeviceId,
			expectedAssignmentId,
		}),

	assignableElders: (params: AssignableEldersParams) =>
		request<AssignableEldersResponse>(
			`/api/devices/assignable-elders${toQuery(params)}`,
			"GET",
		),
};
