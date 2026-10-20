// src/app/api/webhooks/clerk/route.ts
import type { WebhookEvent } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import {
	deleteStaffOfDeletedClerkUser,
	syncClerkUser,
} from "@/features/staff-management/server/clerk-webhook";
import { withStaffLock } from "@/features/staff-management/server/staff-lock";
import { ApiError } from "@/shared/lib/api-error";
import { serverEnv } from "@/shared/lib/env";

// Clerk からの Webhook（ログイン不要。署名で Clerk からの送信かを確認する）
export async function POST(request: Request) {
	// 1. 署名を確認する。署名は「生の本文」で計算されるので、JSON にする前の文字列を使う
	const payload = await request.text();
	const headers = {
		"svix-id": request.headers.get("svix-id") ?? "",
		"svix-timestamp": request.headers.get("svix-timestamp") ?? "",
		"svix-signature": request.headers.get("svix-signature") ?? "",
	};

	let event: WebhookEvent;
	try {
		const webhook = new Webhook(serverEnv().CLERK_WEBHOOK_SECRET);
		// verify は署名が正しくなければエラーを投げる（このバージョンでは何も返さない）
		webhook.verify(payload, headers);
		// 署名が正しいことを確認してから、本文を JSON として読む
		event = JSON.parse(payload) as WebhookEvent;
	} catch {
		// 署名が正しくない → DB は変更しない
		return NextResponse.json(
			{ code: "INVALID_SIGNATURE", message: "署名が正しくありません" },
			{ status: 400 },
		);
	}

	// 2. user.created / user.updated / user.deleted だけ処理する。それ以外は受け取るだけ
	const isSyncEvent =
		event.type === "user.created" || event.type === "user.updated";
	const isDeleteEvent = event.type === "user.deleted";
	if (!isSyncEvent && !isDeleteEvent) {
		return NextResponse.json({ received: true });
	}
	// user.deleted の本文では id が省略されることがある。id がなければ何もできない
	const clerkUserId = event.data.id;
	if (!clerkUserId) {
		return NextResponse.json({ received: true });
	}

	// 3. 共通ロックの中で、Clerk の最新情報を使って同期する
	try {
		await withStaffLock(async (lock) => {
			if (isDeleteEvent) {
				await deleteStaffOfDeletedClerkUser(clerkUserId, lock);
			} else {
				await syncClerkUser(clerkUserId, lock);
			}
		});
		return NextResponse.json({ received: true });
	} catch (error) {
		// 5xx を返すと、Clerk が後で再送してくれる
		if (error instanceof ApiError && error.status === 503) {
			return NextResponse.json(
				{ code: error.code, message: error.message },
				{ status: 503 },
			);
		}
		console.error(
			"[webhook] Clerk Webhook の処理に失敗しました",
			error instanceof Error ? error.name : typeof error,
		);
		return NextResponse.json(
			{ code: "INTERNAL", message: "サーバーエラーが発生しました" },
			{ status: 500 },
		);
	}
}
