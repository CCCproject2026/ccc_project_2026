"use client";

import { formatDeviceLabel } from "@/features/device-management/lib/device-format";
import type { DeviceDetail } from "@/features/device-management/types/device.types";
import type { ElderRow } from "@/features/elder-management/types/elder.types";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";

// 退所（無効化）の確認ダイアログ（デバイス管理 詳細設計 03 の4章「操作前の確認」）
// 割当中のデバイスがあれば、名前とコードを表示し、割当が終了することを示す

// 退所の確認で表示する内容。直前に取り直した値を入れる
export type ElderExitTarget = {
	elder: ElderRow;
	// 割当中のデバイス。割当がなければ null
	device: DeviceDetail | null;
	// 割当はあるが、デバイスの情報を取得できなかった
	deviceUnknown: boolean;
};

// デバイス管理の確認ダイアログと同じ注意文（本 Task ではサーバーがアラートを判定しない）
const ALERT_NOTE =
	"この入所者・デバイスに未対応または対応中のアラートがないことを、ダッシュボードで確認してから実行してください。";

interface ElderExitConfirmDialogProps {
	target: ElderExitTarget | null; // null なら閉じている
	onConfirm: (target: ElderExitTarget) => void;
	onClose: () => void;
}

export function ElderExitConfirmDialog({
	target,
	onConfirm,
	onClose,
}: ElderExitConfirmDialogProps) {
	if (target === null) {
		return null;
	}
	const { elder, device, deviceUnknown } = target;

	return (
		<ConfirmDialog
			open
			title="退所の確認"
			confirmLabel="退所・無効化する"
			danger
			onConfirm={() => onConfirm(target)}
			onClose={onClose}
		>
			<p>
				{elder.lastName} {elder.firstName}（部屋 {elder.roomNumber}
				）を退所・無効化しますか？
			</p>
			<DeviceSection device={device} deviceUnknown={deviceUnknown} />
			<p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
				{ALERT_NOTE}
			</p>
		</ConfirmDialog>
	);
}

function DeviceSection({
	device,
	deviceUnknown,
}: {
	device: DeviceDetail | null;
	deviceUnknown: boolean;
}) {
	if (deviceUnknown) {
		return (
			<p className="font-medium text-rose-700">
				割当中のデバイスがありますが、情報を取得できませんでした。退所すると、そのデバイスの割当は終了します。
			</p>
		);
	}
	if (device === null) {
		return <p className="text-gray-500">割当中のデバイスはありません。</p>;
	}
	return (
		<>
			<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg bg-gray-50 p-3">
				<dt className="text-gray-500">割当中のデバイス</dt>
				<dd className="font-medium text-gray-900 break-all">
					{formatDeviceLabel(device)}
				</dd>
			</dl>
			<p className="font-medium text-rose-700">
				退所すると、このデバイスの割当は終了します。退所を取り消しても、割当は元に戻りません。
			</p>
		</>
	);
}
