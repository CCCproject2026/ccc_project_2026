import type { DeviceStatus, ElderSummary } from "../types/device.types";

// 画面に表示する文字を作る関数（詳細設計 03 の8章）

// デバイスは名前が重複することがあるため、名前とコードを必ず一緒に表示する
// 例: 「センサーA（ESP32-001）」
export function formatDeviceLabel(device: {
	deviceName: string;
	deviceCode: string;
}): string {
	return `${device.deviceName}（${device.deviceCode}）`;
}

// 例: 「山田 太郎（部屋 301）」
// 部屋番号は「301」と「301号室」のどちらでも登録できるため、「号室」は付け足さない
export function formatElderLabel(elder: ElderSummary): string {
	return `${elder.lastName} ${elder.firstName}（部屋 ${elder.roomNumber}）`;
}

// DB の値（英語）を画面の言葉にする
export function formatDeviceStatus(status: DeviceStatus): string {
	if (status === "ACTIVE") {
		return "利用中";
	}
	return "停止中";
}

// 日時を日本時間の「2026/11/18 09:05」の形にする
export function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString("ja-JP", {
		timeZone: "Asia/Tokyo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	});
}
