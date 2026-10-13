// 日付を扱う共通の関数
// 日付はすべて "YYYY-MM-DD" の文字列で受け取る

// "YYYY-MM-DD" の形で、本当にある日付かどうかを調べる
export function isRealDate(value: string): boolean {
	// まず形をチェックする（例: 2026-10-13）
	const pattern = /^\d{4}-\d{2}-\d{2}$/;
	if (!pattern.test(value)) {
		return false;
	}

	// Date に変換して、もう一度文字列に戻す。
	// 2026-02-30 のような日付は 2026-03-02 に変わってしまうので、元と違えば「ない日付」
	const date = new Date(`${value}T00:00:00.000Z`);
	if (Number.isNaN(date.getTime())) {
		return false;
	}
	const dateText = date.toISOString().slice(0, 10);
	return dateText === value;
}

// 日本時間の「今日」を "YYYY-MM-DD" で返す
// （サーバーは UTC で動くことが多いので、時差を考えて日本時間で計算する）
export function todayInJapan(now: Date = new Date()): string {
	// "en-CA" は日付を "2026-10-13" の形で出してくれる
	return now.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

// "YYYY-MM-DD" を DB に保存する Date に変換する
// UTC の 0 時にしておくと、DB の Date 型に保存しても日付がずれない
export function toDbDate(value: string): Date {
	return new Date(`${value}T00:00:00.000Z`);
}

// DB から読んだ Date を "YYYY-MM-DD" に戻す
export function fromDbDate(value: Date): string {
	return value.toISOString().slice(0, 10);
}
