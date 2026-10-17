/**
 * Clerk の reverification（再認証）が必要なときに API が返すレスポンス本文。
 *
 * サーバー側で `reverificationErrorResponse()` を返すと、本文に `clerk_error` を
 * 含む 403 レスポンスになる。クライアント側ではこの値をそのまま
 * `useReverification` に渡すことで、再認証モーダルの表示とリクエストの自動再試行が
 * 行われる。
 *
 * @see https://clerk.com/docs/guides/secure/reverification
 */
export type ReverificationHint = { clerk_error: unknown };

export function isReverificationHint(body: unknown): body is ReverificationHint {
	return typeof body === "object" && body !== null && "clerk_error" in body;
}
