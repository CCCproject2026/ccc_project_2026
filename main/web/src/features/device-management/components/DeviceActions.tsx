"use client";

import {
	ArrowRightLeft,
	Link2,
	Power,
	PowerOff,
	Unlink,
	Wrench,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import type { Notice } from "@/shared/ui/NoticeBanner";
import {
	useAssignDevice,
	useChangeDeviceStatus,
	useFetchFreshDetail,
	useReplaceDevice,
	useTransferDevice,
	useUnassignDevice,
} from "../hooks/useDevices";
import { deviceErrorMessage } from "../lib/device-error-message";
import { formatDeviceLabel, formatElderLabel } from "../lib/device-format";
import type {
	CurrentAssignment,
	DeviceDetail,
	DeviceListItem,
	ElderSummary,
} from "../types/device.types";
import { ElderPickerDialog, SparePickerDialog } from "./PickerDialogs";

// デバイス詳細の操作ボタンと、操作の流れ（詳細設計 03 の4章「操作前の確認」）
// 1. ボタンを押し、必要なら入所者・予備デバイスを選ぶ
// 2. 対象デバイスの詳細を取り直す（故障交換は新しいデバイスも）
// 3. 取り直した値で確認ダイアログを出す
// 4. 「実行」で API を呼ぶ。確認用の値（expectedAssignmentId など）は、3で表示した値と同じものを送る

// アラートの注意文。本 Task ではサーバーがアラートを判定しないため、スタッフの確認に頼る
const ALERT_NOTE =
	"この入所者・デバイスに未対応または対応中のアラートがないことを、ダッシュボードで確認してから実行してください。";

// 確認ダイアログに出す操作。表示した値をそのまま API に送る
type PendingAction =
	| { kind: "assign"; device: DeviceDetail; elder: ElderSummary }
	| { kind: "unassign"; device: DeviceDetail; assignment: CurrentAssignment }
	| {
			kind: "transfer";
			device: DeviceDetail;
			assignment: CurrentAssignment;
			elder: ElderSummary;
	  }
	| {
			kind: "replace";
			device: DeviceDetail;
			assignment: CurrentAssignment;
			newDevice: DeviceDetail;
	  }
	| { kind: "deactivate"; device: DeviceDetail }
	| { kind: "activate"; device: DeviceDetail };

type Picker = "assign" | "transfer" | "replace" | null;

// 取り直した詳細が、ボタンを押したときの前提と違ったときに出すメッセージ
const STALE_MESSAGE =
	"デバイスの状態が変わっていました。最新の内容を表示しています。もう一度操作してください。";

interface DeviceActionsProps {
	device: DeviceDetail;
	onNotice: (notice: Notice) => void;
	onEdit: () => void;
}

export function DeviceActions({
	device,
	onNotice,
	onEdit,
}: DeviceActionsProps) {
	const [picker, setPicker] = useState<Picker>(null);
	const [pending, setPending] = useState<PendingAction | null>(null);
	const [preparing, setPreparing] = useState(false);

	const fetchFresh = useFetchFreshDetail();
	const assignMutation = useAssignDevice();
	const unassignMutation = useUnassignDevice();
	const transferMutation = useTransferDevice();
	const replaceMutation = useReplaceDevice();
	const statusMutation = useChangeDeviceStatus();

	const executing =
		assignMutation.isPending ||
		unassignMutation.isPending ||
		transferMutation.isPending ||
		replaceMutation.isPending ||
		statusMutation.isPending;

	// 2. 最新の詳細を取り直し、前提を満たしていれば確認ダイアログを出す
	// build は、取り直した詳細から確認する操作を作る。前提を満たさなければ null を返す
	const prepare = async (
		build: (fresh: DeviceDetail) => Promise<PendingAction | null>,
	) => {
		setPreparing(true);
		try {
			const fresh = await fetchFresh(device.id);
			const action = await build(fresh);
			setPicker(null);
			if (action === null) {
				onNotice({ type: "info", message: STALE_MESSAGE });
				return;
			}
			setPending(action);
		} catch (error) {
			setPicker(null);
			onNotice({ type: "error", message: deviceErrorMessage(error) });
		} finally {
			setPreparing(false);
		}
	};

	const prepareAssign = (elder: ElderSummary) =>
		prepare(async (fresh) => {
			if (fresh.status !== "ACTIVE" || fresh.currentAssignment !== null) {
				return null;
			}
			return { kind: "assign", device: fresh, elder };
		});

	const prepareTransfer = (elder: ElderSummary) =>
		prepare(async (fresh) => {
			if (fresh.currentAssignment === null) {
				return null;
			}
			return {
				kind: "transfer",
				device: fresh,
				assignment: fresh.currentAssignment,
				elder,
			};
		});

	const prepareReplace = (spare: DeviceListItem) =>
		prepare(async (fresh) => {
			if (fresh.currentAssignment === null) {
				return null;
			}
			// 新しいデバイスも取り直す（選んだ後に他のスタッフが割り当てたかもしれない）
			const newDevice = await fetchFresh(spare.id);
			if (
				newDevice.status !== "ACTIVE" ||
				newDevice.currentAssignment !== null
			) {
				return null;
			}
			return {
				kind: "replace",
				device: fresh,
				assignment: fresh.currentAssignment,
				newDevice,
			};
		});

	const prepareUnassign = () =>
		prepare(async (fresh) => {
			if (fresh.currentAssignment === null) {
				return null;
			}
			return {
				kind: "unassign",
				device: fresh,
				assignment: fresh.currentAssignment,
			};
		});

	const prepareDeactivate = () =>
		prepare(async (fresh) => {
			if (fresh.status !== "ACTIVE" || fresh.currentAssignment !== null) {
				return null;
			}
			return { kind: "deactivate", device: fresh };
		});

	const prepareActivate = () =>
		prepare(async (fresh) => {
			if (fresh.status !== "INACTIVE") {
				return null;
			}
			return { kind: "activate", device: fresh };
		});

	// 4. 確認ダイアログの「実行」
	const execute = async () => {
		if (pending === null) {
			return;
		}
		try {
			const message = await run(pending);
			onNotice({ type: "success", message });
		} catch (error) {
			// 409 などのときは、hooks が一覧と詳細を取り直す
			onNotice({ type: "error", message: deviceErrorMessage(error) });
		} finally {
			setPending(null);
		}
	};

	const run = async (action: PendingAction): Promise<string> => {
		const deviceLabel = formatDeviceLabel(action.device);
		if (action.kind === "assign") {
			await assignMutation.mutateAsync({
				id: action.device.id,
				elderId: action.elder.id,
			});
			return `${deviceLabel} を ${formatElderLabel(action.elder)} に割り当てました。`;
		}
		if (action.kind === "unassign") {
			await unassignMutation.mutateAsync({
				id: action.device.id,
				assignmentId: action.assignment.id,
			});
			return `${deviceLabel} の割当を解除しました。`;
		}
		if (action.kind === "transfer") {
			await transferMutation.mutateAsync({
				id: action.device.id,
				elderId: action.elder.id,
				expectedAssignmentId: action.assignment.id,
			});
			return `${deviceLabel} を ${formatElderLabel(action.elder)} に付け替えました。`;
		}
		if (action.kind === "replace") {
			await replaceMutation.mutateAsync({
				id: action.device.id,
				newDeviceId: action.newDevice.id,
				expectedAssignmentId: action.assignment.id,
			});
			return `${deviceLabel} を ${formatDeviceLabel(action.newDevice)} に交換しました。${deviceLabel} は停止中になりました。`;
		}
		if (action.kind === "deactivate") {
			await statusMutation.mutateAsync({
				id: action.device.id,
				status: "INACTIVE",
			});
			return `${deviceLabel} を停止しました。`;
		}
		await statusMutation.mutateAsync({
			id: action.device.id,
			status: "ACTIVE",
		});
		return `${deviceLabel} の利用を再開しました。`;
	};

	const assigned = device.currentAssignment !== null;
	const active = device.status === "ACTIVE";

	return (
		<>
			<div className="flex flex-wrap gap-2">
				<ActionButton onClick={onEdit} disabled={preparing}>
					編集
				</ActionButton>
				{active && !assigned && (
					<ActionButton
						icon={<Link2 className="w-4 h-4" />}
						onClick={() => setPicker("assign")}
						disabled={preparing}
						primary
					>
						割り当てる
					</ActionButton>
				)}
				{assigned && (
					<>
						<ActionButton
							icon={<ArrowRightLeft className="w-4 h-4" />}
							onClick={() => setPicker("transfer")}
							disabled={preparing}
						>
							付け替え
						</ActionButton>
						<ActionButton
							icon={<Wrench className="w-4 h-4" />}
							onClick={() => setPicker("replace")}
							disabled={preparing}
						>
							故障交換
						</ActionButton>
						<ActionButton
							icon={<Unlink className="w-4 h-4" />}
							onClick={prepareUnassign}
							disabled={preparing}
						>
							割当解除
						</ActionButton>
					</>
				)}
				{active && !assigned && (
					<ActionButton
						icon={<PowerOff className="w-4 h-4" />}
						onClick={prepareDeactivate}
						disabled={preparing}
						danger
					>
						停止する
					</ActionButton>
				)}
				{!active && (
					<ActionButton
						icon={<Power className="w-4 h-4" />}
						onClick={prepareActivate}
						disabled={preparing}
						primary
					>
						利用を再開する
					</ActionButton>
				)}
			</div>
			{active && assigned && (
				<p className="mt-2 text-xs text-gray-500">
					割当中のデバイスは停止できません。故障したときは「故障交換」で予備のデバイスに替えてください。
				</p>
			)}

			<ElderPickerDialog
				open={picker === "assign" || picker === "transfer"}
				title={picker === "transfer" ? "付け替え先を選ぶ" : "割当先を選ぶ"}
				busy={preparing}
				onClose={() => setPicker(null)}
				onNext={(elder) => {
					if (picker === "transfer") {
						prepareTransfer(elder);
					} else {
						prepareAssign(elder);
					}
				}}
			/>
			<SparePickerDialog
				open={picker === "replace"}
				busy={preparing}
				onClose={() => setPicker(null)}
				onNext={prepareReplace}
			/>

			{pending !== null && (
				<ConfirmDialog
					open
					title={confirmTitle(pending)}
					confirmLabel={confirmLabel(pending)}
					danger={pending.kind !== "assign" && pending.kind !== "activate"}
					busy={executing}
					onConfirm={execute}
					onClose={() => {
						// 実行中は閉じない（二重送信と、結果がわからない状態を防ぐ）
						if (!executing) {
							setPending(null);
						}
					}}
				>
					<ConfirmBody action={pending} />
				</ConfirmDialog>
			)}
		</>
	);
}

function confirmTitle(action: PendingAction): string {
	const titles = {
		assign: "割当の確認",
		unassign: "割当解除の確認",
		transfer: "付け替えの確認",
		replace: "故障交換の確認",
		deactivate: "停止の確認",
		activate: "利用再開の確認",
	} as const;
	return titles[action.kind];
}

function confirmLabel(action: PendingAction): string {
	const labels = {
		assign: "割り当てる",
		unassign: "解除する",
		transfer: "付け替える",
		replace: "交換する",
		deactivate: "停止する",
		activate: "再開する",
	} as const;
	return labels[action.kind];
}

// 確認ダイアログの本文（詳細設計 03 の4章の表）
// デバイスは名前が重複することがあるため、必ず名前とコードを一緒に表示する
function ConfirmBody({ action }: { action: PendingAction }) {
	const deviceLabel = formatDeviceLabel(action.device);

	if (action.kind === "assign") {
		return (
			<ConfirmTable
				rows={[
					["デバイス", deviceLabel],
					["割当先", formatElderLabel(action.elder)],
					["変更内容", `未割当 → ${elderName(action.elder)}`],
				]}
			/>
		);
	}
	if (action.kind === "unassign") {
		return (
			<>
				<ConfirmTable
					rows={[
						["デバイス", deviceLabel],
						["現在の割当先", formatElderLabel(action.assignment.elder)],
						["変更内容", `${elderName(action.assignment.elder)} → 未割当`],
					]}
				/>
				<AlertNote />
			</>
		);
	}
	if (action.kind === "transfer") {
		return (
			<>
				<ConfirmTable
					rows={[
						["デバイス", deviceLabel],
						["変更前", formatElderLabel(action.assignment.elder)],
						["変更後", formatElderLabel(action.elder)],
						[
							"変更内容",
							`${elderName(action.assignment.elder)} → ${elderName(action.elder)}`,
						],
					]}
				/>
				<AlertNote />
			</>
		);
	}
	if (action.kind === "replace") {
		return (
			<>
				<ConfirmTable
					rows={[
						["対象の入所者", formatElderLabel(action.assignment.elder)],
						["旧デバイス", deviceLabel],
						["新デバイス", formatDeviceLabel(action.newDevice)],
						[
							"変更内容",
							`${deviceLabel} → ${formatDeviceLabel(action.newDevice)}`,
						],
					]}
				/>
				<p className="font-medium text-rose-700">
					旧デバイスは「停止中」になります。修理が終わったら、デバイスの詳細から利用を再開してください。
				</p>
				<AlertNote />
			</>
		);
	}
	if (action.kind === "deactivate") {
		return (
			<>
				<ConfirmTable
					rows={[
						["デバイス", deviceLabel],
						["変更内容", "利用中 → 停止中"],
					]}
				/>
				<p>停止中のデバイスからの通知は、AI が推論しません。</p>
				<AlertNote />
			</>
		);
	}
	return (
		<ConfirmTable
			rows={[
				["デバイス", deviceLabel],
				["変更内容", "停止中 → 利用中"],
			]}
		/>
	);
}

function elderName(elder: ElderSummary): string {
	return `${elder.lastName} ${elder.firstName}`;
}

function ConfirmTable({ rows }: { rows: [string, string][] }) {
	return (
		<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg bg-gray-50 p-3">
			{rows.map(([label, value]) => (
				<div key={label} className="contents">
					<dt className="text-gray-500">{label}</dt>
					<dd className="font-medium text-gray-900 break-all">{value}</dd>
				</div>
			))}
		</dl>
	);
}

function AlertNote() {
	return (
		<p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
			{ALERT_NOTE}
		</p>
	);
}

function ActionButton({
	children,
	icon,
	onClick,
	disabled,
	primary,
	danger,
}: {
	children: ReactNode;
	icon?: ReactNode;
	onClick: () => void;
	disabled?: boolean;
	primary?: boolean;
	danger?: boolean;
}) {
	let colorClass =
		"border border-gray-300 bg-white text-gray-700 hover:bg-gray-50";
	if (primary) {
		colorClass = "bg-violet-600 text-white hover:bg-violet-700";
	}
	if (danger) {
		colorClass =
			"border border-rose-200 bg-white text-rose-700 hover:bg-rose-50";
	}
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 ${colorClass}`}
		>
			{icon}
			{children}
		</button>
	);
}
