import { describe, expect, it } from "vitest";
import { clampPage, getTotalPages } from "./pagination";

describe("getTotalPages", () => {
	it("returns 1 when there are no items", () => {
		expect(getTotalPages(0, 20)).toBe(1);
	});

	it("rounds up partial pages", () => {
		expect(getTotalPages(1, 20)).toBe(1);
		expect(getTotalPages(20, 20)).toBe(1);
		expect(getTotalPages(21, 20)).toBe(2);
		expect(getTotalPages(40, 20)).toBe(2);
		expect(getTotalPages(41, 20)).toBe(3);
	});

	it("never divides by zero", () => {
		expect(getTotalPages(21, 0)).toBe(1);
	});
});

describe("clampPage", () => {
	it("keeps a page that is already in range", () => {
		expect(clampPage(1, 21, 20)).toBe(1);
		expect(clampPage(2, 21, 20)).toBe(2);
	});

	it("never returns less than 1", () => {
		expect(clampPage(0, 21, 20)).toBe(1);
		expect(clampPage(-5, 0, 20)).toBe(1);
	});

	// 回帰テスト: フィルター中の最終ページで最後の1名を更新するケース
	// 「在籍中」が21件の状態で2ページ目の1名を退所させると total は20になる。
	// page を2のままにすると一覧が空になり「前へ」も出なくなるため、1に補正する必要がある。
	it("pulls back to the last valid page when the total shrinks (filtered last page)", () => {
		expect(clampPage(2, 21, 20)).toBe(2); // 退所前: まだ2ページ目は有効
		expect(clampPage(2, 20, 20)).toBe(1); // 退所後: 1ページ目へ補正
	});

	// 同様に「退所・無効」フィルターで在籍へ戻した場合も件数が減る。
	it("pulls back for the inactive filter as well", () => {
		expect(clampPage(2, 20, 20)).toBe(1);
		expect(clampPage(1, 20, 20)).toBe(1);
	});
});
