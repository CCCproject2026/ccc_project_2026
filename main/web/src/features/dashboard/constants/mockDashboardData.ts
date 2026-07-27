// src/features/dashboard/constants/mockDashboardData.ts

import { AlertTriangle, Cpu, UserCheck, Users } from "lucide-react";

/**
 * ============================================================================
 * 【開発者向け設計ドキュメント & ガイドライン】
 * 
 * 1. 本ファイルの目的:
 *    ダッシュボード画面と詳細画面で使用するすべての状態データ・統計数値を一元管理します。
 *    「カード上の集計数」と「下部のタイムラインテーブルの行数」のデータ不整合（矛盾）を
 *    防ぐため、すべての数値はコアの `rawResidents` から自動計算・動的生成される設計です。
 * 
 * 2. リアルタイムデータ（本番API/WebSocket）移行時の変更ポイント:
 *    - 【STEP 1】現在の `rawResidents` 配列および下部の `residents` マップロジックを全削除します。
 *    - 【STEP 2】React Context、TanStack Query(SWR)、または WebSocket Hook 等から、データベース
 *                （MongoDB/PostgreSQL等）由来の最新の入居者ステート配列を受け取ります。
 *    - 【STEP 3】本ファイルに定義されている `isAlarmState` 判定ロジックと各集計オブジェクト（`stats`, 
 *                `mockAlarmData`）の変数名・エクスポート形式を維持したまま、中身をリアルタイムデータ
 *                ストリームにバインドさせてください。これにより、UI側への影響を最小限に抑えられます。
 * ============================================================================
 */

/**
 * データベースのレコードを模した、加工前の生データ（Source of Truth）
 * 
 * 各フィールドの定義と役割:
 * - id: ルーティング (`/dashboard/[id]`) の動的パラメータ（Slug）と1対1で対応する一意識別キー。
 * - name / age / birthday / room: UIのプロフィールカードやヘッダーに描画される基本属性情報。
 * - deviceName: 施設に設置された中継ハードウェア端末名。端末ステータス欄に表示。
 * - batteryLevel: 残量（0〜100%）。15%未満でシステムが自動的に「バッテリー要交換警告」をトリガー。
 * - falls: 過去に発生した【累積の確定転倒回数】。統計カードおよび過去履歴の行数生成に使用。
 * - falseAlarms: 過去の【累積誤検知回数】。詳細画面のカウンターと誤検知履歴の同期に使用。
 * - totalAlarms: `falls + falseAlarms` の総和。監査ログや対応実績の母数。
 * - hasActiveFallAlarm: 【最重要フィールド】現在進行形でリアルタイムに転倒が発生しているかを示す緊急フラグ。
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
        // 【型安全性の確保（Type Consistency）】
        // TypeScript のオブジェクト形状の一貫性を保ち、判定関数内での `undefined` 発生に伴う
        // 意図しない判定バグ（UI表示のブレ）を防ぐため、正常状態であっても明示的に `false` を宣言します。
        hasActiveFallAlarm: false,
    },
    {
        id: "watanabe-fujiko",
        name: "渡辺 富士子",
        age: 87,
        birthday: "1939/08/22",
        room: "205号室",
        deviceName: "ESP32-102",
        batteryLevel: 18,
        falls: 1,
        falseAlarms: 0,
        totalAlarms: 1,
        hasActiveFallAlarm: true, // リアルタイムで転倒アラームが現在進行形で鳴っている状態
    },
    {
        id: "ito-shigeru",
        name: "伊藤 茂",
        age: 89,
        birthday: "1937/11/05",
        room: "203号室",
        deviceName: "ESP32-203",
        batteryLevel: 65,
        falls: 1,
        falseAlarms: 1,
        totalAlarms: 2,
        hasActiveFallAlarm: false,
    },
    {
        id: "sato-kayo",
        name: "佐藤 カヨ",
        age: 94,
        birthday: "1932/01/30",
        room: "102号室",
        deviceName: "ESP32-102B",
        batteryLevel: 5, // 15%未満のため、システム判定で自動的に「バッテリー警告」扱い
        falls: 0,
        falseAlarms: 0,
        totalAlarms: 0,
        hasActiveFallAlarm: false, // 転倒自体はしていないため、不要な転倒アラーム誤作動を防ぐ
    },
    {
        id: "suzuki-ichiro",
        name: "鈴木 一郎",
        age: 82,
        birthday: "1944/05/12",
        room: "301号室",
        deviceName: "ESP32-301",
        batteryLevel: 99,
        falls: 2, // 過去に2回倒れた実績があるが、現在はすでにスタッフが対応を完了し正常復帰しているケース
        falseAlarms: 5,
        totalAlarms: 7,
        hasActiveFallAlarm: false, // 過去の回数(falls)に引きずられて「永続アラーム化」するのを防ぐため false
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
        hasActiveFallAlarm: false,
    },
    {
        id: "tanaka-jiro",
        name: "田中 次郎",
        age: 85,
        birthday: "1941/09/09",
        room: "105号室",
        deviceName: "ESP32-105",
        batteryLevel: 12, // バッテリー低下（15%未満）かつ、リアルタイム転倒アラームが同時に発生している「複合アラーム」のテストケース
        falls: 0,
        falseAlarms: 1,
        totalAlarms: 2,
        hasActiveFallAlarm: true,
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
        hasActiveFallAlarm: false,
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
        hasActiveFallAlarm: false,
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
        hasActiveFallAlarm: false,
    },
] as const;

// ============================================================================
// 1. アラーム自動判定コアロジック (Logic core)
// ============================================================================

/**
 * 対象の入居者が現在緊急対応を必要とする「アラーム状態」にあるかを一括判定する共通関数。
 * 
 * 判定ルール:
 * - 「現在アクティブな転倒アラームフラグが true」であるか
 * - または「デバイスのバッテリー残量が 15%未満」であればアラーム状態とみなす。
 * 
 * 【本番データ移行時】:
 * サーバーサイドの判定ロジックやDBスキーマが確定した後は、この関数内の条件式を変更する、
 * あるいはバックエンドから返ってきた `status === 'ALARM'` のようなステータス文字列の直接参照に置き換えてください。
 */
export const isAlarmState = (resident: {
    hasActiveFallAlarm: boolean;
    batteryLevel: number;
}) => {
    return resident.hasActiveFallAlarm || resident.batteryLevel < 15;
};

/**
 * 生データ（rawResidents）に判定ロジックを自動適用し、UIレンダリングに最適化されたメタデータ付きの配列。
 * 画面で入居者カード一覧を出力するコンポーネント（`ResidentGrid`等）は、本配列を直接マッピングして使用します。
 */
export const residents = rawResidents.map((r) => ({
    ...r,
    // 判定条件を満たしていればデザインスタイル定義用のリテラル "alarm"、そうでなければ "normal" を自動割り当て
    variant: isAlarmState(r) ? ("alarm" as const) : ("normal" as const),
    // アラームの具体的な発生理由。UIで警告メッセージやバッジのテキストを条件分岐で出し分ける際に直接参照されます。
    // 優先度として、より緊急性の高い「転倒検知」をバッテリー警告よりも優先して格納します。
    alarmReason:
        r.hasActiveFallAlarm ? "転倒検知" : r.batteryLevel < 15 ? "バッテリー要交換" : null,
}));

// ============================================================================
// 2. 共通コンポーネント用 連動データ生成
// ============================================================================

// 現在施設内でアラームが発生している全住民をリアルタイムにフィルタリング
const alarmedResidents = residents.filter((r) => r.variant === "alarm");
const firstAlarmed = alarmedResidents[0];

/**
 * モックデータの「発生時間」が画面リロード時に古く不自然な固定値になるのを防ぐため、
 * アプリケーション実行時の現在時刻から特定の相対分数（minutesAgo）を差し引いた
 * 時分テキスト（例: "14:15"）を動的に組み立てるユーティリティ。
 */
const getMockTimeAgo = (minutesAgo: number): string => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - minutesAgo);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
};

/**
 * 画面の最上部（Layoutレイヤー）にマウントされる、赤い「緊急アラーム通知バナー」コンポーネント専用データ。
 * 本番データ移行時】:
 * このオブジェクトは WebSocket や SSE（Server-Sent Events）のグローバルな通知イベントリスナーと紐づけ、
 * システム全体へブロードキャストするリアルタイム通知ステートに置き換えてください。
 */
export function getMockAlarmData() {
	return {
		count: alarmedResidents.length,
		residentName: firstAlarmed ? firstAlarmed.name : "対象者なし",
		room: firstAlarmed ? firstAlarmed.room : "-号室",
		reason: firstAlarmed ? firstAlarmed.alarmReason : "",
		time: getMockTimeAgo(5),
	};
}

/**
 * ダッシュボード上部に並ぶ「4つの主要統計KPIカード」へ渡されるデータ構造。
 * 施設全体のサマリー情報を表します。
 */
export const stats = [
    {
        title: "入居者数",
        value: residents.length, // 配列全体の長さから自動算出
        icon: Users,
        color: "green",
        description: "昨日より 1人 増えました",
    },
    {
        title: "稼働デバイス",
        value: residents.length, // 1人1台の割り当てモデルを想定し自動連動
        icon: Cpu,
        color: "violet",
        description: "全台正常にオンライン接続中",
    },
    {
        title: "本日のアラート",
        value: alarmedResidents.length, // リアルタイムアラーム中の件数と動的同期
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
 * 入居者個別IDをキーに検索し、プロフィール、紐づくデバイス情報、
 * および下部テーブルに出力するための「過去の全対応履歴ログ」を動的に生成して返すヘルパー関数。
 * 
 * 【本番データ移行時】:
 * この関数全体を、APIエンドポイント `/api/residents/[id]` もしくは直接データベース（ORM）から
 * `resident_history` 照会テーブルを `SELECT` して持ってくる非同期クエリ関数 (`async/await`) へ移行します。
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

    // --- ロジック1: 現在アクティブ（対応中）な最新アラームの履歴行を追加 ---
    // 対象者がアラーム状態である場合、タイムラインの先頭（最上部）に「対応中...」のステータス行を1行差し込みます。
    if (isAlarming) {
        // バッテリー低下が原因の発報であるかをチェックしてフラグを確定
        const isBatteryIssue = baseInfo.alarmReason === "バッテリー要交換";

        generatedHistory.push({
            id: `${baseInfo.id}-current`,
            createdAt: "2026/07/11 14:15",
            respondedAt: "対応中...",
            duration: "—",
            // 判定結果文字列（judgment）を正しく出し分けることで、テーブル側のバッジ配色と連動させます。
            judgment: isBatteryIssue ? "バッテリー低下" : "転倒", 
            staff: "田中 花子",
            memo: isBatteryIssue
                ? "デバイスのバッテリー残量が低下（15%未満）。システム警告を発報、スタッフが交換対応準備中。"
                : "ベッド脇にて転倒検知あり。緊急発報に伴い、現在スタッフが現場へ急行し状況確認中。",
        });
    }

    // --- ロジック2: 過去の「確定転倒」の履歴行をループ生成 ---
    // 現在進行形で転倒アラームが鳴っている人の場合、最上部の「対応中」の行で1カウント消費しているため、
    // 過去ログの一覧を作る際は `baseInfo.falls - 1` をループ上限値に設定して帳尻を合わせます。
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

    // --- ロジック3: 「誤検知」の過去履歴行をループ生成 ---
    // `falseAlarms` の数値と全く同じ数だけの履歴オブジェクト行を配列にプッシュします。
    for (let i = 0; i < baseInfo.falseAlarms; i++) {
        generatedHistory.push({
            id: `${baseInfo.id}-false-${i}`,
            createdAt: `2026/07/10 14:${15 + i * 10}`,
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

    // 各カードコンポーネントが求める拡張スキーマ構造にデータを整形してリターン
    return {
        ...baseInfo,
        // デバイス管理モジュール用オブジェクト
        //  AFTER (Updated implementation)
device: {
    name: baseInfo.deviceName,
    id: `dev-${baseInfo.id.substring(0, 3)}-001`,
    battery: baseInfo.batteryLevel,
    lastCommunication: "2026/07/11 14:00",
    // 1. Add the boolean flag Option A expects (Checking if battery is dead, otherwise true)
    isOnline: baseInfo.batteryLevel > 0, 
    // 2. Keep or remove the text status based on whether other components use it
    status: isAlarming ? "アラーム発生中" : "正常動作中", 
},
        // 集計数字バッジカード用オブジェクト
        stats: {
            fallCount: baseInfo.falls,
            falseAlarmCount: baseInfo.falseAlarms,
            totalCount: baseInfo.totalAlarms,
        },
        // 詳細画面下部の履歴テーブルにそのまま渡される配列（降順ソートが効いた形になります）
        history: generatedHistory,
    };
}