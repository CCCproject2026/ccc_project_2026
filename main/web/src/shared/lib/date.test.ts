import { describe, expect, it } from "vitest";
import {
	formatJapaneseDate,
	fromDbDate,
	isRealDate,
	toDbDate,
	todayInJapan,
} from "./date";

describe("isRealDate", () => {
	it("正しい日付は true", () => {
		expect(isRealDate("2026-10-13")).toBe(true);
		expect(isRealDate("2024-02-29")).toBe(true); // うるう年
	});

	it("存在しない日付は false", () => {
		expect(isRealDate("2026-02-30")).toBe(false);
		expect(isRealDate("2025-02-29")).toBe(false); // うるう年ではない
		expect(isRealDate("2026-13-01")).toBe(false);
	});

	it("形が違うものは false", () => {
		expect(isRealDate("2026/10/13")).toBe(false);
		expect(isRealDate("26-10-13")).toBe(false);
		expect(isRealDate("")).toBe(false);
	});
});

describe("todayInJapan", () => {
	it("UTC ではまだ前日でも、日本時間の日付を返す", () => {
		// UTC 2026-10-12 15:30 は、日本時間 2026-10-13 00:30
		const now = new Date("2026-10-12T15:30:00Z");
		expect(todayInJapan(now)).toBe("2026-10-13");
	});
});

describe("toDbDate と fromDbDate", () => {
	it("変換して戻しても日付がずれない", () => {
		const dbDate = toDbDate("2026-10-13");
		expect(fromDbDate(dbDate)).toBe("2026-10-13");
	});
});

describe("formatJapaneseDate", () => {
	it("「年月日」の形にし、先頭の0を付けない", () => {
		expect(formatJapaneseDate(toDbDate("1990-04-01"))).toBe("1990年4月1日");
		expect(formatJapaneseDate(toDbDate("2026-10-13"))).toBe("2026年10月13日");
	});
});
