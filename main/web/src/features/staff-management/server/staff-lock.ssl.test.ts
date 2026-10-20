import { describe, expect, it } from "vitest";
import { shouldUseSsl } from "./staff-lock";

// DB .lock は DB に触れないので、ここは環境変数だけで判断できる
describe("shouldUseSsl（ロック用接続に SSL を付けるか）", () => {
	it("Heroku 相当（production, DATABASE_SSL 未設定）は SSL を使う", () => {
		expect(shouldUseSsl({ NODE_ENV: "production" })).toBe(true);
	});

	it("Docker（production, DATABASE_SSL=false）は SSL を使わない", () => {
		expect(
			shouldUseSsl({ NODE_ENV: "production", DATABASE_SSL: "false" }),
		).toBe(false);
	});

	it("開発環境・未設定は SSL を使わない", () => {
		expect(shouldUseSsl({ NODE_ENV: "development" })).toBe(false);
		expect(shouldUseSsl({ NODE_ENV: "test" })).toBe(false);
		expect(shouldUseSsl({})).toBe(false);
	});

	it("DATABASE_SSL が false 以外の値は SSL を使う（Heroku の挙動を変えない）", () => {
		expect(shouldUseSsl({ NODE_ENV: "production", DATABASE_SSL: "true" })).toBe(
			true,
		);
		expect(shouldUseSsl({ NODE_ENV: "production", DATABASE_SSL: "" })).toBe(
			true,
		);
	});
});
