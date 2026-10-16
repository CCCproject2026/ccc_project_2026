import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 本物の Clerk の代わりに、偽物（モック）を使う
// vi.mock は import より先に実行されるので、偽物は vi.hoisted の中で作る
const fakeClient = vi.hoisted(() => ({
	users: { getUser: vi.fn(), getUserList: vi.fn() },
	invitations: {
		getInvitationList: vi.fn(),
		createInvitation: vi.fn(),
		revokeInvitation: vi.fn(),
	},
}));
vi.mock("@clerk/nextjs/server", () => ({
	clerkClient: async () => fakeClient,
}));
// Clerk のエラーかどうかは「isFakeClerkError」が付いているかで判定する
vi.mock("@clerk/nextjs/errors", () => ({
	isClerkAPIResponseError: (error: { isFakeClerkError?: boolean }) =>
		error?.isFakeClerkError === true,
}));

vi.mock("@/shared/lib/logger", () => ({ notifyOps: vi.fn() }));

import { notifyOps } from "@/shared/lib/logger";
import {
	createStaffInvitation,
	findClerkUsersByEmail,
	findPendingInvitations,
	getClerkUser,
	getSignUpUrl,
	listAllPendingInvitations,
	revokeInvitation,
} from "./clerk-admin";

// Clerk が返すエラーの偽物
function clerkError(status: number, code: string) {
	return { isFakeClerkError: true, status, errors: [{ code }] };
}

// Clerk の User の偽物
function fakeUser(options: {
	id: string;
	email: string;
	verified?: boolean;
	banned?: boolean;
	staffUserId?: string;
}) {
	return {
		id: options.id,
		banned: options.banned ?? false,
		locked: false,
		primaryEmailAddressId: "email_1",
		emailAddresses: [
			{
				id: "email_1",
				emailAddress: options.email,
				verification: {
					status: options.verified === false ? "unverified" : "verified",
				},
			},
		],
		publicMetadata: options.staffUserId
			? { staffUserId: options.staffUserId }
			: {},
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("createStaffInvitation", () => {
	it("成功すると SUCCESS。staffUserId を publicMetadata に付ける", async () => {
		fakeClient.invitations.createInvitation.mockResolvedValue({
			id: "inv_1",
			emailAddress: "a@example.com",
			publicMetadata: { staffUserId: "user-1" },
		});

		const result = await createStaffInvitation(" A@Example.com ", "user-1");

		expect(result).toEqual({
			kind: "SUCCESS",
			data: { id: "inv_1", email: "a@example.com", staffUserId: "user-1" },
		});
		expect(fakeClient.invitations.createInvitation).toHaveBeenCalledWith({
			emailAddress: "a@example.com",
			publicMetadata: { staffUserId: "user-1" },
			notify: true,
		});
	});

	it("4xx（重複など）は FAILED", async () => {
		fakeClient.invitations.createInvitation.mockRejectedValue(
			clerkError(400, "duplicate_record"),
		);
		const result = await createStaffInvitation("a@example.com", "user-1");
		expect(result).toEqual({
			kind: "FAILED",
			errorCode: "duplicate_record",
			status: 400,
		});
	});

	it("5xx は UNKNOWN（送られたかわからない）", async () => {
		fakeClient.invitations.createInvitation.mockRejectedValue(
			clerkError(503, "service_unavailable"),
		);
		const result = await createStaffInvitation("a@example.com", "user-1");
		expect(result).toEqual({ kind: "UNKNOWN", reason: "CLERK_503" });
	});

	it("ネットワークエラーは UNKNOWN", async () => {
		fakeClient.invitations.createInvitation.mockRejectedValue(
			new Error("fetch failed"),
		);
		const result = await createStaffInvitation("a@example.com", "user-1");
		expect(result).toEqual({ kind: "UNKNOWN", reason: "NETWORK" });
	});

	describe("時間切れ", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});
		afterEach(() => {
			vi.useRealTimers();
		});

		it("5秒以内に返事がなければ UNKNOWN", async () => {
			// いつまでも終わらない Promise
			fakeClient.invitations.createInvitation.mockReturnValue(
				new Promise(() => {}),
			);

			const promise = createStaffInvitation("a@example.com", "user-1");
			await vi.advanceTimersByTimeAsync(5000);

			expect(await promise).toEqual({ kind: "UNKNOWN", reason: "TIMEOUT" });
		});
	});
});

describe("getClerkUser", () => {
	it("必要な項目だけに変換し、email を整える", async () => {
		fakeClient.users.getUser.mockResolvedValue(
			fakeUser({
				id: "clerk_1",
				email: "A@Example.com",
				staffUserId: "user-1",
			}),
		);
		const result = await getClerkUser("clerk_1");
		expect(result).toEqual({
			kind: "SUCCESS",
			data: {
				id: "clerk_1",
				primaryEmail: "a@example.com",
				isPrimaryEmailVerified: true,
				staffUserId: "user-1",
				isUsable: true,
			},
		});
	});

	it("停止（banned）されたユーザーは isUsable が false", async () => {
		fakeClient.users.getUser.mockResolvedValue(
			fakeUser({ id: "clerk_1", email: "a@example.com", banned: true }),
		);
		const result = await getClerkUser("clerk_1");
		expect(result.kind === "SUCCESS" && result.data?.isUsable).toBe(false);
	});

	it("未確認の email は isPrimaryEmailVerified が false", async () => {
		fakeClient.users.getUser.mockResolvedValue(
			fakeUser({ id: "clerk_1", email: "a@example.com", verified: false }),
		);
		const result = await getClerkUser("clerk_1");
		expect(
			result.kind === "SUCCESS" && result.data?.isPrimaryEmailVerified,
		).toBe(false);
	});

	it("404 は「アカウントなし」として SUCCESS・null", async () => {
		fakeClient.users.getUser.mockRejectedValue(
			clerkError(404, "resource_not_found"),
		);
		const result = await getClerkUser("clerk_1");
		expect(result).toEqual({ kind: "SUCCESS", data: null });
	});

	it("404 以外の 4xx は FAILED のまま", async () => {
		fakeClient.users.getUser.mockRejectedValue(
			clerkError(401, "authentication_invalid"),
		);
		const result = await getClerkUser("clerk_1");
		expect(result.kind).toBe("FAILED");
	});
});

describe("findClerkUsersByEmail", () => {
	it("全ページを読む", async () => {
		// 1ページ目は100件（満杯）、2ページ目は1件
		const page1 = [];
		for (let i = 0; i < 100; i++) {
			page1.push(fakeUser({ id: `clerk_${i}`, email: "a@example.com" }));
		}
		const page2 = [fakeUser({ id: "clerk_100", email: "a@example.com" })];

		fakeClient.users.getUserList
			.mockResolvedValueOnce({ data: page1, totalCount: 101 })
			.mockResolvedValueOnce({ data: page2, totalCount: 101 });

		const result = await findClerkUsersByEmail("a@example.com");

		expect(fakeClient.users.getUserList).toHaveBeenCalledTimes(2);
		// 2ページ目は offset 100 から読む
		expect(fakeClient.users.getUserList).toHaveBeenLastCalledWith(
			expect.objectContaining({ offset: 100 }),
		);
		expect(result.kind === "SUCCESS" && result.data.length).toBe(101);
	});

	it("email が完全一致しないユーザーは除く", async () => {
		fakeClient.users.getUserList.mockResolvedValue({
			data: [
				fakeUser({ id: "clerk_1", email: "a@example.com" }),
				fakeUser({ id: "clerk_2", email: "aa@example.com" }),
			],
			totalCount: 2,
		});
		const result = await findClerkUsersByEmail("A@example.com");
		expect(result.kind === "SUCCESS" && result.data.map((u) => u.id)).toEqual([
			"clerk_1",
		]);
	});

	it("途中のページで失敗したら、結果は SUCCESS にしない", async () => {
		const page1 = [];
		for (let i = 0; i < 100; i++) {
			page1.push(fakeUser({ id: `clerk_${i}`, email: "a@example.com" }));
		}
		fakeClient.users.getUserList
			.mockResolvedValueOnce({ data: page1, totalCount: 150 })
			.mockRejectedValueOnce(new Error("fetch failed"));

		const result = await findClerkUsersByEmail("a@example.com");
		expect(result).toEqual({ kind: "UNKNOWN", reason: "NETWORK" });
	});
	it("最大ページ数まで読んでも終わらなければ UNKNOWN にして、担当者に知らせる", async () => {
		const fullPage = [];
		for (let i = 0; i < 100; i++) {
			fullPage.push({
				id: `inv_${i}`,
				emailAddress: `user${i}@example.com`,
				publicMetadata: null,
			});
		}
		// 毎回「まだ続きがある」と返す
		fakeClient.invitations.getInvitationList.mockResolvedValue({
			data: fullPage,
			totalCount: 999999,
		});

		const result = await listAllPendingInvitations();

		expect(result).toEqual({ kind: "UNKNOWN", reason: "PAGE_LIMIT" });
		expect(fakeClient.invitations.getInvitationList).toHaveBeenCalledTimes(50);
		expect(notifyOps).toHaveBeenCalledWith(
			"CLERK_PAGE_LIMIT",
			expect.objectContaining({ reason: expect.any(String) }),
		);
	});
});

describe("findPendingInvitations", () => {
	it("pending だけを、完全一致で返す", async () => {
		fakeClient.invitations.getInvitationList.mockResolvedValue({
			data: [
				{
					id: "inv_1",
					emailAddress: "a@example.com",
					publicMetadata: { staffUserId: "user-1" },
				},
				{ id: "inv_2", emailAddress: "aa@example.com", publicMetadata: null },
			],
			totalCount: 2,
		});

		const result = await findPendingInvitations("a@example.com");

		expect(fakeClient.invitations.getInvitationList).toHaveBeenCalledWith(
			expect.objectContaining({ status: "pending" }),
		);
		expect(result).toEqual({
			kind: "SUCCESS",
			data: [{ id: "inv_1", email: "a@example.com", staffUserId: "user-1" }],
		});
	});

	it("本システム以外の招待は staffUserId が null", async () => {
		fakeClient.invitations.getInvitationList.mockResolvedValue({
			data: [
				{ id: "inv_9", emailAddress: "a@example.com", publicMetadata: null },
			],
			totalCount: 1,
		});
		const result = await findPendingInvitations("a@example.com");
		expect(result).toEqual({
			kind: "SUCCESS",
			data: [{ id: "inv_9", email: "a@example.com", staffUserId: null }],
		});
	});
});

describe("revokeInvitation", () => {
	it("成功すると SUCCESS", async () => {
		fakeClient.invitations.revokeInvitation.mockResolvedValue({});
		expect(await revokeInvitation("inv_1")).toEqual({
			kind: "SUCCESS",
			data: null,
		});
	});

	it("既に失効済みなどの 4xx は FAILED", async () => {
		fakeClient.invitations.revokeInvitation.mockRejectedValue(
			clerkError(400, "invitation_already_revoked"),
		);
		const result = await revokeInvitation("inv_1");
		expect(result.kind).toBe("FAILED");
	});
});

describe("listAllPendingInvitations", () => {
	it("email を指定せず、pending の招待をすべて返す", async () => {
		fakeClient.invitations.getInvitationList.mockResolvedValue({
			data: [
				{
					id: "inv_1",
					emailAddress: "A@example.com",
					publicMetadata: { staffUserId: "user-1" },
				},
				{ id: "inv_2", emailAddress: "b@example.com", publicMetadata: null },
			],
			totalCount: 2,
		});

		const result = await listAllPendingInvitations();

		const params = fakeClient.invitations.getInvitationList.mock.calls[0][0];
		expect(params.status).toBe("pending");
		expect(params.query).toBeUndefined();
		expect(result).toEqual({
			kind: "SUCCESS",
			data: [
				{ id: "inv_1", email: "a@example.com", staffUserId: "user-1" },
				{ id: "inv_2", email: "b@example.com", staffUserId: null },
			],
		});
	});
});

describe("getSignUpUrl（招待メールのリンク先）", () => {
	afterEach(() => {
		delete process.env.APP_URL;
	});

	it("APP_URL があれば /sign-up を付ける（最後の / は1つにする）", () => {
		process.env.APP_URL = "https://example.herokuapp.com/";
		expect(getSignUpUrl()).toBe("https://example.herokuapp.com/sign-up");
	});

	it("APP_URL がなければ undefined（Clerk の画面を使う）", () => {
		delete process.env.APP_URL;
		expect(getSignUpUrl()).toBeUndefined();
	});

	it("招待に redirectUrl として渡す", async () => {
		process.env.APP_URL = "http://localhost:3000";
		fakeClient.invitations.createInvitation.mockResolvedValue({
			id: "inv_1",
			emailAddress: "a@example.com",
			publicMetadata: { staffUserId: "user-1" },
		});
		await createStaffInvitation("a@example.com", "user-1");
		expect(fakeClient.invitations.createInvitation).toHaveBeenCalledWith(
			expect.objectContaining({
				redirectUrl: "http://localhost:3000/sign-up",
			}),
		);
	});
});
