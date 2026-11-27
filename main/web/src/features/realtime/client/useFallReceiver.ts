"use client";

// 接続（mqtt-connection）と判定（receive-pipeline）をつなぎ、状態を持つ hook
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
	ConnectionStatus,
	DeviceAssignmentEntry,
	DropReason,
	UnhandledAlert,
} from "../types";
import { startFallConnection } from "./mqtt-connection";
import { parseFallEvent } from "./parse-fall-event";
import {
	completeAlert as completeAlertInState,
	createInitialState,
	type ReceiverState,
	receiveEvent,
	recordDrop,
	startResponse as startResponseInState,
} from "./receive-pipeline";

export type FallReceiver = {
	connection: ConnectionStatus;
	state: ReceiverState;
	/** 新しいアラートの合図が出た回数。増えたらアラーム音を鳴らす（Server から関数を渡せないため数で知らせる） */
	newAlertCount: number;
	/** 「対応開始」: 未対応 → 対応中 */
	startResponse: (alertId: string) => void;
	/** 対応記録を保存できたら、一覧から外す */
	completeAlert: (alertId: string) => void;
};

export function useFallReceiver(
	directory: readonly DeviceAssignmentEntry[],
	onNewAlert?: (alert: UnhandledAlert) => void,
): FallReceiver {
	const router = useRouter();
	const [connection, setConnection] = useState<ConnectionStatus>({
		kind: "fetching_credentials",
	});
	const [state, setState] = useState<ReceiverState>(createInitialState);
	const [newAlertCount, setNewAlertCount] = useState(0);

	// MQTT のコールバックから最新の値を読むため、ref にも持つ。
	// （useReducer だと、合図 onNewAlert を出すかどうかを同じ場所で決められないため）
	const stateRef = useRef(state);
	const directoryRef = useRef(directory);
	const onNewAlertRef = useRef(onNewAlert);
	const routerRef = useRef(router);

	// props が変わったら（router.refresh() で機器一覧を取り直したときなど）ref を更新する
	useEffect(() => {
		directoryRef.current = directory;
		onNewAlertRef.current = onNewAlert;
		routerRef.current = router;
	}, [directory, onNewAlert, router]);

	// タブ1つにつき接続は1本。画面を閉じたら切る
	useEffect(() => {
		function applyState(next: ReceiverState) {
			stateRef.current = next;
			setState(next);
		}

		function drop(reason: DropReason) {
			applyState(recordDrop(stateRef.current, reason));
			// 理由と件数だけをログに出す（本文は出さない）
			console.warn(
				"[realtime] dropped",
				reason,
				stateRef.current.dropCounts[reason],
			);
		}

		function handleMessage(
			topic: string,
			payload: Uint8Array,
			retained: boolean,
		) {
			// 受信処理で予想外のエラーが出ても、その1件だけ捨てて接続は続ける
			try {
				const now = new Date();
				const parsed = parseFallEvent(topic, payload, retained, now);
				if (!parsed.ok) {
					drop(parsed.reason);
					return;
				}
				const result = receiveEvent(
					stateRef.current,
					parsed.event,
					directoryRef.current,
					now,
				);
				applyState(result.state);
				if (result.newAlert !== null) {
					setNewAlertCount((count) => count + 1);
					onNewAlertRef.current?.(result.newAlert);
				}
			} catch {
				drop("unexpected_error");
			}
		}

		const connectionHandle = startFallConnection({
			onStatus: setConnection,
			onMessage: handleMessage,
			// 割当の変更を反映するため、つながり直したら機器一覧も取り直す
			onReconnected: () => routerRef.current.refresh(),
		});

		return () => connectionHandle.stop();
	}, []);

	// 画面の操作から状態を変える。stateRef と React の状態を一緒に更新する
	const startResponse = useCallback((alertId: string) => {
		const next = startResponseInState(stateRef.current, alertId, new Date());
		stateRef.current = next;
		setState(next);
	}, []);

	const completeAlert = useCallback((alertId: string) => {
		const next = completeAlertInState(stateRef.current, alertId);
		stateRef.current = next;
		setState(next);
	}, []);

	return { connection, state, newAlertCount, startResponse, completeAlert };
}
