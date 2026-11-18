"use client";

import { useReverification } from "@clerk/nextjs";
import { useState } from "react";
import { HiOutlineMagnifyingGlass, HiOutlinePlus } from "react-icons/hi2";
import { deviceApi } from "@/features/device-management/api/devices";
import type { DeviceDetail } from "@/features/device-management/types/device.types";
import { elderApi } from "@/features/elder-management/api/elders";
import { AddElderModal } from "@/features/elder-management/components/AddElderModal";
import {
	ElderExitConfirmDialog,
	type ElderExitTarget,
} from "@/features/elder-management/components/ElderExitConfirmDialog";
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

// 一覧上部のナビゲーション。無効化（退所）した高齢者は通常の一覧から分けて表示する。
const ELDER_STATUS_TABS: { value: ElderStatus; label: string }[] = [
	{ value: "ACTIVE", label: "在籍中" },
	{ value: "INACTIVE", label: "無効化" },
];

export function ElderManagementPage() {
	const [page, setPage] = useState(1);
	const [limit] = useState(20);
	const [statusFilter, setStatusFilter] = useState<ElderStatus>("ACTIVE");
	const [searchInput, setSearchInput] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const debouncedSearch = useDebouncedValue(searchQuery, 300);

	const [openAddModal, setOpenAddModal] = useState(false);
	const [editingElder, setEditingElder] = useState<ElderRow | null>(null);
	const [exitTarget, setExitTarget] = useState<ElderExitTarget | null>(null);
	const [preparingExit, setPreparingExit] = useState(false);
	const [exitPrepareError, setExitPrepareError] = useState<string | null>(null);

	const params: ElderListParams = {
		page,
		limit,
		status: statusFilter,
		q: debouncedSearch || undefined,
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

	const handleAdd = async (data: CreateElderInput) => {
		try {
			await createMutation.mutateAsync(data);
			setOpenAddModal(false);
		} catch {
			alert("登録に失敗しました");
		}
	};

	const handleEdit = async (data: UpdateElderInput) => {
		if (!editingElder) return;
		try {
			await updateMutation.mutateAsync({ id: editingElder.id, data });
			setEditingElder(null);
		} catch {
			alert("更新に失敗しました");
		}
	};

	// 退所の確認ダイアログを出す前に、入所者と割当中のデバイスを取り直す
	// （一覧を表示した後に、他のスタッフが割当を変えているかもしれないため）
	const handleDelete = async (id: string) => {
		// 取り直している間に、もう一度押されても何もしない
		if (preparingExit) return;
		setPreparingExit(true);
		setExitPrepareError(null);
		try {
			const elder = await elderApi.get(id);
			let device: DeviceDetail | null = null;
			let deviceUnknown = false;
			if (elder.currentDeviceId !== null) {
				try {
					device = await deviceApi.get(elder.currentDeviceId);
				} catch {
					// デバイスの情報が取れなくても、退所はできる。割当が終了することだけは伝える
					deviceUnknown = true;
				}
			}
			setExitTarget({ elder, device, deviceUnknown });
		} catch {
			setExitPrepareError(
				"入所者の情報を取得できませんでした。もう一度お試しください。",
			);
		} finally {
			setPreparingExit(false);
		}
	};

	const handleConfirmExit = async (target: ElderExitTarget) => {
		// 先に確認ダイアログを閉じる（再認証が必要なときは、Clerk のモーダルが表示されるため）
		setExitTarget(null);
		try {
			await removeElder(target.elder.id);
		} catch {
			// 再認証のキャンセル、または削除失敗。失敗時は下部のエラーバナー（deleteMutation.isError）で通知する。
		}
	};

	const handleReactivate = (id: string) => {
		const elder = elders.find((e) => e.id === id);
		if (
			!window.confirm(
				`${elder?.lastName} ${elder?.firstName} を在籍に戻しますか？`,
			)
		)
			return;
		updateMutation.mutate({ id, data: { status: "ACTIVE" } });
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setSearchQuery(searchInput);
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
					onClick={() => {
						setEditingElder(null);
						setOpenAddModal(true);
					}}
					className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
				>
					<HiOutlinePlus className="w-5 h-5" />
					高齢者を追加
				</button>
			</div>

			<ElderSummaryCards summary={summary} />

			<div className="bg-white rounded-xl shadow-sm border border-gray-100">
				<div
					className="flex gap-1 px-4 border-b border-gray-100"
					role="tablist"
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
								role="tab"
								aria-selected={isActive}
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
				</div>
				<form
					onSubmit={handleSearch}
					className="flex flex-wrap items-center gap-3 p-4"
				>
					<div className="relative flex-1 basis-40 min-w-[12rem]">
						<HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
						<input
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
					onEdit={setEditingElder}
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
				}}
				onSubmit={editingElder ? handleEdit : handleAdd}
				initialData={editingElder}
				isEditing={!!editingElder}
			/>

			<ElderExitConfirmDialog
				target={exitTarget}
				onConfirm={handleConfirmExit}
				onClose={() => setExitTarget(null)}
			/>

			{exitPrepareError !== null && (
				<div
					role="alert"
					className="fixed bottom-20 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-sm flex items-start gap-3"
				>
					<span className="text-sm">{exitPrepareError}</span>
					<button
						type="button"
						onClick={() => setExitPrepareError(null)}
						aria-label="閉じる"
						className="text-sm opacity-60 hover:opacity-100"
					>
						×
					</button>
				</div>
			)}

			{(error ||
				createMutation.isError ||
				updateMutation.isError ||
				deleteMutation.isError) && (
				<div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-sm">
					<span className="text-sm">
						{error?.message ||
							createMutation.error?.message ||
							updateMutation.error?.message ||
							deleteMutation.error?.message ||
							"エラーが発生しました"}
					</span>
				</div>
			)}
		</div>
	);
}
