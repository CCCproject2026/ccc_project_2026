// 受信した Topic と本文を確かめて、FallEvent にする（R1: V1〜V7）
// React にも MQTT.js にも依存しない、ただの関数。
import { z } from "zod";
import type { DropReason, FallEvent } from "../types";

// V1: fall/{device_code}/events の形
const TOPIC = /^fall\/([A-Za-z0-9_-]{1,64})\/events$/;

// V2: 本文の上限（4 KiB）
export const MAX_PAYLOAD_BYTES = 4 * 1024;

const FallEventSchema = z.object({
	event_id: z.uuid().optional(), // V7
	device_code: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
	result: z.enum(["fall", "normal"]), // V4（知らない値を normal とみなさない）
	// V5: タイムゾーン付きの日時だけ（Z または +09:00 など）
	detected_at: z.iso.datetime({ offset: true }),
	model_version: z.string().min(1).max(64), // V6
	// 知らない項目は無視する（z.object は余分なキーを捨てる）
});

export type ParseResult =
	| { ok: true; event: FallEvent }
	| { ok: false; reason: DropReason };

export function parseFallEvent(
	topic: string,
	payload: Uint8Array,
	retained: boolean,
	receivedAt: Date,
): ParseResult {
	// V1: Topic の形
	const topicMatch = TOPIC.exec(topic);
	if (topicMatch === null) {
		return { ok: false, reason: "invalid_topic" };
	}
	const topicDeviceCode = topicMatch[1];

	// V2: 大きすぎる本文は、JSON として読む前に捨てる
	if (payload.byteLength > MAX_PAYLOAD_BYTES) {
		return { ok: false, reason: "invalid_body" };
	}

	// V2: JSON オブジェクトでなければ捨てる（配列や数値も捨てる）
	let body: unknown;
	try {
		body = JSON.parse(
			new TextDecoder("utf-8", { fatal: true }).decode(payload),
		);
	} catch {
		return { ok: false, reason: "invalid_body" };
	}
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		return { ok: false, reason: "invalid_body" };
	}

	const parsed = FallEventSchema.safeParse(body);
	if (!parsed.success) {
		return { ok: false, reason: reasonFromIssue(parsed.error.issues[0]?.path) };
	}
	const data = parsed.data;

	// V3: 本文と Topic の機器コードが同じか（大文字・小文字も区別する）
	if (data.device_code !== topicDeviceCode) {
		return { ok: false, reason: "device_code_mismatch" };
	}

	const detectedAt = new Date(data.detected_at);
	if (Number.isNaN(detectedAt.getTime())) {
		return { ok: false, reason: "invalid_detected_at" };
	}

	// R3 の重複キー。event_id が無いときは、同じ結果なら同じになる値を組み合わせる
	// detected_at は toISOString() にそろえ、"+09:00" と "Z" の書き方の違いで別扱いにしない
	let dedupeKey: string;
	if (data.event_id !== undefined) {
		dedupeKey = `id:${data.event_id.toLowerCase()}`;
	} else {
		dedupeKey = `alt:${data.device_code}|${detectedAt.toISOString()}|${data.model_version}`;
	}

	return {
		ok: true,
		event: {
			dedupeKey,
			deviceCode: data.device_code,
			result: data.result,
			detectedAt,
			modelVersion: data.model_version,
			retained,
			receivedAt,
		},
	};
}

// zod のエラーの場所（どの項目か）から、捨てた理由を決める
function reasonFromIssue(path: readonly PropertyKey[] | undefined): DropReason {
	const field = path?.[0];
	if (field === "event_id") return "invalid_event_id";
	if (field === "result") return "invalid_result";
	if (field === "detected_at") return "invalid_detected_at";
	if (field === "model_version") return "invalid_model_version";
	// device_code の形が違う場合も、Topic と一致しないので V3 として数える
	if (field === "device_code") return "device_code_mismatch";
	return "invalid_body";
}
