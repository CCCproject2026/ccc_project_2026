import { describe, expect, it } from "vitest";
import {
	isOrphanedInvitation,
	shouldDeleteInvitation,
} from "@/features/staff-management/server/invitation-state";

// 放置された招待の判定
// （Clerk は、同じメールアドレスの招待が残っていると新しい招待を作れない）
describe("isOrphanedInvitation", () => {
	it("取り消すだけで済む pending は、放置された招待ではない", () => {
		expect(isOrphanedInvitation({ status: "pending" })).toBe(false);
	});

	it("受け入れ済み（accepted）は、放置された招待として扱う", () => {
		expect(isOrphanedInvitation({ status: "accepted" })).toBe(true);
	});

	it("取り消し済み（revoked）も、放置された招待として扱う", () => {
		expect(isOrphanedInvitation({ status: "revoked" })).toBe(true);
	});

	it("状態が空でも判定できる（放置された招待として扱う）", () => {
		expect(isOrphanedInvitation({ status: "" })).toBe(true);
	});
});

// 削除してよい招待かどうか
describe("shouldDeleteInvitation", () => {
	it("受け入れ済みで、アカウントが無い招待は削除する", () => {
		expect(
			shouldDeleteInvitation({
				invitationStatus: "accepted",
				clerkUserCount: 0,
			}),
		).toBe(true);
	});

	it("アカウントが残っているときは、受け入れ済みの招待も消さない", () => {
		expect(
			shouldDeleteInvitation({
				invitationStatus: "accepted",
				clerkUserCount: 1,
			}),
		).toBe(false);
	});

	it("pending の招待は消さない（既存の ALREADY_INVITED で扱えるため）", () => {
		expect(
			shouldDeleteInvitation({
				invitationStatus: "pending",
				clerkUserCount: 0,
			}),
		).toBe(false);
	});
});
