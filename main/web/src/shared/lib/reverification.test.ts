import { describe, expect, it } from "vitest";
import { isReverificationHint, requiresReverification } from "./reverification";

describe("requiresReverification", () => {
	// 退所（INACTIVE への変更）は DELETE と同じく再認証が必要。
	it("requires re-verification when moving to INACTIVE (退所)", () => {
		expect(requiresReverification({ status: "INACTIVE" })).toBe(true);
	});

	it("does not require it for reactivation", () => {
		expect(requiresReverification({ status: "ACTIVE" })).toBe(false);
	});

	it("does not require it for updates without a status change", () => {
		expect(requiresReverification({})).toBe(false);
	});
});

describe("isReverificationHint", () => {
	it("detects Clerk's reverification response body", () => {
		expect(isReverificationHint({ clerk_error: { reason: "reverification" } })).toBe(true);
	});

	it("rejects other bodies", () => {
		expect(isReverificationHint({ error: "Forbidden" })).toBe(false);
		expect(isReverificationHint(null)).toBe(false);
	});
});