"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HiOutlinePlus } from "react-icons/hi2";
import {
	type ApiResult,
	activateStaff,
	cancelInvitation,
	changeStaffRole,
	deactivateStaff,
	fetchStaffList,
	reinviteStaff,
} from "@/features/staff-management/api/staff-api";
import { StaffFormModal } from "@/features/staff-management/components/StaffFormModal";
import { StaffSummaryCards } from "@/features/staff-management/components/StaffSummaryCards";
import { StaffTable } from "@/features/staff-management/components/StaffTable";
import { ROLE_LABELS } from "@/features/staff-management/constants/staff.constant";
import type { StaffReinviteInput } from "@/features/staff-management/schemas/staff-input";
import type {
	StaffItem,
	StaffRole,
} from "@/features/staff-management/types/staff.types";
import { noticeFromResult } from "@/features/staff-management/utils/result-notice";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { type Notice, NoticeBanner } from "@/shared/ui/NoticeBanner";

// スタッフ管理画面（/staff）
// 利用中・停止中の一覧、ロール変更・無効化・有効化・再招待・取消の再試行
interface StaffManagementPageProps {
	currentUserId: string; // ログイン中の NURSE の User.id（「自分」の表示に使う）
}

export function StaffManagementPage({
	currentUserId,
}: StaffManagementPageProps) {
	// 一覧（利用中・停止中をまとめて読み、タブで切り替える）
	const [allStaff, setAllStaff] = useState<StaffItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [tab, setTab] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

	// お知らせ・処理中のスタッフ
	const [notice, setNotice] = useState<Notice | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);

	// 確認ダイアログ・再招待フォーム
	const [deactivateTarget, setDeactivateTarget] = useState<StaffItem | null>(
		null,
	);
	const [activateTarget, setActivateTarget] = useState<StaffItem | null>(null);
	const [reinviteTarget, setReinviteTarget] = useState<StaffItem | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	// 一覧を読み込んだ結果を画面に反映する
	function showList(result: ApiResult<{ staff: StaffItem[] }>) {
		if (result.ok) {
			setAllStaff(result.data.staff);
			setLoadError(null);
		} else {
			setLoadError(result.error.message);
		}
		setIsLoading(false);
	}

	// 操作の後に、一覧を読み直す
	async function loadList() {
		showList(await fetchStaffList());
	}

	// 画面を開いたときに、一覧を読み込む
	// （state の更新は then の中で行う。画面を閉じた後なら何もしない）
	useEffect(() => {
		let isClosed = false;
		fetchStaffList().then((result) => {
			if (isClosed) {
				return;
			}
			if (result.ok) {
				setAllStaff(result.data.staff);
				setLoadError(null);
			} else {
				setLoadError(result.error.message);
			}
			setIsLoading(false);
		});
		return () => {
			isClosed = true;
		};
	}, []);

	// タブで表示するスタッフを分ける
	const activeStaff: StaffItem[] = [];
	const inactiveStaff: StaffItem[] = [];
	for (const item of allStaff) {
		if (item.status === "ACTIVE") {
			activeStaff.push(item);
		} else if (item.status === "INACTIVE") {
			inactiveStaff.push(item);
		}
	}
	const shownStaff = tab === "ACTIVE" ? activeStaff : inactiveStaff;

	// ===== ロール変更 =====
	async function handleRoleChange(target: StaffItem, role: StaffRole) {
		setBusyId(target.id);
		const result = await changeStaffRole(target.id, role);
		setBusyId(null);

		if (result.ok) {
			setNotice(
				noticeFromResult(
					result.data,
					`${target.displayName} さんを「${ROLE_LABELS[role]}」に変更しました`,
				),
			);
		} else {
			setNotice({ type: "error", message: result.error.message });
		}
		// エラーでも DB の状態が変わっていることがあるので、毎回読み直す（設計書 8節）
		await loadList();
	}

	// ===== 無効化 =====
	async function handleDeactivate(target: StaffItem) {
		setBusyId(target.id);
		const result = await deactivateStaff(target.id);
		setBusyId(null);
		setDeactivateTarget(null);

		if (result.ok) {
			setNotice({
				type: "success",
				message: `${target.displayName} さんを無効化しました`,
			});
		} else {
			setNotice({ type: "error", message: result.error.message });
		}
		await loadList();
	}

	// ===== 有効化 =====
	async function handleActivate(target: StaffItem) {
		setBusyId(target.id);
		const result = await activateStaff(target.id);
		setBusyId(null);
		setActivateTarget(null);

		if (result.ok) {
			setNotice({
				type: "success",
				message: `${target.displayName} さんを有効化しました`,
			});
		} else {
			setNotice({ type: "error", message: result.error.message });
		}
		await loadList();
	}

	// ===== 再招待 =====
	async function handleReinvite(values: StaffReinviteInput) {
		if (reinviteTarget === null) {
			return;
		}
		const target = reinviteTarget;

		setIsSubmitting(true);
		setFormError(null);
		const result = await reinviteStaff(target.id, values);
		setIsSubmitting(false);

		if (result.ok) {
			setReinviteTarget(null);
			const resultNotice = noticeFromResult(result.data, "再招待しました");
			setNotice({
				type: resultNotice.type,
				message: `${resultNotice.message}（招待一覧で確認できます）`,
			});
		} else if (result.status === 400) {
			setFormError(result.error.message);
		} else {
			setReinviteTarget(null);
			setNotice({ type: "error", message: result.error.message });
		}
		await loadList();
	}

	// ===== 取消処理の再試行 =====
	async function handleRetryCancel(target: StaffItem) {
		setBusyId(target.id);
		const result = await cancelInvitation(target.id);
		setBusyId(null);

		if (result.ok) {
			setNotice({
				type: "success",
				message: `${target.displayName} さんの招待の取消が完了しました`,
			});
		} else {
			setNotice({ type: "error", message: result.error.message });
		}
		await loadList();
	}

	// タブのボタンの見た目
	function tabClass(isSelected: boolean): string {
		return `px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
			isSelected
				? "bg-[#7c3aed] text-white shadow-md shadow-purple-200"
				: "bg-white text-slate-500 hover:bg-slate-100"
		}`;
	}

	return (
		<div className="space-y-6 max-w-7xl w-full mx-auto">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="text-2xl font-bold text-slate-900">スタッフ管理</h2>
				<Link
					href="/staff/invitations"
					className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-purple-200 flex items-center space-x-2 transition"
				>
					<HiOutlinePlus className="text-base" />
					<span>スタッフを招待</span>
				</Link>
			</div>

			<NoticeBanner notice={notice} onClose={() => setNotice(null)} />

			<StaffSummaryCards staff={activeStaff} />

			<section className="space-y-3">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setTab("ACTIVE")}
						className={tabClass(tab === "ACTIVE")}
					>
						利用中（{activeStaff.length}）
					</button>
					<button
						type="button"
						onClick={() => setTab("INACTIVE")}
						className={tabClass(tab === "INACTIVE")}
					>
						停止中（{inactiveStaff.length}）
					</button>
				</div>

				{isLoading && <p className="text-sm text-slate-400">読み込み中…</p>}
				{loadError && (
					<p className="text-sm text-red-600" role="alert">
						{loadError}
					</p>
				)}
				{!isLoading && !loadError && (
					<StaffTable
						staff={shownStaff}
						currentUserId={currentUserId}
						busyId={busyId}
						onRoleChange={(target, role) => void handleRoleChange(target, role)}
						onDeactivate={(target) => setDeactivateTarget(target)}
						onActivate={(target) => setActivateTarget(target)}
						onReinvite={(target) => {
							setFormError(null);
							setReinviteTarget(target);
						}}
						onRetryCancel={(target) => void handleRetryCancel(target)}
					/>
				)}
			</section>

			{/* 無効化の確認 */}
			<ConfirmDialog
				open={deactivateTarget !== null}
				title="スタッフを無効化しますか？"
				confirmLabel="無効化する"
				danger
				busy={busyId !== null}
				onClose={() => setDeactivateTarget(null)}
				onConfirm={() => {
					if (deactivateTarget !== null) {
						void handleDeactivate(deactivateTarget);
					}
				}}
			>
				<p>
					<span className="font-bold">{deactivateTarget?.displayName}</span>{" "}
					さんは、このシステムを利用できなくなります。
				</p>
				<p className="text-xs text-slate-500">
					データは削除されません。「停止中」タブから有効化できます。
				</p>
			</ConfirmDialog>

			{/* 有効化の確認（設計書：氏名・email・ロールだけを表示する） */}
			<ConfirmDialog
				open={activateTarget !== null}
				title="スタッフを有効化しますか？"
				confirmLabel="有効化する"
				busy={busyId !== null}
				onClose={() => setActivateTarget(null)}
				onConfirm={() => {
					if (activateTarget !== null) {
						void handleActivate(activateTarget);
					}
				}}
			>
				{activateTarget && (
					<dl className="rounded-xl bg-slate-50 p-4 text-xs space-y-1">
						<div>
							<dt className="inline text-slate-500">氏名：</dt>
							<dd className="inline font-bold">{activateTarget.displayName}</dd>
						</div>
						<div>
							<dt className="inline text-slate-500">メール：</dt>
							<dd className="inline font-bold">{activateTarget.email}</dd>
						</div>
						<div>
							<dt className="inline text-slate-500">ロール：</dt>
							<dd className="inline font-bold">
								{ROLE_LABELS[activateTarget.role]}
							</dd>
						</div>
					</dl>
				)}
				<p className="text-xs text-slate-500">
					ロールを変える場合は、有効化した後に変更してください。
				</p>
			</ConfirmDialog>

			{/* 再招待フォーム */}
			<StaffFormModal
				open={reinviteTarget !== null}
				mode="reinvite"
				target={reinviteTarget}
				busy={isSubmitting}
				serverError={formError}
				onClose={() => setReinviteTarget(null)}
				onSubmit={(values) => void handleReinvite(values)}
			/>
		</div>
	);
}
