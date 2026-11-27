"use client";

// 接続状態と「最後の受信」を表示する（詳細設計 web/03 の8章）
// 「つながっているか」と「最後にいつ受け取ったか」を分けて出す。色だけでなく文字でも示す。
// 結果が来ないことを「異常なし」「AI停止」とは表示しない。
import { useEffect, useState } from "react";
import type { ConnectionStatus } from "../types";
import { useFallReceiverContext } from "./FallReceiverProvider";
import { formatClockTime, formatElapsed } from "./time-format";

export function ReceiverStatus() {
	const { connection, state } = useFallReceiverContext();
	const now = useNow();
	const deviceCodes = Object.keys(state.lastReceivedByDevice).sort();

	return (
		<section
			aria-label="AI判定結果の受信状態"
			className="rounded-xl border border-gray-200 bg-white p-4 text-sm"
		>
			<div className="flex flex-wrap items-center gap-x-6 gap-y-2">
				<p role="status" className="flex items-center gap-2">
					<span
						aria-hidden="true"
						className={`h-2.5 w-2.5 rounded-full ${statusColor(connection)}`}
					/>
					<span className="font-bold text-gray-800">
						{statusText(connection, now)}
					</span>
				</p>
				<p className="text-gray-600">
					最後の受信:{" "}
					<span className="font-semibold text-gray-800">
						{state.lastReceivedAt === null
							? "未取得"
							: `${formatClockTime(state.lastReceivedAt)}（${formatElapsed(state.lastReceivedAt, now)}）`}
					</span>
				</p>
			</div>

			{state.clockSkewSuspected && (
				<p className="mt-2 font-semibold text-yellow-800">
					PCの時計がずれている可能性があります。時刻の自動設定を確認してください。
				</p>
			)}

			{deviceCodes.length > 0 && (
				<details className="mt-2 text-gray-600">
					<summary className="cursor-pointer">機器ごとの最後の受信</summary>
					<ul className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
						{deviceCodes.map((deviceCode) => {
							const at = state.lastReceivedByDevice[deviceCode];
							return (
								<li key={deviceCode}>
									{`${deviceCode}: ${formatClockTime(at)}（${formatElapsed(at, now)}）`}
								</li>
							);
						})}
					</ul>
				</details>
			)}
		</section>
	);
}

// 「○秒前」を更新するため、1秒ごとに今の時刻を取り直す
function useNow(): Date {
	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		const timer = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);
	return now;
}

function statusText(connection: ConnectionStatus, now: Date): string {
	switch (connection.kind) {
		case "fetching_credentials":
		case "connecting":
		case "subscribing":
		case "auth_error":
			return "接続中…";
		case "live":
			return "受信中";
		case "waiting_retry": {
			const seconds = Math.max(
				0,
				Math.ceil((connection.retryAt.getTime() - now.getTime()) / 1000),
			);
			return `切断中。${seconds}秒後に再接続。この間の結果は届きません`;
		}
		case "stopped":
			if (connection.reason === "unauthenticated") {
				return "ログインしてください";
			}
			return "接続できません。管理者に連絡してください";
	}
}

function statusColor(connection: ConnectionStatus): string {
	switch (connection.kind) {
		case "live":
			return "bg-green-500";
		case "waiting_retry":
			return "bg-yellow-400";
		case "stopped":
			return "bg-red-500";
		default:
			return "bg-gray-400";
	}
}
