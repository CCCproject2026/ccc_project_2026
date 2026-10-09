"use client";

import { useState } from "react";
import { HiOutlinePlus, HiOutlineMagnifyingGlass, HiOutlineChevronDown } from "react-icons/hi2";
import { ElderStatus, ElderRow, ElderListParams, CreateElderInput, UpdateElderInput } from "@/features/elder-management/types/elder.types";
import { ElderTable } from "@/features/elder-management/components/ElderTable";
import { AddElderModal } from "@/features/elder-management/components/AddElderModal";
import { ElderSummaryCards } from "@/features/elder-management/components/ElderSummaryCards";
import { useElders, useCreateElder, useUpdateElder, useDeleteElder } from "@/features/elder-management/hooks/useElders";

export function ElderManagementPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<ElderStatus | "">("");
  const [searchQuery, setSearchQuery] = useState("");

  const [openAddModal, setOpenAddModal] = useState(false);
  const [editingElder, setEditingElder] = useState<ElderRow | null>(null);

  const params: ElderListParams = {
    page,
    limit,
    status: statusFilter || undefined,
    q: searchQuery || undefined,
  };

  const { data, isLoading, error } = useElders(params);
  const elders = data?.data ?? [];
  const total = data?.total ?? 0;

  const createMutation = useCreateElder();
  const updateMutation = useUpdateElder();
  const deleteMutation = useDeleteElder();

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

  const handleDelete = (id: string) => {
    const elder = elders.find((e) => e.id === id);
    const action = elder?.status === "ACTIVE" ? "退所・無効化" : "復帰";
    if (!confirm(`${elder?.lastName} ${elder?.firstName} を${action}しますか？`)) return;
    deleteMutation.mutate(id);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleReset = () => {
    setSearchQuery("");
    setStatusFilter("");
    setPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">高齢者管理</h1>
          <p className="text-sm text-gray-500 mt-1">在籍情報の登録・編集・ステータス管理</p>
        </div>
        <button
          onClick={() => { setEditingElder(null); setOpenAddModal(true); }}
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
        >
          <HiOutlinePlus className="w-5 h-5" />
          高齢者を追加
        </button>
      </div>

      <ElderSummaryCards elders={elders} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 basis-40 min-w-[12rem]">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="氏名・部屋番号で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>
          <div className="relative shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as ElderStatus | ""); setPage(1); }}
              className="h-10 w-full pl-4 pr-10 border border-gray-300 rounded-lg text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            >
              <option value="">全ステータス</option>
              <option value="ACTIVE">在籍中</option>
              <option value="INACTIVE">退所・無効</option>
            </select>
            <HiOutlineChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <button
            type="submit"
            className="h-10 px-4 shrink-0 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors"
          >
            検索
          </button>
          {(searchQuery || statusFilter) && (
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
          loading={isLoading}
        />
      </div>

      {total > limit && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-gray-500">
            {total} 件中 {(page - 1) * limit + 1} 〜 {Math.min(page * limit, total)} 件を表示
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
            >
              前へ
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= total}
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

      {(error || createMutation.isError || updateMutation.isError || deleteMutation.isError) && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-sm">
          <span className="text-sm">{error?.message || createMutation.error?.message || updateMutation.error?.message || deleteMutation.error?.message || "エラーが発生しました"}</span>
        </div>
      )}
    </div>
  );
}