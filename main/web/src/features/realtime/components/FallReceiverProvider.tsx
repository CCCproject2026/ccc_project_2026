"use client";

// 受信の状態を画面に配る Provider（詳細設計 web/03 の2章）
// サーバー（dashboard/page.tsx）から機器一覧を受け取り、ブラウザで受信を始める。
import { createContext, type ReactNode, useContext } from "react";
import { type FallReceiver, useFallReceiver } from "../client/useFallReceiver";
import type { DeviceAssignmentEntry, UnhandledAlert } from "../types";

const FallReceiverContext = createContext<FallReceiver | null>(null);

export function FallReceiverProvider({
	directory,
	onNewAlert,
	children,
}: {
	directory: DeviceAssignmentEntry[];
	/** 新しいアラートの合図。アラーム音・対応記録（#246）はここにつなぐ */
	onNewAlert?: (alert: UnhandledAlert) => void;
	children: ReactNode;
}) {
	const receiver = useFallReceiver(directory, onNewAlert);
	return (
		<FallReceiverContext.Provider value={receiver}>
			{children}
		</FallReceiverContext.Provider>
	);
}

export function useFallReceiverContext(): FallReceiver {
	const value = useContext(FallReceiverContext);
	if (value === null) {
		throw new Error(
			"useFallReceiverContext は FallReceiverProvider の中で使ってください",
		);
	}
	return value;
}
