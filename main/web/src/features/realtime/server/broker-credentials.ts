import "server-only";
import { ApiError } from "@/shared/lib/api-error";
import { serverEnv } from "@/shared/lib/env";
import type { BrokerCredentials } from "../types";

// ブラウザ用の接続情報を作る（詳細設計 web/03 の7.1）
// 呼ぶ前に requireStaff() で ACTIVE なスタッフか確かめること
export function getBrowserBrokerCredentials(): BrokerCredentials {
	const env = serverEnv();
	const url = env.MQTT_BROWSER_WS_URL ?? "";

	if (url === "") {
		throw new ApiError(
			503,
			"TEMPORARILY_UNAVAILABLE",
			"受信の接続先が設定されていません",
		);
	}

	// 本番は wss:// だけ。暗号化されていない接続でパスワードを送らない
	if (process.env.NODE_ENV === "production" && !url.startsWith("wss://")) {
		console.error(
			"[realtime] MQTT_BROWSER_WS_URL must use wss:// in production",
		);
		throw new ApiError(
			503,
			"TEMPORARILY_UNAVAILABLE",
			"受信の接続先が設定されていません",
		);
	}

	// 空文字は「匿名（開発用）」として null にする
	const username = env.MQTT_BROWSER_USERNAME || null;
	const password = env.MQTT_BROWSER_PASSWORD || null;

	// 開発の匿名設定を本番で使わない
	if (
		process.env.NODE_ENV === "production" &&
		(username === null || password === null)
	) {
		console.error("[realtime] browser MQTT account is not set in production");
		throw new ApiError(
			503,
			"TEMPORARILY_UNAVAILABLE",
			"受信の接続先が設定されていません",
		);
	}

	return { url, username, password };
}
