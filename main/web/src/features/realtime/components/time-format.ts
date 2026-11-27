// 受信状態・アラートの時刻表示に使う小さな関数

// 日本時間の「10:02:05」
export function formatClockTime(value: Date): string {
	return value.toLocaleTimeString("ja-JP", {
		timeZone: "Asia/Tokyo",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	});
}

// 「3秒前」「5分前」「2時間前」
export function formatElapsed(value: Date, now: Date): string {
	const seconds = Math.floor((now.getTime() - value.getTime()) / 1000);
	if (seconds < 0) return "未来の時刻";
	if (seconds < 60) return `${seconds}秒前`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}分前`;
	return `${Math.floor(minutes / 60)}時間前`;
}
