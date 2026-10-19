import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// 同期処理とロックは偽物にする（署名の確認だけをテストする）
vi.mock("@/features/staff-management/server/clerk-webhook", () => ({
	syncClerkUser: vi.fn(),
	deleteStaffOfDeletedClerkUser: vi.fn(),
}));
vi.mock("@/features/staff-management/server/staff-lock", () => ({
	withStaffLock: vi.fn(async (work: (lock: unknown) => Promise<unknown>) =>
		work({ ensureCanContinue: () => {} }),
	),
}));

import { Webhook } from "svix";
import {
	syncClerkUser,
	deleteStaffOfDeletedClerkUser,
} from "@/features/staff-management/server/clerk-webhook";
import { POST } from "./route";

// テスト用の Webhook secret（"whsec_" + base64）
const SECRET = `whsec_${Buffer.alloc(32, 7).toString("base64")}`;

beforeAll(() => {
	process.env.DATABASE_URL ??= "postgresql://test";
	process.env.CLERK_SECRET_KEY ??= "sk_test";
	process.env.STAFF_TOKEN_SECRET ??= Buffer.alloc(32, 1).toString("base64");
	process.env.CLERK_WEBHOOK_SECRET = SECRET;
});

beforeEach(() => {
	vi.clearAllMocks();
});

// 正しい署名を付けたリクエストを作る
function signedRequest(body: object, secret = SECRET): Request {
	const payload = JSON.stringify(body);
	const id = "msg_1";
	const timestamp = new Date();
	const signature = new Webhook(secret).sign(id, timestamp, payload);

	return new Request("http://localhost/api/webhooks/clerk", {
		method: "POST",
		body: payload,
		headers: {
			"svix-id": id,
			"svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
			"svix-signature": signature,
		},
	});
}

describe("POST /api/webhooks/clerk", () => {
	it("署名が正しくなければ 400。同期しない", async () => {
		const otherSecret = `whsec_${Buffer.alloc(32, 9).toString("base64")}`;
		const request = signedRequest(
			{ type: "user.created", data: { id: "c1" } },
			otherSecret,
		);

		const response = await POST(request);
		expect(response.status).toBe(400);
		expect(syncClerkUser).not.toHaveBeenCalled();
	});

	it("署名ヘッダーがなければ 400", async () => {
		const request = new Request("http://localhost/api/webhooks/clerk", {
			method: "POST",
			body: "{}",
		});
		const response = await POST(request);
		expect(response.status).toBe(400);
	});

	it("user.created は同期する", async () => {
		const response = await POST(
			signedRequest({ type: "user.created", data: { id: "c1" } }),
		);
		expect(response.status).toBe(200);
		expect(syncClerkUser).toHaveBeenCalledWith("c1", expect.anything());
	});

	it("user.updated も同期する", async () => {
		const response = await POST(
			signedRequest({ type: "user.updated", data: { id: "c1" } }),
		);
		expect(response.status).toBe(200);
		expect(syncClerkUser).toHaveBeenCalledTimes(1);
	});

	it("user.deleted は紐付けを外す（同期はしない）", async () => {
		const response = await POST(
			signedRequest({
				type: "user.deleted",
				data: { id: "c1", object: "user", deleted: true },
			}),
		);
		expect(response.status).toBe(200);
		expect(deleteStaffOfDeletedClerkUser).toHaveBeenCalledWith(
			"c1",
			expect.anything(),
		);
		expect(syncClerkUser).not.toHaveBeenCalled();
	});

	it("user.deleted に id がなければ 200 で受け取るだけ", async () => {
		const response = await POST(
			signedRequest({
				type: "user.deleted",
				data: { object: "user", deleted: true },
			}),
		);
		expect(response.status).toBe(200);
		expect(deleteStaffOfDeletedClerkUser).not.toHaveBeenCalled();
	});

	it("user.deleted の処理が一時的に失敗したら 503（Clerk が再送する）", async () => {
		const { ApiError } = await import("@/shared/lib/api-error");
		vi.mocked(deleteStaffOfDeletedClerkUser).mockRejectedValueOnce(
			new ApiError(503, "TEMPORARILY_UNAVAILABLE", "一時的に失敗"),
		);
		const response = await POST(
			signedRequest({
				type: "user.deleted",
				data: { id: "c1", object: "user", deleted: true },
			}),
		);
		expect(response.status).toBe(503);
	});

	it("それ以外のイベントは 200 で受け取るだけ", async () => {
		const response = await POST(
			signedRequest({ type: "session.created", data: { id: "sess_1" } }),
		);
		expect(response.status).toBe(200);
		expect(syncClerkUser).not.toHaveBeenCalled();
	});

	it("同期が一時的に失敗したら 503（Clerk が再送する）", async () => {
		const { ApiError } = await import("@/shared/lib/api-error");
		vi.mocked(syncClerkUser).mockRejectedValue(
			new ApiError(503, "TEMPORARILY_UNAVAILABLE", "一時的に失敗"),
		);
		const response = await POST(
			signedRequest({ type: "user.created", data: { id: "c1" } }),
		);
		expect(response.status).toBe(503);
	});
});
