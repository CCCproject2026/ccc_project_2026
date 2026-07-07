import { AlertTriangle, Cpu, UserCheck, Users } from "lucide-react";

/**
 * * このファイルはダッシュボード画面で使用するすべてのモックデータを管理しています。
 * 画面の表示崩れやデータの矛盾（食い違い）を防ぐため、以下の自動連携システムを組んでいます。
 * * 修正ルール:
 * 1. 住民を追加・削除したり、ステータス（正常/アラーム）を変えたいときは、
 * 一番上の `residents` 配列の中身だけを修正してください。
 * 2. `mockAlarmData`（バナー用データ）と `stats`（統計カードの数字）は、
 * `residents` の状態から自動的に計算・連動されるため、手動で修正する必要はありません。
 */

export const residents = [
	{
		name: "山田 太郎",
		age: 91,
		room: "101号室",
		deviceName: "ESP32-101",
		batteryLevel: 87,
		falls: 0,
		falseAlarms: 2,
		totalAlarms: 2,
		variant: "normal",
	},
	{
		name: "渡辺 富士子",
		age: 87,
		room: "205号室",
		deviceName: "ESP32-102",
		batteryLevel: 18, // バッテリー低下テスト用
		falls: 1,
		falseAlarms: 0,
		totalAlarms: 1,
		variant: "alarm", // アラーム発生中
	},
	{
		name: "伊藤 茂",
		age: 89,
		room: "203号室",
		deviceName: "ESP32-203",
		batteryLevel: 65,
		falls: 0,
		falseAlarms: 1,
		totalAlarms: 1,
		variant: "normal",
	},
	{
		name: "佐藤 カヨ",
		age: 94,
		room: "102号室",
		deviceName: "ESP32-102B",
		batteryLevel: 5, // バッテリー切れ寸前テスト用
		falls: 0,
		falseAlarms: 0,
		totalAlarms: 0,
		variant: "normal",
	},
	{
		name: "鈴木 一郎",
		age: 82,
		room: "301号室",
		deviceName: "ESP32-301",
		batteryLevel: 99,
		falls: 2,
		falseAlarms: 5,
		totalAlarms: 7,
		variant: "normal",
	},
	{
		name: "高橋 ウメ",
		age: 88,
		room: "202号室",
		deviceName: "ESP32-202",
		batteryLevel: 45,
		falls: 0,
		falseAlarms: 0,
		totalAlarms: 0,
		variant: "normal",
	},
	{
		name: "田中 次郎",
		age: 85,
		room: "105号室",
		deviceName: "ESP32-105",
		batteryLevel: 12,
		falls: 1,
		falseAlarms: 1,
		totalAlarms: 2,
		variant: "alarm", // アラーム発生中（2人目）
	},
	{
		name: "小林 よし子",
		age: 90,
		room: "305号室",
		deviceName: "ESP32-305",
		batteryLevel: 75,
		falls: 0,
		falseAlarms: 3,
		totalAlarms: 3,
		variant: "normal",
	},
	{
		name: "中村 三郎",
		age: 79,
		room: "206号室",
		deviceName: "ESP32-206",
		batteryLevel: 50,
		falls: 0,
		falseAlarms: 0,
		totalAlarms: 0,
		variant: "normal",
	},
	{
		name: "加藤 キク",
		age: 92,
		room: "103号室",
		deviceName: "ESP32-103",
		batteryLevel: 80,
		falls: 0,
		falseAlarms: 1,
		totalAlarms: 1,
		variant: "normal",
	},
] as const;

// ==========================================
// 内部ロジック（触らなくてOKです）
// ==========================================

// アラームが発生している（variant が "alarm"）住民だけを自動抽出
const alarmedResidents = residents.filter((r) => r.variant === "alarm");
const firstAlarmed = alarmedResidents[0];

/**
 * テスト用に、ファイルの読み込み時刻から数分前の時間を自動生成するヘルパー
 * 例：いまが14:30なら、5分前を指定すると "14:25" を返します
 */
const getMockTimeAgo = (minutesAgo: number): string => {
	const date = new Date();
	date.setMinutes(date.getMinutes() - minutesAgo);
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${hours}:${minutes}`;
};

//  アラームバナー用データ (自動連動)

export const mockAlarmData = {
	// 住民データの中のアラーム発生数を自動カウント
	count: alarmedResidents.length,
	// 最初に見つかったアラーム対象者の情報をセット
	residentName: firstAlarmed ? firstAlarmed.name : "対象者なし",
	room: firstAlarmed ? firstAlarmed.room : "-号室",
	// バナーのリアルタイムタイマーテスト用に「5分前」をデフォルトセット
	time: getMockTimeAgo(5),
};

// ==========================================
// 3. 統計カード用データ (自動連動)
// ==========================================
export const stats = [
	{
		title: "入居者数",
		value: residents.length, // 住民リストの合計人数と自動連動
		icon: Users,
		color: "green",
		description: "昨日より 1人 増えました",
	},
	{
		title: "稼働デバイス",
		value: 8,
		icon: Cpu,
		color: "violet",
		description: "先週より 2台 減っています",
	},
	{
		title: "本日のアラート",
		value: alarmedResidents.length, // 現在発生中のアラート数と自動連動
		icon: AlertTriangle,
		color: "red",
		description: "1時間前から 発生していません",
	},
	{
		title: "オンラインスタッフ",
		value: 5,
		icon: UserCheck,
		color: "blue",
		description: "ただいま 全員 出勤しています",
	},
] as const;
