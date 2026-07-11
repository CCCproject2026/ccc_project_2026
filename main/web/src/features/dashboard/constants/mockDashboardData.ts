// src/features/dashboard/constants/mockDashboardData.ts

import { AlertTriangle, Cpu, UserCheck, Users } from "lucide-react";

/**
 * ============================================================================
 * 【開発者向け説明】
 * このファイルはダッシュボード画面と詳細画面で使用するすべてのモックデータを一元管理しています。
 * 画面上の「統計数字」と「対応履歴の件数」の食い違い（矛盾）を防ぐため、
 * すべて rawResidents の数値をベースに自動計算・動的生成されるロジックを組んでいます。
 *
 * 修正ルール:
 * 1. 住民を追加・削除したり、過去のカウント数を変更したい場合は、
 *    一番上の `rawResidents` 配列の中身だけを直接修正してください。
 * ============================================================================
 */

/**
 * データベースのレコードを模した、加工前の生データ（Source of Truth）
 */
export const rawResidents = [
	{
		id: "yamada-taro",
		name: "山田 太郎",
		age: 91,
		birthday: "1935/03/15",
		room: "101号室",
		deviceName: "ESP32-101",
		batteryLevel: 87,
		falls: 0,
		falseAlarms: 2,
		totalAlarms: 2,
	},
	{
		id: "watanabe-fujiko",
		name: "渡辺 富士子",
		age: 87,
		birthday: "1939/08/22",
		room: "205号室",
		deviceName: "ESP32-102",
		batteryLevel: 18,
		falls: 1, // 転倒があるため、自動的に「アラーム発生中（転倒検知）」となります
		falseAlarms: 0,
		totalAlarms: 1,
	},
	{
		id: "ito-shigeru",
		name: "伊藤 茂",
		age: 89,
		birthday: "1937/11/05",
		room: "203号室",
		deviceName: "ESP32-203",
		batteryLevel: 65,
		falls: 0,
		falseAlarms: 1,
		totalAlarms: 1,
	},
	{
		id: "sato-kayo",
		name: "佐藤 カヨ",
		age: 94,
		birthday: "1932/01/30",
		room: "102号室",
		deviceName: "ESP32-102B",
		batteryLevel: 5, // 15%未満のため、自動的に「アラーム発生中（バッテリー要交換）」となります
		falls: 0,
		falseAlarms: 0,
		totalAlarms: 0,
	},
	{
		id: "suzuki-ichiro",
		name: "鈴木 一郎",
		age: 82,
		birthday: "1944/05/12",
		room: "301号室",
		deviceName: "ESP32-301",
		batteryLevel: 99,
		falls: 2, // 転倒があるため、自動的に「アラーム発生中（転倒検知）」となります
		falseAlarms: 5,
		totalAlarms: 7,
	},
	{
		id: "takahashi-ume",
		name: "高橋 ウメ",
		age: 88,
		birthday: "1938/04/18",
		room: "202号室",
		deviceName: "ESP32-202",
		batteryLevel: 45,
		falls: 0,
		falseAlarms: 0,
		totalAlarms: 0,
	},
	{
		id: "tanaka-jiro",
		name: "田中 次郎",
		age: 85,
		birthday: "1941/09/09",
		room: "105号室",
		deviceName: "ESP32-105",
		batteryLevel: 12, // 転倒およびバッテリー低下の複合パターン
		falls: 1,
		falseAlarms: 1,
		totalAlarms: 2,
	},
	{
		id: "kobayashi-yoshiko",
		name: "小林 よし子",
		age: 90,
		birthday: "1936/12/25",
		room: "305号室",
		deviceName: "ESP32-305",
		batteryLevel: 75,
		falls: 0,
		falseAlarms: 3,
		totalAlarms: 3,
	},
	{
		id: "nakamura-saburo",
		name: "中村 三郎",
		age: 79,
		birthday: "1947/02/14",
		room: "206号室",
		deviceName: "ESP32-206",
		batteryLevel: 50,
		falls: 0,
		falseAlarms: 0,
		totalAlarms: 0,
	},
	{
		id: "kato-kiku",
		name: "加藤 キク",
		age: 92,
		birthday: "1934/07/07",
		room: "103号室",
		deviceName: "ESP32-103",
		batteryLevel: 80,
		falls: 0,
		falseAlarms: 1,
		totalAlarms: 1,
	},
] as const;

// ============================================================================
// 1. アラーム自動判定コアロジック (Logic core)
// ============================================================================

/**
 * 対象の入居者が現在緊急対応を必要とする「アラーム状態」にあるかを判定します。
 * 【ビジネスロジック条件】
 * - 転倒回数が 1回以上 (falls > 0)
 * - または、デバイスのバッテリー残量が 15%未満 (batteryLevel < 15)
 */
export const isAlarmState = (resident: {
	falls: number;
	batteryLevel: number;
}) => {
	return resident.falls > 0 || resident.batteryLevel < 15;
};

/**
 * 生データ（rawResidents）に判定ロジックを噛ませ、UIで使いやすい形に拡張した配列。
 * 画面で入居者一覧をレンダリングする際は、この `residents` をインポートして使用してください。
 */
export const residents = rawResidents.map((r) => ({
	...r,
	// 判定条件を満たしていれば "alarm"、そうでなければ "normal" を自動割り当て
	variant: isAlarmState(r) ? ("alarm" as const) : ("normal" as const),
	// アラームの具体的な発生理由。UIで警告理由のテキストやバッジを出し分ける際に使用します。
	alarmReason:
		r.falls > 0 ? "転倒検知" : r.batteryLevel < 15 ? "バッテリー要交換" : null,
}));

// ============================================================================
// 2. 共通コンポーネント用 連動データ生成
// ============================================================================

// 現在アラーム状態にある住民をリアルタイムに集計
const alarmedResidents = residents.filter((r) => r.variant === "alarm");
const firstAlarmed = alarmedResidents[0];

/**
 * モックデータの「発生時間」が不自然に固定化されるのを防ぐため、
 * ファイル読み込み時刻（現在時刻）から数分前を引いた時刻を動的に返すヘルパー関数。
 */
const getMockTimeAgo = (minutesAgo: number): string => {
	const date = new Date();
	date.setMinutes(date.getMinutes() - minutesAgo);
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${hours}:${minutes}`;
};

/**
 * 画面最上部に表示される赤い「緊急アラーム通知バナー」専用のデータ。
 * 現在アクティブなアラーム情報と自動連動します。
 */
export const mockAlarmData = {
	count: alarmedResidents.length,
	residentName: firstAlarmed ? firstAlarmed.name : "対象者なし",
	room: firstAlarmed ? firstAlarmed.room : "-号室",
	reason: firstAlarmed ? firstAlarmed.alarmReason : "",
	time: getMockTimeAgo(5),
};

/**
 * ダッシュボード上部の「4つの統計カード」に表示する数値データ。
 * 住民数やアクティブアラート数は、配列の長さから自動計算されます。
 */
export const stats = [
	{
		title: "入居者数",
		value: residents.length,
		icon: Users,
		color: "green",
		description: "昨日より 1人 増えました",
	},
	{
		title: "稼働デバイス",
		value: residents.length,
		icon: Cpu,
		color: "violet",
		description: "全台正常にオンライン接続中",
	},
	{
		title: "本日のアラート",
		value: alarmedResidents.length,
		icon: AlertTriangle,
		color: "red",
		description:
			alarmedResidents.length > 0
				? "要対応のアラートがあります"
				: "現在アラートはありません",
	},
	{
		title: "オンラインスタッフ",
		value: 5,
		icon: UserCheck,
		color: "blue",
		description: "ただいま 全員 出勤しています",
	},
] as const;

// ============================================================================
// 3. 詳細画面用ヘルパー関数（履歴自動生成ロジック内蔵）
// ============================================================================

export type ResidentId = (typeof residents)[number]["id"];

/**
 * IDを基に特定の入居者の詳細データを取得する関数。
 *
 * 【重要ロジック: 対応履歴（history）の同期】
 * カードに表示されている「転倒回数」や「誤検知回数」の数値と、下部のテーブルの行数が
 * 完全に一致するように、ループ文を使って履歴オブジェクトを動的に自動生成しています。
 */
export function getResidentDetailById(id: string) {
	const baseInfo = residents.find((r) => r.id === id);
	if (!baseInfo) return null;

	const isAlarming = baseInfo.variant === "alarm";
	const generatedHistory: Array<{
		id: string;
		createdAt: string;
		respondedAt: string;
		duration: string;
		judgment: string;
		staff: string;
		memo: string;
	}> = [];

	// --- ロジック1: 現在アクティブなアラームのシミュレーション ---
	// もし対象者が現在アラーム中（variant: "alarm"）であれば、最上部に「対応中...」の最新ログを1件強制挿入します。
	if (isAlarming) {
		generatedHistory.push({
			id: `${baseInfo.id}-current`,
			createdAt: "2026/07/11 14:15",
			respondedAt: "対応中...",
			duration: "—",
			judgment: "転倒", // 確実にテーブルのフィルターに引っかかる文字列
			staff: "田中 花子",
			memo:
				baseInfo.alarmReason === "バッテリー要交換"
					? "デバイスのバッテリー残量が低下（15%未満）。システム警告を発報、スタッフが交換対応準備中。"
					: "ベッド脇にて転倒検知あり。緊急発報に伴い、現在スタッフが現場へ急行し状況確認中。",
		});
	}

	// --- ロジック2: 過去の「転倒」履歴の生成 ---
	// 上記で追加した「現在進行形のアラーム（1件）」を差し引いた、残りの過去の転倒数ぶんループを回します。
	const pastFalls =
		isAlarming && baseInfo.alarmReason === "転倒検知"
			? Math.max(0, baseInfo.falls - 1)
			: baseInfo.falls;

	for (let i = 0; i < pastFalls; i++) {
		generatedHistory.push({
			id: `${baseInfo.id}-fall-${i}`,
			createdAt: `2026/07/10 10:10`,
			respondedAt: `2026/07/10 10:15`,
			duration: "5分",
			judgment: "転倒",
			staff: "鈴木 健太",
			memo: "ベッドから車椅子への移乗時にバランスを崩し尻もち。怪我なし。念のため経過観察。",
		});
	}

	// --- ロジック3: 「誤検知」履歴の生成 ---
	// 対象者が持っている `falseAlarms` の数値の数だけ正確にループを回し、履歴行を生成します。
	for (let i = 0; i < baseInfo.falseAlarms; i++) {
		generatedHistory.push({
			id: `${baseInfo.id}-false-${i}`,
			createdAt: `2026/07/10 14:${15 + i * 10}`, // 時系列が被らないよう、インデックスに応じて10分ずつずらす設計
			respondedAt: `2026/07/10 14:${18 + i * 10}`,
			duration: "3分",
			judgment: "誤検知",
			staff: "佐藤 美紀",
			memo:
				i === 0
					? "体位変換時の一時的な姿勢崩れによるもの。実際の転倒なし。居住者状態に問題なし。"
					: "リハビリ体操中の大きな腕の動作をセンサーが誤検知。コールにて異常なしを確認済み。",
		});
	}

	return {
		...baseInfo,
		device: {
			name: baseInfo.deviceName,
			id: `dev-${baseInfo.id.substring(0, 3)}-001`,
			battery: baseInfo.batteryLevel,
			lastCommunication: "2026/07/11 14:00",
			status: isAlarming ? "アラーム発生中" : "正常動作中",
		},
		stats: {
			fallCount: baseInfo.falls,
			falseAlarmCount: baseInfo.falseAlarms,
			totalCount: baseInfo.totalAlarms,
		},
		// 上記ロジックで作成された、統計数値と100%整合性の取れた履歴配列を返却
		history: generatedHistory,
	};
}
