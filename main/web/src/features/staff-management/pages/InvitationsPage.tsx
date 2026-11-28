"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HiOutlineArrowLeft, HiOutlinePlus } from "react-icons/hi2";
import {
	type ApiResult,
	cancelInvitation,
	fetchInvitations,
	inviteStaff,
	syncInvitation,
} from "@/features/staff-management/api/staff-api";
import { InvitationTable } from "@/features/staff-management/components/InvitationTable";
import { StaffFormModal } from "@/features/staff-management/components/StaffFormModal";
import { ROLE_LABELS } from "@/features/staff-management/constants/staff.constant";
import type { StaffInviteInput } from "@/features/staff-management/schemas/staff-input";
import type {
	StaffItem,
	StaffOperationResult,
} from "@/features/staff-management/types/staff.types";
import { noticeFromResult } from "@/features/staff-management/utils/result-notice";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { type Notice, NoticeBanner } from "@/shared/ui/NoticeBanner";

// スタッフ招待画面（/staff/invitations）
// 登録待ち一覧・招待フォーム・照合・取消・既存アカウントの紐付け確認
export function InvitationsPage() {
	// 一覧
	const [staff, setStaff] = useState<StaffItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);

	// お知らせ・処理中のスタッフ
	const [notice, setNotice] = useState<Notice | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);

	// 招待フォーム
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	// 確認ダイアログ
	const [linkTarget, setLinkTarget] = useState<{
		staff: StaffItem;
		token: string;
	} | null>(null);
	const [cancelTarget, setCancelTarget] = useState<StaffItem | null>(null);

	// 一覧を読み込んだ結果を画面に反映する
	function showList(result: ApiResult<{ staff: StaffItem[] }>) {
		if (result.ok) {
			setStaff(result.data.staff);
			setLoadError(null);
		} else {
			setLoadError(result.error.message);
		}
		setIsLoading(false);
	}

	// 操作の後に、一覧を読み直す
	async function loadList() {
		showList(await fetchInvitations());
	}

	// 画面を開いたときに、一覧を読み込む
	// （state の更新は then の中で行う。画面を閉じた後なら何もしない）
	useEffect(() => {
		let isClosed = false;
		fetchInvitations().then((result) => {
			if (isClosed) {
				return;
			}
			if (result.ok) {
				setStaff(result.data.staff);
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

	// 照合・招待が成功したときの表示
	// 既存アカウントが見つかったら、紐付けの確認ダイアログを開く
	function handleSuccess(data: StaffOperationResult, defaultMessage: string) {
		if (
			data.result === "CONFIRM_REQUIRED" &&
			data.confirmationToken !== undefined
		) {
			setLinkTarget({ staff: data.staff, token: data.confirmationToken });
			return;
		}
		setNotice(noticeFromResult(data, defaultMessage));
	}

	// ===== 新規招待 =====
	async function handleInvite(values: StaffInviteInput) {
		setIsSubmitting(true);
		setFormError(null);
		const result = await inviteStaff(values);
		setIsSubmitting(false);

		if (result.ok) {
			setIsFormOpen(false);
			handleSuccess(result.data, "招待しました");
		} else if (result.status === 400) {
			// 入力エラー → フォームを開いたまま表示する
			setFormError(result.error.message);
		} else {
			setIsFormOpen(false);
			setNotice({ type: "error", message: result.error.message });
		}

		// エラーでも DB の状態が変わっていることがあるので、毎回読み直す（設計書 8節）
		await loadList();
	}

	// ===== 照合（confirmationToken は紐付けを確認したときだけ） =====
	async function handleSync(target: StaffItem, confirmationToken?: string) {
		setBusyId(target.id);
		const result = await syncInvitation(target.id, confirmationToken);
		setBusyId(null);

		if (result.ok) {
			handleSuccess(result.data, "照合しました");
		} else {
			setNotice({ type: "error", message: result.error.message });
		}
		await loadList();
	}

	// ===== 取消 =====
	async function handleCancel(target: StaffItem) {
		setBusyId(target.id);
		const result = await cancelInvitation(target.id);
		setBusyId(null);
		setCancelTarget(null);

		if (result.ok) {
			setNotice({
				type: "success",
				message: `${target.displayName} さんの招待を取り消しました`,
			});
		} else {
			// 取消に失敗しても DB は INACTIVE になっている。スタッフ一覧から再試行できる
			setNotice({ type: "error", message: result.error.message });
		}
		await loadList();
	}

	return (
		<div className="space-y-6 max-w-7xl w-full mx-auto">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<Link
						href="/staff"
						className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-[#7c3aed] mb-1"
					>
						<HiOutlineArrowLeft />
						スタッフ一覧へ戻る
					</Link>
					<h2 className="text-2xl font-bold text-slate-900">スタッフ招待</h2>
					<p className="text-xs text-slate-500 mt-1">
						招待したスタッフが Clerk で登録すると、自動で利用中になります
					</p>
				</div>

				<button
					type="button"
					onClick={() => {
						setFormError(null);
						setIsFormOpen(true);
					}}
					className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-purple-200 flex items-center space-x-2 transition cursor-pointer"
				>
					<HiOutlinePlus className="text-base" />
					<span>スタッフを招待</span>
				</button>
			</div>

			<NoticeBanner notice={notice} onClose={() => setNotice(null)} />

			<section className="space-y-3">
				<h3 className="text-lg font-bold">登録待ちのスタッフ</h3>
				{isLoading && <p className="text-sm text-slate-400">読み込み中…</p>}
				{loadError && (
					<p className="text-sm text-red-600" role="alert">
						{loadError}
					</p>
				)}
				{!isLoading && !loadError && (
					<InvitationTable
						staff={staff}
						busyId={busyId}
						onSync={(target) => void handleSync(target)}
						onCancel={(target) => setCancelTarget(target)}
					/>
				)}
			</section>

			{/* 招待フォーム */}
			<StaffFormModal
				open={isFormOpen}
				mode="invite"
				busy={isSubmitting}
				serverError={formError}
				onClose={() => setIsFormOpen(false)}
				onSubmit={(values) => void handleInvite(values)}
			/>

			{/* 既存アカウントの紐付け確認（設計書 4.2） */}
			<ConfirmDialog
				open={linkTarget !== null}
				title="既存のアカウントが見つかりました"
				confirmLabel="権限を付与する"
				busy={busyId !== null}
				onClose={() => setLinkTarget(null)}
				onConfirm={() => {
					if (linkTarget !== null) {
						const target = linkTarget;
						setLinkTarget(null);
						void handleSync(target.staff, target.token);
					}
				}}
			>
				<p>
					このメールアドレスの既存アカウントへ、このスタッフの権限を付与します。
				</p>
				{linkTarget && (
					<dl className="rounded-xl bg-slate-50 p-4 text-xs space-y-1">
						<div>
							<dt className="inline text-slate-500">氏名：</dt>
							<dd className="inline font-bold">
								{linkTarget.staff.displayName}
							</dd>
						</div>
						<div>
							<dt className="inline text-slate-500">メール：</dt>
							<dd className="inline font-bold">{linkTarget.staff.email}</dd>
						</div>
						<div>
							<dt className="inline text-slate-500">ロール：</dt>
							<dd className="inline font-bold">
								{ROLE_LABELS[linkTarget.staff.role]}
							</dd>
						</div>
					</dl>
				)}
				<p className="text-xs text-slate-500">
					本人のアカウントであることを確認してから実行してください（5分以内）。
				</p>
			</ConfirmDialog>

			{/* 取消の確認 */}
			<ConfirmDialog
				open={cancelTarget !== null}
				title="招待を取り消しますか？"
				confirmLabel="取り消す"
				danger
				busy={busyId !== null}
				onClose={() => setCancelTarget(null)}
				onConfirm={() => {
					if (cancelTarget !== null) {
						void handleCancel(cancelTarget);
					}
				}}
			>
				<p>
					<span className="font-bold">{cancelTarget?.displayName}</span> さん（
					{cancelTarget?.email}）への招待を取り消します。
				</p>
				<p className="text-xs text-slate-500">
					取り消したスタッフは、スタッフ一覧の「停止中」から再招待できます。
				</p>
			</ConfirmDialog>
		</div>
	);
}
