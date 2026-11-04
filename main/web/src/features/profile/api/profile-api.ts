// マイページの API を呼ぶ関数（画面から使う）
import type { ProfileUpdateInput } from "@/features/profile/schemas/profile-input";
import type { ProfileInfo } from "@/features/profile/types/profile.type";

// API の結果。成功なら profile、失敗なら HTTP ステータスとメッセージ
export type ProfileUpdateResult =
	| { ok: true; profile: ProfileInfo }
	| { ok: false; status: number; message: string };

// 自分のプロフィールを更新する（PATCH /api/profile）
export async function updateProfile(
	values: ProfileUpdateInput,
): Promise<ProfileUpdateResult> {
	let response: Response;
	try {
		response = await fetch("/api/profile", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(values),
		});
	} catch {
		// サーバーに届かなかった
		return {
			ok: false,
			status: 0,
			message: "通信に失敗しました。ネットワークを確認してください",
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
		return { ok: true, profile: (json as { profile: ProfileInfo }).profile };
	}

	// エラーの本文が { code, message } の形なら、その message を使う
	let message = "エラーが発生しました";
	if (json !== null && typeof json === "object" && "message" in json) {
		message = String(json.message);
	}
	return { ok: false, status: response.status, message };
}
