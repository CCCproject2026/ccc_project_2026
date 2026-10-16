import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			// "@/..." を src フォルダとして読めるようにする（tsconfig と同じ設定）
			"@": path.resolve(import.meta.dirname, "src"),
			// "server-only" は Next.js の外で読み込むとエラーになるので、テストでは空のファイルに置き換える
			"server-only": path.resolve(import.meta.dirname, "src/test/empty.ts"),
		},
	},
	test: {
		include: ["src/**/*.test.ts"],
	},
});
