"use client";

import { useReverification } from "@clerk/nextjs";
import { useState } from "react";
import { HiOutlineMagnifyingGlass, HiOutlinePlus } from "react-icons/hi2";
import { AddElderModal } from "@/features/elder-management/components/AddElderModal";
import { ElderSummaryCards } from "@/features/elder-management/components/ElderSummaryCards";
import { ElderTable } from "@/features/elder-management/components/ElderTable";
import { useDebouncedValue } from "@/features/elder-management/hooks/useDebouncedValue";
import {
	useCreateElder,
	useDeleteElder,
	useElders,
	useUpdateElder,
} from "@/features/elder-management/hooks/useElders";
import {
	clampPage,
	getTotalPages,
} from "@/features/elder-management/lib/pagination";
import {
	CreateElderInput,
	ElderListParams,
	ElderRow,
	ElderStatus,
	UpdateElderInput,
} from "@/features/elder-management/types/elder.types";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { type Notice, NoticeBanner } from "@/shared/ui/NoticeBanner";

// 一覧上部のナビゲーション。無効化（退所）した高齢者は通常の一覧から分けて表示する。
const ELDER_STATUS_TABS: { value: ElderStatus; label: string }[] = [
	{ value: "ACTIVE", label: "在籍中" },
	{ value: "INACTIVE", label: "無効化" },
];

type ConfirmAction = "deactivate" | "reactivate";

interface ConfirmTarget {
	id: string;
	action: ConfirmAction;
}

export function ElderManagementPage() {
	const [page, setPage] = useState(1);
	const [limit] = useState(20);
	const [statusFilter, setStatusFilter] = useState<ElderStatus>("ACTIVE");
	const [searchInput, setSearchInput] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const debouncedSearch = useDebouncedValue(searchQuery, 300);

	const [openAddModal, setOpenAddModal] = useState(false);
	const [editingElder, setEditingElder] = useState<ElderRow | null>(null);
	const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(
		null,
	);
	// 閉じたエラーの発生インスタンスを覚えておく。同一文言でも別のエラーが発生したら再表示する。
	const [dismissedError, setDismissedError] = useState<Error | null>(null);

	const params: ElderListParams = {
		page,
		limit,
		status: statusFilter,
		q: debouncedSearch.trim() || undefined,
	};

	const { data, isLoading, error } = useElders(params);
	const elders = data?.data ?? [];
	const total = data?.total ?? 0;
	const summary = data?.summary ?? { total: 0, active: 0, inactive: 0 };

	const totalPages = getTotalPages(total, limit);

	// 件数が減ったときに現在ページを有効範囲へ補正する（レンダー中の state 調整）。
	// 例: 在籍中21件の2ページ目で1件を退所させると total は 20 になるため、
	// page を 1 に戻さないと一覧が空になりページ操作もできなくなる。
	const correctedPage = clampPage(page, total, limit);
	if (correctedPage !== page) {
		setPage(correctedPage);
	}

	const createMutation = useCreateElder();
	const updateMutation = useUpdateElder();
	const deleteMutation = useDeleteElder();

	// 退所（無効化）は影響が大きいため、実行前に Clerk の再認証（reverification）を必須にする。
	// 再認証が必要な場合、useReverification がモーダルを表示し、成功後に DELETE を自動で再試行する。
	const removeElder = useReverification((id: string) =>
		deleteMutation.mutateAsync(id),
	);

	const confirmElder = confirmTarget
		? elders.find((elder) => elder.id === confirmTarget.id)
		: null;

	// エラーの出しどころを分ける（表示するエラーの source of truth を 1 つに保つ）:
	// - 追加・編集の失敗は、開いているフォームモーダルの中に出す
	// - 一覧取得・退所・在籍に戻すの失敗は、ページ上部のバナーに出す
	const isFormOpen = openAddModal || editingElder !== null;
	const formErrorMessage = isFormOpen
		? (editingElder ? updateMutation : createMutation).error?.message
		: undefined;
	const queryErrorMessage =
		error && error !== dismissedError ? error.message : null;
	const pageErrorMessage =
		deleteMutation.error?.message ??
		(isFormOpen
			? null
			: (updateMutation.error?.message ?? createMutation.error?.message)) ??
		queryErrorMessage;

	const bannerNotice: Notice | null = pageErrorMessage
		? { type: "error", message: pageErrorMessage }
		: null;

	// バナーを閉じたら、その時点のエラーだけを消す（次に失敗したら再表示される）
	const dismissNotice = () => {
		createMutation.reset();
		updateMutation.reset();
		deleteMutation.reset();
		setDismissedError(error ?? null);
	};

	const handleAdd = async (data: CreateElderInput) => {
		try {
			await createMutation.mutateAsync(data);
			setOpenAddModal(false);
		} catch {
			// 失敗時はモーダルを開いたまま、createMutation.error をモーダル内に表示する
		}
	};

	const handleEdit = async (data: UpdateElderInput) => {
		if (!editingElder) return;
		try {
			await updateMutation.mutateAsync({ id: editingElder.id, data });
			setEditingElder(null);
		} catch {
			// 失敗時はモーダルを開いたまま、updateMutation.error をモーダル内に表示する
		}
	};

	const handleAddClick = () => {
		// 前回の失敗メッセージを持ち越さない
		createMutation.reset();
		setEditingElder(null);
		setOpenAddModal(true);
	};

	const handleEditClick = (elder: ElderRow) => {
		updateMutation.reset();
		setEditingElder(elder);
	};

	const handleDelete = (id: string) => {
		deleteMutation.reset();
		updateMutation.reset();
		setConfirmTarget({ id, action: "deactivate" });
	};

	const handleReactivate = (id: string) => {
		updateMutation.reset();
		deleteMutation.reset();
		setConfirmTarget({ id, action: "reactivate" });
	};

	const handleConfirm = async () => {
		if (!confirmTarget) return;
		const { id, action } = confirmTarget;

		try {
			if (action === "deactivate") {
				await removeElder(id);
			} else {
				await updateMutation.mutateAsync({ id, data: { status: "ACTIVE" } });
			}
		} catch {
			// 再認証のキャンセル、または失敗。ダイアログを閉じてバナーで通知する。
		} finally {
			// 処理が終わるまでダイアログを開いたままにして「処理中…」を出す
			setConfirmTarget(null);
		}
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setSearchQuery(searchInput.trim());
		setPage(1);
	};

	const handleReset = () => {
		setSearchInput("");
		setSearchQuery("");
		setPage(1);
	};

	return (
		<div className="p-6 space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">高齢者管理</h1>
					<p className="text-sm text-gray-500 mt-1">
						在籍情報の登録・編集・ステータス管理
					</p>
				</div>
				<button
					type="button"
					onClick={handleAddClick}
					className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
				>
					<HiOutlinePlus className="w-5 h-5" />
					高齢者を追加
				</button>
			</div>

			{bannerNotice && (
				<NoticeBanner notice={bannerNotice} onClose={dismissNotice} />
			)}

			<ElderSummaryCards summary={summary} />

			<div className="bg-white rounded-xl shadow-sm border border-gray-100">
				{/* タブではなく一覧の絞り込みボタンなので、group + aria-pressed にする */}
				<fieldset
					className="flex gap-1 px-4 border-b border-gray-100"
					aria-label="高齢者のステータス"
				>
					{ELDER_STATUS_TABS.map((tab) => {
						const isActive = statusFilter === tab.value;
						const count =
							tab.value === "ACTIVE" ? summary.active : summary.inactive;
						return (
							<button
								key={tab.value}
								type="button"
								aria-pressed={isActive}
								onClick={() => {
									setStatusFilter(tab.value);
									setPage(1);
								}}
								className={`px-4 py-3 -mb-px text-sm font-medium border-b-2 transition-colors ${
									isActive
										? "border-violet-600 text-violet-700"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}`}
							>
								{tab.label}
								<span
									className={`ml-1.5 text-xs ${isActive ? "text-violet-500" : "text-gray-400"}`}
								>
									{count}
								</span>
							</button>
						);
					})}
				</fieldset>
				<form
					onSubmit={handleSearch}
					className="flex flex-wrap items-center gap-3 p-4"
				>
					<div className="relative flex-1 basis-40 min-w-[12rem]">
						<label htmlFor="elder-search" className="sr-only">
							氏名・部屋番号で検索
						</label>
						<HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
						<input
							id="elder-search"
							type="text"
							placeholder="氏名・部屋番号で検索..."
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							className="w-full h-10 pl-10 pr-4 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
						/>
					</div>
					<button
						type="submit"
						className="h-10 px-4 shrink-0 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors"
					>
						検索
					</button>
					{searchInput && (
						<button
							type="button"
							onClick={handleReset}
							className="h-10 px-4 shrink-0 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
						>
							クリア
						</button>
					)}
				</form>
			</div>

			<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
				<ElderTable
					elders={elders}
					onEdit={handleEditClick}
					onDelete={handleDelete}
					onReactivate={handleReactivate}
					loading={isLoading}
					status={statusFilter}
				/>
			</div>

			{total > limit && (
				<div className="flex items-center justify-between px-2">
					<p className="text-sm text-gray-500">
						{total} 件中 {(page - 1) * limit + 1} 〜{" "}
						{Math.min(page * limit, total)} 件を表示
					</p>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
						>
							前へ
						</button>
						<button
							type="button"
							onClick={() => setPage((p) => p + 1)}
							disabled={page >= totalPages}
							className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
						>
							次へ
						</button>
					</div>
				</div>
			)}

			<AddElderModal
				open={openAddModal || !!editingElder}
				onClose={() => {
					setOpenAddModal(false);
					setEditingElder(null);
					// 閉じたときに前回のエラーを持ち越さない
					createMutation.reset();
					updateMutation.reset();
				}}
				onSubmit={editingElder ? handleEdit : handleAdd}
				initialData={editingElder}
				isEditing={!!editingElder}
				errorMessage={formErrorMessage}
			/>

			<ConfirmDialog
				open={confirmTarget !== null}
				title={
					confirmTarget?.action === "reactivate" ? "在籍に戻す" : "退所・無効化"
				}
				confirmLabel={
					confirmTarget?.action === "reactivate"
						? "在籍に戻す"
						: "退所・無効化する"
				}
				danger={confirmTarget?.action !== "reactivate"}
				busy={deleteMutation.isPending || updateMutation.isPending}
				onConfirm={handleConfirm}
				onClose={() => setConfirmTarget(null)}
			>
				{`${confirmElder?.lastName ?? ""} ${confirmElder?.firstName ?? ""} を${
					confirmTarget?.action === "reactivate"
						? "在籍に戻しますか？"
						: "退所・無効化しますか？"
				}`}
			</ConfirmDialog>
		</div>
	);
}
