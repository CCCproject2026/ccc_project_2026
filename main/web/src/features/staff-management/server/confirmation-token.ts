import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { serverEnv } from "@/shared/lib/env";

// トークンの有効期限（設計書 4.2：5分）
const TOKEN_LIFETIME_MS = 5 * 60 * 1000;

// トークンの形式のバージョン（将来形式を変えたときに見分けるため）
const TOKEN_VERSION = "v1";

// AES-GCM の改ざん検知用タグの長さ（16バイト）
const AUTH_TAG_LENGTH = 16;

// トークンの中身（暗号化されるので、ブラウザからは読めない）
export type ConfirmationTokenData = {
	userId: string; // 対象スタッフの User.id
	clerkUserId: string; // 紐付け候補の Clerk ユーザー ID
	email: string; // 対象スタッフの email（整えたもの）
	userUpdatedAt: string; // 対象スタッフの updatedAt（ISO 形式）
	confirmedBy: string; // 確認する NURSE の User.id
	expiresAt: number; // 有効期限（ミリ秒）
};

// 暗号化の鍵（.env の STAFF_TOKEN_SECRET。32バイト）
function getKey(): Buffer {
	return Buffer.from(serverEnv().STAFF_TOKEN_SECRET, "base64");
}

// トークンを作る
// AES-256-GCM は「暗号化」と「改ざん検知」を同時に行う
export function createConfirmationToken(
	data: {
		userId: string;
		clerkUserId: string;
		email: string;
		userUpdatedAt: string;
		confirmedBy: string;
	},
	now: number = Date.now(),
): string {
	const payload: ConfirmationTokenData = {
		...data,
		expiresAt: now + TOKEN_LIFETIME_MS,
	};

	// 毎回ちがう iv（初期化ベクトル）を使う
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
	const encrypted = Buffer.concat([
		cipher.update(JSON.stringify(payload), "utf8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();

	// "v1.iv.暗号文.タグ" の形にする（URL でも使える base64url）
	return [
		TOKEN_VERSION,
		iv.toString("base64url"),
		encrypted.toString("base64url"),
		authTag.toString("base64url"),
	].join(".");
}

// トークンを読む
// 改ざん・期限切れ・形式不正なら null を返す
export function readConfirmationToken(
	token: string,
	now: number = Date.now(),
): ConfirmationTokenData | null {
	const parts = token.split(".");
	if (parts.length !== 4 || parts[0] !== TOKEN_VERSION) {
		return null;
	}

	try {
		const iv = Buffer.from(parts[1], "base64url");
		const encrypted = Buffer.from(parts[2], "base64url");
		const authTag = Buffer.from(parts[3], "base64url");

		// タグが短いと改ざんを見逃しやすくなるので、長さを必ず確認する
		if (authTag.length !== AUTH_TAG_LENGTH) {
			return null;
		}

		const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
		decipher.setAuthTag(authTag);
		// 改ざんされていると、ここ（final）でエラーになる
		const json = Buffer.concat([
			decipher.update(encrypted),
			decipher.final(),
		]).toString("utf8");

		const data = JSON.parse(json) as ConfirmationTokenData;

		// 期限切れ
		if (data.expiresAt <= now) {
			return null;
		}
		return data;
	} catch {
		return null;
	}
}
