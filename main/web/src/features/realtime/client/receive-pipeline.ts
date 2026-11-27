// 受信の処理 R2〜R7（詳細設計 web/03 の5章）
// 副作用のない関数だけを置く。状態は引数で受け取り、新しい状態を返す（元の状態は変えない）。
import type {
	DeviceAssignmentEntry,
	DropReason,
	FallEvent,
	UnhandledAlert,
} from "../types";

// ===== 基準値（案。U4 で AI・Web と合意したら更新する） =====
/** これより前に検知された結果は「古い」（R4） */
export const STALE_AFTER_MS = 10_000;
/** これより未来の detected_at も「古い」扱い（機器の時計がおかしい）（R4） */
export const FUTURE_TOLERANCE_MS = 60_000;
/** 重複を覚えておく時間（R3） */
export const DEDUPE_TTL_MS = 10 * 60 * 1000;
/** 重複を覚えておく最大件数（R3） */
export const DEDUPE_MAX_ENTRIES = 5_000;
/** 同じ機器で古い結果がこの件数続いたら、PC の時計のずれを疑う */
export const CLOCK_SKEW_STREAK = 3;

export type ReceiverState = {
	/** 全体で最後に受け取った時刻（R2） */
	lastReceivedAt: Date | null;
	/** 機器ごとに最後に受け取った時刻（R2） */
	lastReceivedByDevice: Record<string, Date>;
	/** 重複キー → 最初に受け取った時刻（ミリ秒）。Map は入れた順を保つので古い順に消せる */
	seen: Map<string, number>;
	/** 未対応アラート。detected_at の新しい順 */
	alerts: UnhandledAlert[];
	/** 捨てた理由ごとの件数 */
	dropCounts: Partial<Record<DropReason, number>>;
	/** 機器ごとに「古い」が何件続いたか（Retain 付きは数えない） */
	staleStreakByDevice: Record<string, number>;
	/** PC の時計がずれている可能性がある */
	clockSkewSuspected: boolean;
};

export function createInitialState(): ReceiverState {
	return {
		lastReceivedAt: null,
		lastReceivedByDevice: {},
		seen: new Map(),
		alerts: [],
		dropCounts: {},
		staleStreakByDevice: {},
		clockSkewSuspected: false,
	};
}

/** R1 で捨てたときに件数を足す */
export function recordDrop(
	state: ReceiverState,
	reason: DropReason,
): ReceiverState {
	const current = state.dropCounts[reason] ?? 0;
	return {
		...state,
		dropCounts: { ...state.dropCounts, [reason]: current + 1 },
	};
}

export type ReceiveOutcome =
	| "duplicate" // R3 で無視
	| "late" // R4 で古い（表示のみ）
	| "normal" // R5 で終わり
	| "merged" // R7 既存のアラートにまとめた（合図なし）
	| "new_alert"; // 新しいアラート（合図を出す）

export type ReceiveResult = {
	state: ReceiverState;
	outcome: ReceiveOutcome;
	/** outcome が "new_alert" のときだけ入る。アラーム（#246）への合図に使う */
	newAlert: UnhandledAlert | null;
};

/**
 * 検証済みの1件を R2〜R7 の順に処理する。
 * アラームの合図（newAlert）が出るのは、全部を通った新しい fall だけ。
 */
export function receiveEvent(
	state: ReceiverState,
	event: FallEvent,
	directory: readonly DeviceAssignmentEntry[],
	now: Date,
): ReceiveResult {
	const nowMs = now.getTime();

	// R2: fall でも normal でも、最後の受信時刻を更新する
	let next: ReceiverState = {
		...state,
		lastReceivedAt: event.receivedAt,
		lastReceivedByDevice: {
			...state.lastReceivedByDevice,
			[event.deviceCode]: event.receivedAt,
		},
	};

	// R3: 重複。覚えている期間を過ぎたものを消してから調べる
	const seen = pruneSeen(state.seen, nowMs);
	if (seen.has(event.dedupeKey)) {
		next = { ...next, seen };
		return { state: next, outcome: "duplicate", newAlert: null };
	}
	seen.set(event.dedupeKey, nowMs);
	// 上限を超えたら、古いものから消す
	while (seen.size > DEDUPE_MAX_ENTRIES) {
		const oldestKey = seen.keys().next().value;
		if (oldestKey === undefined) break;
		seen.delete(oldestKey);
	}
	next = { ...next, seen };

	// R4: 古さ。時計のずれの見張りもここで行う
	const ageMs = nowMs - event.detectedAt.getTime();
	const tooOld = ageMs > STALE_AFTER_MS;
	const tooFuture = -ageMs > FUTURE_TOLERANCE_MS;
	const late = event.retained || tooOld || tooFuture;
	next = updateClockSkew(next, event, tooOld || tooFuture);

	// R5: normal はここで終わり。アラートは消さない
	if (event.result === "normal") {
		return { state: next, outcome: late ? "late" : "normal", newAlert: null };
	}

	// R6: detected_at の時点で有効な割当を探す。見つからなくても fall は捨てない
	const elder = findElder(directory, event.deviceCode, event.detectedAt);

	// R7: 同じ機器の未対応アラートがあれば、件数と検知時刻をまとめる
	const index = next.alerts.findIndex(
		(alert) => alert.deviceCode === event.deviceCode,
	);
	if (index !== -1) {
		const existing = next.alerts[index];
		// 「遅れて届いた」アラートに、今起きた新しい fall が来たら合図を出す。
		// 古い結果のせいで、本物の転倒のアラームが鳴らなくなるのを防ぐ（安全側に倒す）
		const upgradeFromLate = existing.late && !late;
		const merged: UnhandledAlert = {
			...existing,
			late: existing.late && late,
			// 最初に未割当でも、後の結果で利用者が分かれば表示する
			elder: existing.elder ?? elder,
			firstDetectedAt: minDate(existing.firstDetectedAt, event.detectedAt),
			lastDetectedAt: maxDate(existing.lastDetectedAt, event.detectedAt),
			fallCount: existing.fallCount + 1,
		};
		const alerts = [...next.alerts];
		alerts[index] = merged;
		next = { ...next, alerts: sortAlerts(alerts) };
		if (upgradeFromLate) {
			return { state: next, outcome: "new_alert", newAlert: merged };
		}
		return { state: next, outcome: late ? "late" : "merged", newAlert: null };
	}

	const alert: UnhandledAlert = {
		alertId: event.dedupeKey,
		deviceCode: event.deviceCode,
		elder,
		firstDetectedAt: event.detectedAt,
		lastDetectedAt: event.detectedAt,
		fallCount: 1,
		late,
	};
	next = { ...next, alerts: sortAlerts([...next.alerts, alert]) };

	// 古い結果は表示だけ。アラームの合図は出さない
	if (late) {
		return { state: next, outcome: "late", newAlert: null };
	}
	return { state: next, outcome: "new_alert", newAlert: alert };
}

// ===== 以下は receiveEvent の中だけで使う小さな関数 =====

// 期限切れの重複キーを消した「新しい Map」を返す（元の Map は変えない）
function pruneSeen(
	seen: Map<string, number>,
	nowMs: number,
): Map<string, number> {
	const result = new Map<string, number>();
	for (const [key, firstSeenMs] of seen) {
		if (nowMs - firstSeenMs <= DEDUPE_TTL_MS) {
			result.set(key, firstSeenMs);
		}
	}
	return result;
}

// 同じ機器で「時刻のずれた結果」が続いたら、PC の時計のずれを疑う
// Retain 付きは本当に過去の結果なので数えない
function updateClockSkew(
	state: ReceiverState,
	event: FallEvent,
	skewed: boolean,
): ReceiverState {
	let streak = 0;
	if (skewed && !event.retained) {
		streak = (state.staleStreakByDevice[event.deviceCode] ?? 0) + 1;
	}
	const staleStreakByDevice = {
		...state.staleStreakByDevice,
		[event.deviceCode]: streak,
	};
	const clockSkewSuspected = Object.values(staleStreakByDevice).some(
		(count) => count >= CLOCK_SKEW_STREAK,
	);
	return { ...state, staleStreakByDevice, clockSkewSuspected };
}

// detected_at の時点で有効だった割当を探す
// 有効 = assignedAt <= detectedAt かつ（unassignedAt が無い、または detectedAt < unassignedAt）
function findElder(
	directory: readonly DeviceAssignmentEntry[],
	deviceCode: string,
	detectedAt: Date,
): UnhandledAlert["elder"] {
	const at = detectedAt.getTime();
	for (const entry of directory) {
		if (entry.deviceCode !== deviceCode) continue;
		const assignedAt = new Date(entry.assignedAt).getTime();
		if (assignedAt > at) continue;
		if (entry.unassignedAt !== null) {
			const unassignedAt = new Date(entry.unassignedAt).getTime();
			if (at >= unassignedAt) continue;
		}
		return { id: entry.elderId, name: entry.elderName, room: entry.roomNumber };
	}
	return null;
}

// 並びは受信順ではなく detected_at で決める（新しい順）
function sortAlerts(alerts: UnhandledAlert[]): UnhandledAlert[] {
	return alerts.sort(
		(a, b) => b.lastDetectedAt.getTime() - a.lastDetectedAt.getTime(),
	);
}

function minDate(a: Date, b: Date): Date {
	return a.getTime() <= b.getTime() ? a : b;
}

function maxDate(a: Date, b: Date): Date {
	return a.getTime() >= b.getTime() ? a : b;
}
