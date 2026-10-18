/**
 * 高齢者一覧のページネーション計算。
 * 一覧ページの表示補正ロジックを単体テストできるよう、コンポーネントから分離している。
 */

/** 総件数と1ページあたりの件数から総ページ数を求める（最低1ページ）。 */
export function getTotalPages(total: number, limit: number): number {
	if (limit <= 0) return 1;
	return Math.max(1, Math.ceil(total / limit));
}

/**
 * 現在ページを有効範囲（1〜総ページ数）に補正する。
 *
 * 件数が減ったときに重要。例: 在籍中21件の2ページ目で1件を退所させると
 * 再取得後の total は20になり総ページ数は1になる。page が2のままだと
 * 一覧が空になりページ操作もできなくなるため、1に補正する。
 */
export function clampPage(page: number, total: number, limit: number): number {
	return Math.min(Math.max(1, page), getTotalPages(total, limit));
}
