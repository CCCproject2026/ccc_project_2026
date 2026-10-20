import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { profileUpdateSchema } from "./profile-input";

// 正しい入力の例。各テストでは、ここから1項目だけ変えて試す
const validInput = {
	lastName: " 田中 ",
	firstName: "花子",
	dateOfBirth: "1990-04-01",
	nationality: "日本",
	gender: "FEMALE",
};

describe("profileUpdateSchema", () => {
	beforeEach(() => {
		// 「今」を日本時間 2026-10-13 00:30 に固定する（UTC ではまだ 10-12）
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-10-12T15:30:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("正しい入力は通る。姓は前後の空白がなくなる", () => {
		const result = profileUpdateSchema.parse(validInput);
		expect(result.lastName).toBe("田中");
		expect(result.gender).toBe("FEMALE");
	});

	it("名が空白だけならエラー", () => {
		const result = profileUpdateSchema.safeParse({
			...validInput,
			firstName: "   ",
		});
		expect(result.success).toBe(false);
	});

	it("姓は50文字までOK、51文字はエラー", () => {
		const ok = profileUpdateSchema.safeParse({
			...validInput,
			lastName: "あ".repeat(50),
		});
		const ng = profileUpdateSchema.safeParse({
			...validInput,
			lastName: "あ".repeat(51),
		});
		expect(ok.success).toBe(true);
		expect(ng.success).toBe(false);
	});

	it("生年月日が昨日ならOK、今日ならエラー（日本時間で判定）", () => {
		const ok = profileUpdateSchema.safeParse({
			...validInput,
			dateOfBirth: "2026-10-12",
		});
		const ng = profileUpdateSchema.safeParse({
			...validInput,
			dateOfBirth: "2026-10-13",
		});
		expect(ok.success).toBe(true);
		expect(ng.success).toBe(false);
	});

	it("存在しない日付・形式違いの生年月日はエラー", () => {
		const notReal = profileUpdateSchema.safeParse({
			...validInput,
			dateOfBirth: "1990-02-30",
		});
		const wrongFormat = profileUpdateSchema.safeParse({
			...validInput,
			dateOfBirth: "1990/04/01",
		});
		expect(notReal.success).toBe(false);
		expect(wrongFormat.success).toBe(false);
	});

	it("国籍が空ならエラー、101文字もエラー", () => {
		const empty = profileUpdateSchema.safeParse({
			...validInput,
			nationality: "",
		});
		const tooLong = profileUpdateSchema.safeParse({
			...validInput,
			nationality: "あ".repeat(101),
		});
		expect(empty.success).toBe(false);
		expect(tooLong.success).toBe(false);
	});

	it("性別は MALE / FEMALE 以外を受け付けない", () => {
		const result = profileUpdateSchema.safeParse({
			...validInput,
			gender: "女性",
		});
		expect(result.success).toBe(false);
	});

	it("5項目のどれかが足りなければエラー（部分更新はしない）", () => {
		const result = profileUpdateSchema.safeParse({
			...validInput,
			nationality: undefined,
		});
		expect(result.success).toBe(false);
	});

	// 本人が変えてはいけない項目が送られてきたら、無視ではなくエラーにする
	it.each([
		["role", "NURSE"],
		["status", "ACTIVE"],
		["email", "other@example.com"],
		["startDate", "2026-10-01"],
		["endDate", "2026-12-31"],
		["clerkUserId", "user_123"],
	])("%s が含まれていたらエラー", (key, value) => {
		const result = profileUpdateSchema.safeParse({
			...validInput,
			[key]: value,
		});
		expect(result.success).toBe(false);
	});
});
