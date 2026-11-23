import { DeviceApiError } from "../api/devices";
import type { DeviceErrorReason } from "../types/device.types";

// API のエラーを、スタッフに見せる日本語のメッセージにする（詳細設計 03 の5章「エラーの返し方」）
// サーバーの message をそのまま出さず、reason ごとに画面で文を決める

const REASON_MESSAGES: Record<DeviceErrorReason, string> = {
	DEVICE_NOT_ACTIVE: "このデバイスは停止中のため、割り当てられません。",
	ELDER_NOT_ACTIVE: "選んだ入所者は在籍していないため、割り当てられません。",
	DEVICE_ALREADY_ASSIGNED:
		"このデバイスは、既に別の入所者に割り当てられています。",
	ELDER_ALREADY_ASSIGNED:
		"選んだ入所者には、既に別のデバイスが割り当てられています。",
	NEW_DEVICE_NOT_ACTIVE: "選んだ予備デバイスは停止中のため、交換に使えません。",
	NEW_DEVICE_ALREADY_ASSIGNED:
		"選んだ予備デバイスは、既に別の入所者に割り当てられています。",
	SAME_TARGET: "変更前と同じ対象が選ばれています。",
	ASSIGNMENT_CHANGED:
		"割当が他の操作で変更されました。最新の状態を確認してから、もう一度操作してください。",
	DEVICE_CHANGED:
		"他のスタッフがこのデバイスを変更しました。最新の内容を確認してから、もう一度保存してください。",
	DEVICE_HAS_ASSIGNMENT:
		"割当中のデバイスは停止できません。先に割当を解除するか、故障交換を行ってください。",
	DEVICE_HAS_HISTORY: "割当の履歴があるため、デバイスコードは変更できません。",
};

const NOT_FOUND_MESSAGES = {
	device: "デバイスが見つかりません。",
	newDevice: "選んだ予備デバイスが見つかりません。",
	elder: "選んだ入所者が見つかりません。",
	assignment: "割当が見つかりません。最新の状態を確認してください。",
} as const;

export function deviceErrorMessage(error: unknown): string {
	if (!(error instanceof DeviceApiError)) {
		return "エラーが発生しました。";
	}

	if (error.status === 409 && error.reason !== undefined) {
		return REASON_MESSAGES[error.reason];
	}
	if (error.status === 409 && error.code === "DUPLICATE") {
		return "このデバイスコードは既に使われています。停止中のデバイスのコードも使えません。";
	}
	if (error.status === 404) {
		if (error.target !== undefined) {
			return NOT_FOUND_MESSAGES[error.target];
		}
		return NOT_FOUND_MESSAGES.device;
	}
	if (error.status === 400) {
		return "入力内容が正しくありません。";
	}
	if (error.status === 401 || error.status === 403) {
		return "操作する権限がありません。ログインし直してください。";
	}
	if (error.status === 503) {
		return "混み合っているため、実行できませんでした。しばらくしてからもう一度お試しください。";
	}
	if (error.status === 0) {
		return "通信できませんでした。ネットワークを確認してください。";
	}
	return "サーバーエラーが発生しました。";
}

// 409 が返ったら、画面の情報が古いため再取得する（詳細設計 03 の5章）
export function isConflict(error: unknown): boolean {
	return error instanceof DeviceApiError && error.status === 409;
}
