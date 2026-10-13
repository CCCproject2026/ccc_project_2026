// サーバー起動時に1回だけ呼ばれる。必須の環境変数がなければ起動を止める
export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const { serverEnv } = await import("./shared/lib/env");
		serverEnv();
	}
}
