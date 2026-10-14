"use client";

import {
	HiOutlineArrowPath,
	HiOutlineEnvelope,
	HiOutlineNoSymbol,
	HiOutlinePlayCircle,
} from "react-icons/hi2";
import { ROLE_LABELS } from "@/features/staff-management/constants/staff.constant";
import type {
	StaffItem,
	StaffRole,
} from "@/features/staff-management/types/staff.types";
import { RolePicker } from "./RolePicker";
import { StaffName } from "./StaffName";

// 利用中・停止中のスタッフ一覧
// どのボタンを出すかは、API が返す availableActions で決める
interface StaffTableProps {
	staff: StaffItem[];
	currentUserId: string;
	busyId: string | null;
	onRoleChange: (staff: StaffItem, role: StaffRole) => void;
	onDeactivate: (staff: StaffItem) => void;
	onActivate: (staff: StaffItem) => void;
	onReinvite: (staff: StaffItem) => void;
	onRetryCancel: (staff: StaffItem) => void;
}

// 最後の看護師（管理者）のときに表示する理由
const LAST_NURSE_REASON = "最後の看護師（管理者）は変更・無効化できません";

// 自分のロールを変えようとしたときに表示する理由
const SELF_ROLE_REASON =
	"自分のロールは変更できません。他の看護師（管理者）に依頼してください";

// 自分を無効化しようとしたときに表示する理由
const SELF_DEACTIVATE_REASON =
	"自分自身は無効化できません。他の看護師（管理者）に依頼してください";

// ロールの列（利用中なら変更できるセレクト、停止中なら文字だけ）
function RoleCell({
	staff,
	isSelf,
	busyId,
	onRoleChange,
}: {
	staff: StaffItem;
	isSelf: boolean; // ログイン中の本人か
	busyId: string | null;
	onRoleChange: (staff: StaffItem, role: StaffRole) => void;
}) {
	if (staff.status !== "ACTIVE") {
		return (
			<span className="text-xs text-slate-500 font-semibold">
				{ROLE_LABELS[staff.role]}
			</span>
		);
	}

	// 押せない理由（自分 → 最後の看護師 の順に確認する）
	let disabledReason: string | undefined;
	if (isSelf) {
		disabledReason = SELF_ROLE_REASON;
	} else if (!staff.availableActions.includes("CHANGE_ROLE")) {
		disabledReason = LAST_NURSE_REASON;
	}

	return (
		<RolePicker
			value={staff.role}
			onChange={(role) => onRoleChange(staff, role)}
			disabled={disabledReason !== undefined || busyId !== null}
			disabledReason={disabledReason}
		/>
	);
}

// 操作ボタン（PC とスマホで同じものを使う）
function StaffActions({
	staff,
	isSelf,
	busyId,
	onDeactivate,
	onActivate,
	onReinvite,
	onRetryCancel,
}: {
	staff: StaffItem;
	isSelf: boolean; // ログイン中の本人か
	busyId: string | null;
	onDeactivate: (staff: StaffItem) => void;
	onActivate: (staff: StaffItem) => void;
	onReinvite: (staff: StaffItem) => void;
	onRetryCancel: (staff: StaffItem) => void;
}) {
	const isBusy = busyId !== null;
	const actions = staff.availableActions;

	const baseButton =
		"px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

	// 無効化を押せない理由（自分 → 最後の看護師 の順に確認する）
	let deactivateDisabledReason: string | undefined;
	if (isSelf) {
		deactivateDisabledReason = SELF_DEACTIVATE_REASON;
	} else if (!actions.includes("DEACTIVATE")) {
		deactivateDisabledReason = LAST_NURSE_REASON;
	}

	return (
		<div className="flex flex-wrap items-center gap-2 justify-end">
			{/* 利用中：無効化（自分・最後の看護師なら押せない状態で表示する） */}
			{staff.status === "ACTIVE" && (
				<button
					type="button"
					onClick={() => onDeactivate(staff)}
					disabled={isBusy || deactivateDisabledReason !== undefined}
					title={deactivateDisabledReason}
					className={`${baseButton} bg-rose-50 text-rose-600 hover:bg-rose-100`}
				>
					<HiOutlineNoSymbol className="text-sm" />
					<span>無効化</span>
				</button>
			)}

			{/* 停止中・紐付け済み：有効化 */}
			{actions.includes("ACTIVATE") && (
				<button
					type="button"
					onClick={() => onActivate(staff)}
					disabled={isBusy}
					className={`${baseButton} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
				>
					<HiOutlinePlayCircle className="text-sm" />
					<span>有効化</span>
				</button>
			)}

			{/* 停止中・未紐付け（取消・招待失敗）：再招待、取消処理の再試行 */}
			{actions.includes("REINVITE") && (
				<button
					type="button"
					onClick={() => onReinvite(staff)}
					disabled={isBusy}
					className={`${baseButton} bg-purple-50 text-[#7c3aed] hover:bg-purple-100`}
				>
					<HiOutlineEnvelope className="text-sm" />
					<span>再招待</span>
				</button>
			)}
			{actions.includes("RETRY_CANCEL") && (
				<button
					type="button"
					onClick={() => onRetryCancel(staff)}
					disabled={isBusy}
					className={`${baseButton} bg-slate-100 text-slate-600 hover:bg-slate-200`}
				>
					<HiOutlineArrowPath className="text-sm" />
					<span>{busyId === staff.id ? "処理中…" : "取消処理を再試行"}</span>
				</button>
			)}
		</div>
	);
}

export function StaffTable({
	staff,
	currentUserId,
	busyId,
	onRoleChange,
	onDeactivate,
	onActivate,
	onReinvite,
	onRetryCancel,
}: StaffTableProps) {
	if (staff.length === 0) {
		return (
			<div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-sm text-slate-400">
				該当するスタッフはいません
			</div>
		);
	}

	return (
		<div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
			{/* PC：表 */}
			<table className="hidden md:table w-full text-left text-xs border-collapse">
				<thead>
					<tr className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
						<th className="py-4 px-6">スタッフ</th>
						<th className="py-4 px-6">権限ロール</th>
						<th className="py-4 px-6 text-right">操作</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-slate-50">
					{staff.map((item) => (
						<tr key={item.id} className="hover:bg-purple-50/20 transition">
							<td className="py-4 px-6">
								<StaffName staff={item} isSelf={item.id === currentUserId} />
							</td>
							<td className="py-4 px-6">
								<RoleCell
									staff={item}
									isSelf={item.id === currentUserId}
									busyId={busyId}
									onRoleChange={onRoleChange}
								/>
							</td>
							<td className="py-4 px-6">
								<StaffActions
									staff={item}
									isSelf={item.id === currentUserId}
									busyId={busyId}
									onDeactivate={onDeactivate}
									onActivate={onActivate}
									onReinvite={onReinvite}
									onRetryCancel={onRetryCancel}
								/>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{/* スマホ：カード */}
			<div className="md:hidden divide-y divide-slate-100">
				{staff.map((item) => (
					<div key={item.id} className="p-4 space-y-3">
						<StaffName staff={item} isSelf={item.id === currentUserId} />
						<RoleCell
							staff={item}
							isSelf={item.id === currentUserId}
							busyId={busyId}
							onRoleChange={onRoleChange}
						/>
						<StaffActions
							staff={item}
							isSelf={item.id === currentUserId}
							busyId={busyId}
							onDeactivate={onDeactivate}
							onActivate={onActivate}
							onReinvite={onReinvite}
							onRetryCancel={onRetryCancel}
						/>
					</div>
				))}
			</div>
		</div>
	);
}
