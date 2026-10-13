// スタッフ管理 API を呼ぶ関数（画面から使う）
import type { StaffInviteInput } from "@/features/staff-management/schemas/staff-input";
import type {
	StaffApiError,
	StaffItem,
	StaffOperationResult,
	StaffRole,
} from "@/features/staff-management/types/staff.types";

// API の結果。成功なら data、失敗なら error
export type ApiResult<T> =
	| { ok: true; data: T }
	| { ok: false; status: number; error: StaffApiError };

// API を呼んで、ApiResult の形にする
async function callApi<T>(
	url: string,
	method: "GET" | "POST" | "PATCH" | "DELETE",
	body?: unknown,
): Promise<ApiResult<T>> {
	let response: Response;
	try {
		response = await fetch(url, {
			method,
			headers: { "Content-Type": "application/json" },
			body: body === undefined ? undefined : JSON.stringify(body),
		});
	} catch {
		// サーバーに届かなかった
		return {
			ok: false,
			status: 0,
			error: {
				code: "NETWORK",
				message: "通信に失敗しました。ネットワークを確認してください",
			},
		};
	}

	// 本文を JSON として読む（読めなければ null）
	let json: unknown = null;
	try {
		json = await response.json();
	} catch {
		json = null;
	}

	if (response.ok) {
		return { ok: true, data: json as T };
	}

	// エラーの本文が { code, message, ... } の形ならそのまま使う
	if (json !== null && typeof json === "object" && "message" in json) {
		return { ok: false, status: response.status, error: json as StaffApiError };
	}
	return {
		ok: false,
		status: response.status,
		error: { code: "UNKNOWN", message: "エラーが発生しました" },
	};
}

// ===== 一覧 =====

// 登録待ち（PENDING）一覧
export function fetchInvitations() {
	return callApi<{ staff: StaffItem[] }>("/api/staff/invitations", "GET");
}

// 利用中・停止中の一覧
export function fetchStaffList() {
	return callApi<{ staff: StaffItem[] }>("/api/staff", "GET");
}

// ===== 招待・照合・取消・再招待 =====

export function inviteStaff(values: StaffInviteInput) {
	return callApi<StaffOperationResult>(
		"/api/staff/invitations",
		"POST",
		values,
	);
}

// confirmationToken は、既存アカウントの紐付けを確認したときだけ付ける
export function syncInvitation(id: string, confirmationToken?: string) {
	return callApi<StaffOperationResult>(
		`/api/staff/invitations/${encodeURIComponent(id)}/sync`,
		"POST",
		{ confirmationToken },
	);
}

// 取消（取消処理の再試行も同じ）
export function cancelInvitation(id: string) {
	return callApi<StaffOperationResult>(
		`/api/staff/invitations/${encodeURIComponent(id)}`,
		"DELETE",
	);
}

// 再招待（email は変更できないので送らない）
export function reinviteStaff(id: string, values: StaffInviteInput) {
	return callApi<StaffOperationResult>(
		`/api/staff/invitations/${encodeURIComponent(id)}/reinvite`,
		"POST",
		{
			role: values.role,
			lastName: values.lastName,
			firstName: values.firstName,
			dateOfBirth: values.dateOfBirth,
			startDate: values.startDate,
			nationality: values.nationality,
			gender: values.gender,
		},
	);
}

// ===== ロール変更・無効化・有効化 =====

export function changeStaffRole(id: string, role: StaffRole) {
	return callApi<StaffOperationResult>(
		`/api/staff/${encodeURIComponent(id)}/role`,
		"PATCH",
		{ role },
	);
}

export function deactivateStaff(id: string) {
	return callApi<StaffOperationResult>(
		`/api/staff/${encodeURIComponent(id)}`,
		"DELETE",
	);
}

export function activateStaff(id: string) {
	return callApi<StaffOperationResult>(
		`/api/staff/${encodeURIComponent(id)}/activate`,
		"POST",
	);
}
