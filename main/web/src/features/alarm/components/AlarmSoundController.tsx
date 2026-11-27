"use client";

// 新しいアラートの合図でアラーム音を鳴らし、止めるボタンを出す
// 「対応開始」で未対応のアラートが無くなったら止める（Web基本設計「アラートと対応操作」）
// 音を止めてもアラートは消さない。
// 音が鳴らせない状態を隠さず、画面に文字で出す（届かない・鳴らないを「異常なし」に見せない）
import { BellOff, BellRing, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFallReceiverContext } from "@/features/realtime/components/FallReceiverProvider";
import { type AlarmSound, createAlarmSound } from "../client/alarm-sound";

export function AlarmSoundController() {
	const { newAlertCount, state } = useFallReceiverContext();
	const hasUnhandled = state.alerts.some(
		(alert) => alert.status === "unhandled",
	);
	const alarmRef = useRef<AlarmSound | null>(null);
	// 音を鳴らせる状態か（ブラウザの自動再生の制限・OS の音声中断で変わる）
	const [unlocked, setUnlocked] = useState(false);
	// アラームを鳴らすべき状態か（鳴らせない間も true のまま。鳴らせるようになったら音が出る）
	const [ringing, setRinging] = useState(false);

	// 未対応のアラートが無くなったら、鳴らすべき状態を戻す
	// （effect ではなく描画中に前回の値と比べる、React 推奨の書き方）
	const [prevHasUnhandled, setPrevHasUnhandled] = useState(hasUnhandled);
	if (prevHasUnhandled !== hasUnhandled) {
		setPrevHasUnhandled(hasUnhandled);
		if (!hasUnhandled) {
			setRinging(false);
		}
	}

	// アラーム音の準備と、画面を閉じたときの後片付け
	useEffect(() => {
		const alarm = createAlarmSound((isUnlocked) => setUnlocked(isUnlocked));
		alarmRef.current = alarm;

		// 画面のどこかをクリック・キー入力したら、音を鳴らせる状態にする
		// 一度有効にした後も止まることがあるので、listener は外さない
		async function handleUserAction() {
			if (alarm.isUnlocked()) return;
			const ok = await alarm.unlock();
			setUnlocked(ok);
		}
		document.addEventListener("pointerdown", handleUserAction);
		document.addEventListener("keydown", handleUserAction);

		return () => {
			document.removeEventListener("pointerdown", handleUserAction);
			document.removeEventListener("keydown", handleUserAction);
			alarm.dispose();
			alarmRef.current = null;
		};
	}, []);

	// 新しいアラートの合図が来たら（回数が増えたら）、鳴らすべき状態にする
	const [prevNewAlertCount, setPrevNewAlertCount] = useState(newAlertCount);
	if (prevNewAlertCount !== newAlertCount) {
		setPrevNewAlertCount(newAlertCount);
		if (newAlertCount > prevNewAlertCount) {
			setRinging(true);
		}
	}

	// 鳴らすべき状態で、鳴らせるなら音を出す。どちらかが外れたら止める
	useEffect(() => {
		const alarm = alarmRef.current;
		if (alarm === null) return;
		if (ringing && hasUnhandled && unlocked) {
			alarm.start();
		} else if (!ringing || !hasUnhandled) {
			alarm.stop();
		}
	}, [ringing, hasUnhandled, unlocked]);

	function stopAlarm() {
		alarmRef.current?.stop();
		setRinging(false);
	}

	const shouldRing = ringing && hasUnhandled;

	// 鳴らすべきなのに鳴らせない: 赤い警告
	if (shouldRing && !unlocked) {
		return (
			<div
				role="alert"
				className="sticky top-0 z-[60] flex flex-col gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
			>
				<p className="font-semibold">
					新しいアラートがありますが、アラーム音を鳴らせません。ボタンを押してください
				</p>
				<EnableSoundButton />
			</div>
		);
	}

	// 鳴動中: 記録の入力画面（z-50）より手前に出して、いつでも止められるようにする
	if (shouldRing) {
		return (
			<div
				role="alert"
				className="sticky top-0 z-[60] flex flex-col gap-3 rounded-xl border border-red-300 bg-red-600 p-4 text-white sm:flex-row sm:items-center sm:justify-between"
			>
				<p className="flex items-center gap-2 font-bold">
					<BellRing aria-hidden="true" className="h-5 w-5 animate-pulse" />
					アラーム鳴動中：転倒の可能性があります。現場を確認してください
				</p>
				<button
					type="button"
					onClick={stopAlarm}
					className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
				>
					<BellOff aria-hidden="true" className="h-4 w-4" />
					アラームを止める
				</button>
			</div>
		);
	}

	if (!unlocked) {
		return (
			<div className="flex flex-col gap-3 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900 sm:flex-row sm:items-center sm:justify-between">
				<p className="font-semibold">
					アラーム音が無効です。ブラウザの制限のため、一度ボタンを押してください
				</p>
				<EnableSoundButton />
			</div>
		);
	}

	return null;
}

// クリック自体で document の listener が音を有効にする
function EnableSoundButton() {
	return (
		<button
			type="button"
			className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 font-bold text-white hover:bg-gray-700"
		>
			<Volume2 aria-hidden="true" className="h-4 w-4" />
			アラーム音を有効にする
		</button>
	);
}
