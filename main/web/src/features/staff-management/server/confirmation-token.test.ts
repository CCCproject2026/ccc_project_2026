import { beforeAll, describe, expect, it } from "vitest";
import {
	createConfirmationToken,
	readConfirmationToken,
} from "./confirmation-token";

beforeAll(() => {
	// テスト用の環境変数（serverEnv が必要とするもの）
	process.env.DATABASE_URL ??= "postgresql://test";
	process.env.CLERK_SECRET_KEY ??= "sk_test";
	process.env.CLERK_WEBHOOK_SECRET ??= "whsec_test";
	process.env.STAFF_TOKEN_SECRET ??= Buffer.alloc(32, 1).toString("base64");
});

const data = {
	userId: "user-1",
	clerkUserId: "user_clerk_123",
	email: "a@example.com",
	userUpdatedAt: "2026-10-13T00:00:00.000Z",
	confirmedBy: "nurse-1",
};

describe("確認トークン", () => {
	it("作ったトークンを読むと、同じ内容に戻る", () => {
		const token = createConfirmationToken(data);
		expect(readConfirmationToken(token)).toMatchObject(data);
	});

	it("トークンの中身はそのままでは読めない（暗号化されている）", () => {
		const token = createConfirmationToken(data);
		const decoded = Buffer.from(token.split(".")[2], "base64url").toString();
		expect(token).not.toContain("user_clerk_123");
		expect(decoded).not.toContain("user_clerk_123");
	});

	it("1文字でも変えると読めない（改ざん検知）", () => {
		const token = createConfirmationToken(data);
		const parts = token.split(".");
		const changed = parts[2][0] === "A" ? "B" : "A";
		parts[2] = changed + parts[2].slice(1);
		expect(readConfirmationToken(parts.join("."))).toBeNull();
	});

	it("5分を過ぎると読めない", () => {
		const now = Date.now();
		const token = createConfirmationToken(data, now);
		expect(readConfirmationToken(token, now + 4 * 60 * 1000)).not.toBeNull();
		expect(readConfirmationToken(token, now + 5 * 60 * 1000)).toBeNull();
	});

	it("形がおかしいトークンは読めない", () => {
		expect(readConfirmationToken("abc")).toBeNull();
		expect(readConfirmationToken("v2.a.b.c")).toBeNull();
	});

	it("タグが短いトークンは読めない", () => {
		const token = createConfirmationToken(data);
		const parts = token.split(".");
		parts[3] = Buffer.alloc(4).toString("base64url");
		expect(readConfirmationToken(parts.join("."))).toBeNull();
	});
});
