// AI判定結果の受信（詳細設計 web/03）で使う型
// 状態はすべてブラウザのメモリ上に持つ。DB には保存しない。

/** 検証済みの1件（R1 を通ったもの） */
export type FallEvent = {
	dedupeKey: string; // event_id、無ければ device_code + detected_at + model_version
	deviceCode: string;
	result: "fall" | "normal";
	detectedAt: Date;
	modelVersion: string;
	retained: boolean; // Broker から Retain 付きで届いた
	receivedAt: Date;
};

/** 未対応アラート（転倒の「可能性」。確定ではない） */
export type UnhandledAlert = {
	alertId: string; // 最初の fall の dedupeKey
	deviceCode: string;
	elder: { id: string; name: string; room: string } | null; // null = 未割当
	firstDetectedAt: Date;
	lastDetectedAt: Date;
	fallCount: number;
	late: boolean; // R4 で古いと判定した（遅れて届いた）
	// unhandled = 未対応、in_progress = 対応中（対応開始済み・記録が未完了）
	// 記録を保存したアラートは一覧から外す
	status: "unhandled" | "in_progress";
	responseStartedAt: Date | null; // 「対応開始」を押した時刻
};

/** 機器の割当（サーバーから props で受け取る。日時は ISO 8601 の文字列） */
export type DeviceAssignmentEntry = {
	deviceCode: string;
	elderId: string;
	elderName: string;
	roomNumber: string;
	assignedAt: string;
	unassignedAt: string | null;
};

/** 捨てた理由（V1〜V7 と、処理中の予想外のエラー） */
export type DropReason =
	| "invalid_topic" // V1
	| "invalid_body" // V2（大きすぎる・JSON オブジェクトでない）
	| "device_code_mismatch" // V3
	| "invalid_result" // V4
	| "invalid_detected_at" // V5
	| "invalid_model_version" // V6
	| "invalid_event_id" // V7
	| "unexpected_error";

/** 接続の状態（詳細設計 4章の状態遷移） */
export type ConnectionStatus =
	| { kind: "fetching_credentials" }
	| { kind: "connecting" }
	| { kind: "subscribing" }
	| { kind: "live" }
	| { kind: "waiting_retry"; retryAt: Date }
	| { kind: "auth_error" }
	| { kind: "stopped"; reason: "unauthenticated" | "forbidden" | "rejected" };

/** ブラウザ用の接続情報（GET /api/realtime/credentials の 200） */
export type BrokerCredentials = {
	url: string;
	username: string | null;
	password: string | null;
};
