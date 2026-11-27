"use client";

// アラートの一覧と対応操作（詳細設計 web/03 の8章の文言、Web基本設計「アラートと対応操作」）
// AI の結果は転倒の「可能性」。受信だけで転倒を確定せず、記録はスタッフが入力する。
// 「対応開始」でアラームを止めて対応中にし、記録を保存したら一覧から外す。
// 受信した文字列は React のテキストとして出し、HTML として表示しない。
import { AlertTriangle } from "lucide-react";
import { useCallback, useState } from "react";
import {
	type ResponseDraft,
	ResponseRecordModal,
} from "@/features/response/components/ResponseRecordModal";
import { useFallReceiverContext } from "./FallReceiverProvider";
import { formatClockTime } from "./time-format";

export function FallAlertList() {
	const { state, startResponse, completeAlert } = useFallReceiverContext();
	// 記録を入力中のアラート
	const [recordingAlertId, setRecordingAlertId] = useState<string | null>(null);
	const [savedMessage, setSavedMessage] = useState<string | null>(null);

	const recordingAlert =
		state.alerts.find((alert) => alert.alertId === recordingAlertId) ?? null;
	const unhandledCount = state.alerts.filter(
		(alert) => alert.status === "unhandled",
	).length;

	function handleStart(alertId: string) {
		setSavedMessage(null);
		startResponse(alertId);
		setRecordingAlertId(alertId);
	}

	// 入力途中の内容（アラートごと）。閉じて開き直しても、別のアラートを先に対応しても消えない
	const [drafts, setDrafts] = useState<Record<string, ResponseDraft>>({});

	// 注意: モーダルに渡す関数は useCallback で固定する。
	// 受信のたびにこの一覧は描画し直されるが、関数が毎回変わると Modal が
	// フォーカスを「閉じる」ボタンへ戻してしまい、入力中の文字が入らなくなる
	const handleClose = useCallback(() => setRecordingAlertId(null), []);

	const handleDraftChange = useCallback(
		(alertId: string, draft: ResponseDraft) => {
			setDrafts((prev) => ({ ...prev, [alertId]: draft }));
		},
		[],
	);

	const handleSaved = useCallback(
		(alertId: string) => {
			completeAlert(alertId);
			setRecordingAlertId(null);
			setDrafts((prev) => {
				const next = { ...prev };
				delete next[alertId];
				return next;
			});
			setSavedMessage("対応記録を保存しました");
		},
		[completeAlert],
	);

	if (state.alerts.length === 0) {
		if (savedMessage === null) return null;
		return (
			<p role="status" className="text-sm font-semibold text-green-700">
				{savedMessage}
			</p>
		);
	}

	return (
		<section
			aria-label="転倒の可能性"
			className="rounded-2xl border border-red-200 bg-red-50/80 p-4"
		>
			<h2 className="mb-2 flex items-center gap-2 text-base font-black text-red-700">
				<AlertTriangle aria-hidden="true" className="h-5 w-5" />
				転倒の可能性 {state.alerts.length}件（未対応 {unhandledCount}件）
			</h2>
			{savedMessage !== null && (
				<p role="status" className="mb-2 text-sm font-semibold text-green-700">
					{savedMessage}
				</p>
			)}
			<ul className="flex flex-col gap-2">
				{state.alerts.map((alert) => (
					<li
						key={alert.alertId}
						className="flex flex-col gap-2 rounded-xl bg-white p-3 text-sm text-gray-700 sm:flex-row sm:items-center sm:justify-between"
					>
						<div>
							<p className="font-bold text-gray-900">
								{alert.elder === null
									? `未割当の機器（${alert.deviceCode}）`
									: `${alert.elder.name}（${alert.elder.room}）`}
								{alert.status === "in_progress" ? (
									<span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
										対応中
									</span>
								) : (
									<span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
										未対応
									</span>
								)}
								{alert.late && (
									<span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800">
										遅れて届いた
									</span>
								)}
							</p>
							<p>
								検知: {formatClockTime(alert.firstDetectedAt)}
								{alert.fallCount > 1 &&
									` 〜 ${formatClockTime(alert.lastDetectedAt)}（${alert.fallCount}件）`}
								{alert.responseStartedAt !== null &&
									` ／ 対応開始: ${formatClockTime(alert.responseStartedAt)}`}
								<span className="ml-2 text-gray-400">
									機器 {alert.deviceCode}
								</span>
							</p>
						</div>
						{alert.status === "unhandled" ? (
							<button
								type="button"
								onClick={() => handleStart(alert.alertId)}
								className="shrink-0 rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700"
							>
								対応開始
							</button>
						) : (
							<button
								type="button"
								onClick={() => setRecordingAlertId(alert.alertId)}
								className="shrink-0 rounded-lg bg-violet-600 px-4 py-2 font-bold text-white hover:bg-violet-700"
							>
								記録を入力
							</button>
						)}
					</li>
				))}
			</ul>

			{recordingAlert !== null && (
				<ResponseRecordModal
					// アラートが変わったら入力欄を作り直す
					key={recordingAlert.alertId}
					alert={recordingAlert}
					draft={drafts[recordingAlert.alertId]}
					onDraftChange={handleDraftChange}
					// 閉じても「対応中」のまま残り、「記録を入力」から再開できる
					onClose={handleClose}
					onSaved={handleSaved}
				/>
			)}
		</section>
	);
}
