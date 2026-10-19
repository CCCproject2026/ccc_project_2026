import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { staffInviteSchema, staffReinviteSchema } from "./staff-input";

// 正しい入力の例。各テストでは、ここから1項目だけ変えて試す
const validInput = {
	email: "  Hanako.Tanaka@Example.com ",
	role: "NURSE",
	lastName: " 田中 ",
	firstName: "花子",
	dateOfBirth: "1990-04-01",
	startDate: "2026-10-01",
	nationality: "日本",
	gender: "FEMALE",
};

describe("staffInviteSchema（性別）", () => {
	it("性別は選択肢以外を受け付けない", () => {
		const result = staffInviteSchema.safeParse({
			...validInput,
			gender: "その他",
		});
		expect(result.success).toBe(false);
	});
});

describe("staffInviteSchema", () => {
	beforeEach(() => {
		// 「今」を日本時間 2026-10-13 00:30 に固定する（UTC ではまだ 10-12）
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-10-12T15:30:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("正しい入力は通る。email は小文字・空白なし、姓は空白なしになる", () => {
		const result = staffInviteSchema.parse(validInput);
		expect(result.email).toBe("hanako.tanaka@example.com");
		expect(result.lastName).toBe("田中");
	});

	it("メールの形でないものはエラー", () => {
		const result = staffInviteSchema.safeParse({
			...validInput,
			email: "not-an-email",
		});
		expect(result.success).toBe(false);
	});

	it("NURSE / CAREGIVER 以外のロールはエラー", () => {
		const result = staffInviteSchema.safeParse({
			...validInput,
			role: "ADMIN",
		});
		expect(result.success).toBe(false);
	});

	it("姓が空白だけならエラー", () => {
		const result = staffInviteSchema.safeParse({
			...validInput,
			lastName: "   ",
		});
		expect(result.success).toBe(false);
	});

	it("姓は50文字までOK、51文字はエラー", () => {
		const ok = staffInviteSchema.safeParse({
			...validInput,
			lastName: "あ".repeat(50),
		});
		const ng = staffInviteSchema.safeParse({
			...validInput,
			lastName: "あ".repeat(51),
		});
		expect(ok.success).toBe(true);
		expect(ng.success).toBe(false);
	});

	it("生年月日が昨日ならOK、今日ならエラー（日本時間で判定）", () => {
		const yesterday = staffInviteSchema.safeParse({
			...validInput,
			dateOfBirth: "2026-10-12",
		});
		const today = staffInviteSchema.safeParse({
			...validInput,
			dateOfBirth: "2026-10-13",
		});
		expect(yesterday.success).toBe(true);
		expect(today.success).toBe(false);
	});

	it("存在しない入職日はエラー", () => {
		const result = staffInviteSchema.safeParse({
			...validInput,
			startDate: "2026-02-30",
		});
		expect(result.success).toBe(false);
	});

	it("国籍は100文字を超えるとエラー", () => {
		const result = staffInviteSchema.safeParse({
			...validInput,
			nationality: "a".repeat(101),
		});
		expect(result.success).toBe(false);
	});
});

describe("staffReinviteSchema", () => {
	it("email は入力に含まれない（送っても結果から消える）", () => {
		const result = staffReinviteSchema.parse(validInput);
		expect("email" in result).toBe(false);
	});

	it("生年月日・入職日・国籍・性別は空欄でも通り、undefined になる（今の値のまま）", () => {
		const result = staffReinviteSchema.parse({
			role: "CAREGIVER",
			lastName: "田中",
			firstName: "花子",
			dateOfBirth: "",
			startDate: "",
			nationality: "",
			gender: "",
		});
		expect(result.dateOfBirth).toBeUndefined();
		expect(result.startDate).toBeUndefined();
		expect(result.nationality).toBeUndefined();
		expect(result.gender).toBeUndefined();
	});

	it("入力された項目は、新規招待と同じようにチェックする", () => {
		const result = staffReinviteSchema.safeParse({
			...validInput,
			startDate: "2026-02-30",
		});
		expect(result.success).toBe(false);
	});

	it("姓・名は空欄にできない", () => {
		const result = staffReinviteSchema.safeParse({
			...validInput,
			lastName: "",
		});
		expect(result.success).toBe(false);
	});
});
