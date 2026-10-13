// 注意: instrumentation.ts と scripts/ からも読み込むため "server-only" は付けない。
// クライアントでは NEXT_PUBLIC_ 以外の値は undefined になるため、秘密値は漏れない。
import { z } from "zod";

const serverEnvSchema = z.object({
	DATABASE_URL: z.string().min(1),
	CLERK_SECRET_KEY: z.string().min(1),
	CLERK_WEBHOOK_SECRET: z.string().min(1),
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
