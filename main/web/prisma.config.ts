import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: join(dirname(fileURLToPath(import.meta.url)), ".env") });

export default defineConfig({
	schema: "prisma/schema.prisma",
	// prisma.config.ts の migrations ブロック
	migrations: {
		path: "prisma/migrations",
		// 💡 コンテナ内では pnpm を挟むことで node_modules 内の tsx を確実に安全に呼び出せます
		seed: "pnpm tsx prisma/seed.ts",
	},
	datasource: {
		url: env("DATABASE_URL"),
	},
});
