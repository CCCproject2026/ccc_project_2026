// 注意: instrumentation.ts と scripts/ からも読み込むため "server-only" は付けない。
// クライアントでは NEXT_PUBLIC_ 以外の値は undefined になるため、秘密値は漏れない。
import { z } from "zod";

// APP_URL の形式。z.url() だけだと "localhost:3000" や "javascript:..." も通ってしまうため、
// http:// か https:// で始まることも確認する（招待メールのリンク先になるため）
const appUrlSchema = z
	.url("APP_URL は URL の形式で指定してください")
	.refine(
		(value) => value.startsWith("http://") || value.startsWith("https://"),
		"APP_URL は http:// または https:// で始めてください",
	);

const serverEnvSchema = z.object({
	DATABASE_URL: z.string().min(1),
	// Clerk の公開鍵。未設定のまま起動すると ClerkProvider が描画できず、
	// Clerk フックを使う画面で原因の分かりにくい実行時エラーになる。
	// クライアントへはビルド時に埋め込まれるため、起動時に欠落を検出して止める。
	NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
	CLERK_SECRET_KEY: z.string().min(1),
	CLERK_WEBHOOK_SECRET: z.string().min(1),
	DEVICE_API_TOKEN: z.string().regex(/^[A-Za-z0-9+/_=-]{32,}$/),
	// このアプリの URL（例: http://localhost:3000）。招待メールのリンク先に使う
	// 任意：未設定なら、招待メールのリンクは Clerk の画面を開く
	// （本番では、招待から本システムのパスワード設定ページを開くために設定する）
	// 設定する場合は、URL の形でなければ起動を止める（壊れた招待リンクを送らないため）
	// 空文字（APP_URL=）は「未設定」と同じ扱い（getSignUpUrl() と合わせる）
	APP_URL: z.union([z.literal(""), appUrlSchema]).optional(),
	// ブラウザが AI の判定結果を受け取る Broker（MQTT over WebSocket）の接続先
	// 任意：未設定なら GET /api/realtime/credentials は 503 を返す（他の画面は使える）
	// NEXT_PUBLIC_ にしない。ログイン中の ACTIVE なスタッフにだけ API で渡す
	MQTT_BROWSER_WS_URL: z
		.union([
			z.literal(""),
			z
				.url("MQTT_BROWSER_WS_URL は URL の形式で指定してください")
				.refine(
					(value) => value.startsWith("ws://") || value.startsWith("wss://"),
					"MQTT_BROWSER_WS_URL は ws:// または wss:// で始めてください",
				),
		])
		.optional(),
	// ブラウザ用の読み取り専用アカウント（fall/+/events の購読だけを ACL で許可する）
	// 開発の匿名接続では空にする。Broker の管理者や AI・Device 用のものは入れない
	MQTT_BROWSER_USERNAME: z.string().optional(),
	MQTT_BROWSER_PASSWORD: z.string().optional(),
	STAFF_TOKEN_SECRET: z
		.string()
		.refine(
			(v) => Buffer.from(v, "base64").length === 32,
			"32バイトのbase64を指定してください",
		),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
	if (cached) return cached;
	const result = serverEnvSchema.safeParse(process.env);
	if (!result.success) {
		// 値は出さず、キー名だけを出す
		const keys = [
			...new Set(result.error.issues.map((i) => i.path.join("."))),
		].join(", ");
		throw new Error(`環境変数が不正または未設定です: ${keys}`);
	}
	cached = result.data;
	return cached;
}
