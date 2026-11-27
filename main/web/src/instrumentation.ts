// サーバー起動時に1回だけ呼ばれる。必須の環境変数がなければ起動を止める
export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		try {
			const { serverEnv } = await import("./shared/lib/env");
			serverEnv();
		} catch (error) {
			// next start（Procfile の web: pnpm start）は register の例外を
			// 握りつぶしてサーバーを生き続けてしまうため、明示的に止める。
			// 放っておくと「起動したが全リクエストが 500」という状態が残る。
			// 値は出さない（env.ts がキー名だけを含むメッセージを作っているため）
			console.error(
				"[startup] 環境変数の検証に失敗したため起動を中止します:",
				error instanceof Error ? error.message : error,
			);
			process.exit(1);
		}
	}
}
