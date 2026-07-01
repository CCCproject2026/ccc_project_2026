import { AlertTriangle, Cpu, UserCheck, Users } from "lucide-react";

/**
 * stats:
 * - JSXではなく「コンポーネント参照」に変更
 * - UIとデータを分離することで再利用性とテスト性を向上
 */
export const stats = [
	{
		title: "入居者数",
		value: 12,
		icon: Users,
		color: "text-green-600",
		describe: "入居者の総数を表示します。",
	},
	{
		title: "稼働デバイス",
		value: 8,
		icon: Cpu,
		color: "text-violet-600",
		describe: "現在稼働中のデバイスの数を表示します。",
	},
	{
		title: "本日のアラート",
		value: 3,
		icon: AlertTriangle,
		color: "text-red-600",
		describe: "本日発生したアラートの総数を表示します。",
	},
	{
		title: "オンラインスタッフ",
		value: 5,
		icon: UserCheck,
		color: "text-blue-600",
		describe: "現在オンラインのスタッフの数を表示します。",
	},
] as const;

/**
 * residents:
 * - ダッシュボード表示用のモックデータ
 * - 実データAPIに置き換え予定
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
		batteryLevel: 18,
		falls: 1,
		falseAlarms: 0,
		totalAlarms: 1,
		variant: "alarm",
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
] as const;
