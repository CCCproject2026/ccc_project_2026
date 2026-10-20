import { describe, expect, it } from "vitest";
import { elderUpdateSchema } from "./schemas";

// 生年月日だけを検証するヘルパー（PATCH 用スキーマでは他の項目は任意）。
const parseDateOfBirth = (value: string) =>
	elderUpdateSchema.safeParse({ dateOfBirth: value });

const localDateString = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
		date.getDate(),
	).padStart(2, "0")}`;

describe("dateOfBirthSchema", () => {
	it("accepts a real date in YYYY-MM-DD format", () => {
		expect(parseDateOfBirth("1990-01-01").success).toBe(true);
	});

	it("accepts a valid leap day", () => {
		expect(parseDateOfBirth("2020-02-29").success).toBe(true);
	});

	// 回帰テスト: new Date("1940-02-31") は 1940-03-02 に繰り上がってしまう。
	it("rejects a non-existent date instead of rolling it over", () => {
		expect(parseDateOfBirth("1940-02-31").success).toBe(false);
		expect(parseDateOfBirth("2019-02-29").success).toBe(false);
		expect(parseDateOfBirth("2020-02-30").success).toBe(false);
	});

	// 回帰テスト: new Date("1940") は 1940-01-01 として解釈されてしまう。
	it("rejects a year-only value", () => {
		expect(parseDateOfBirth("1940").success).toBe(false);
	});

	it("rejects non YYYY-MM-DD formats", () => {
		expect(parseDateOfBirth("1990-1-1").success).toBe(false);
		expect(parseDateOfBirth("1990/01/01").success).toBe(false);
		expect(parseDateOfBirth("1990-01-01T00:00:00Z").success).toBe(false);
	});

	it("rejects an empty value", () => {
		expect(parseDateOfBirth("").success).toBe(false);
	});

	it("rejects a future date", () => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		expect(parseDateOfBirth(localDateString(tomorrow)).success).toBe(false);
	});

	it("rejects an age over 130", () => {
		expect(parseDateOfBirth("1800-01-01").success).toBe(false);
	});
});
