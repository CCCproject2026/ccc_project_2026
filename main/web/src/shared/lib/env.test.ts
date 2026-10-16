import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// serverEnv() は結果をキャッシュするため、テストごとにモジュールを読み直す
async function loadServerEnv() {
	vi.resetModules();
	const mod = await import("./env");
	return mod.serverEnv;
}

const originalEnv = { ...process.env };

beforeEach(() => {
	process.env.DATABASE_URL = "postgres://localhost/test";
	process.env.CLERK_SECRET_KEY = "sk_test";
	process.env.CLERK_WEBHOOK_SECRET = "whsec_test";
	process.env.STAFF_TOKEN_SECRET = Buffer.alloc(32).toString("base64");
	delete process.env.APP_URL;
});

afterEach(() => {
	process.env = { ...originalEnv };
});

describe("serverEnv の APP_URL", () => {
	it("未設定なら起動できる", async () => {
		const serverEnv = await loadServerEnv();
		expect(serverEnv().APP_URL).toBeUndefined();
	});

	it("空文字（APP_URL=）でも起動できる（未設定と同じ扱い）", async () => {
		process.env.APP_URL = "";
		const serverEnv = await loadServerEnv();
		expect(serverEnv().APP_URL).toBe("");
	});

	it("http:// / https:// の URL なら起動できる", async () => {
		process.env.APP_URL = "https://example.herokuapp.com";
		const serverEnv = await loadServerEnv();
		expect(serverEnv().APP_URL).toBe("https://example.herokuapp.com");
	});

	it.each([
		"localhost:3000",
		"javascript:alert(1)",
		"not a url",
	])("%s は起動を止める", async (value) => {
		process.env.APP_URL = value;
		const serverEnv = await loadServerEnv();
		expect(() => serverEnv()).toThrow("APP_URL");
	});
});
