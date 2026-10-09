"use client";

import { HiOutlinePencil, HiOutlineTrash } from "react-icons/hi2";
import { ElderRow } from "@/features/elder-management/types/elder.types";

interface ElderTableProps {
  elders: ElderRow[];
  onEdit: (elder: ElderRow) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export function ElderTable({ elders, onEdit, onDelete, loading }: ElderTableProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (elders.length === 0) {
    return (
      <div className="text-center py-12 px-6 text-gray-500">
        <p className="text-lg font-medium">高齢者が登録されていません</p>
        <p className="text-sm">「高齢者を追加」から登録してください</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-200 text-gray-600 uppercase text-xs tracking-wider">
            <th className="py-4 px-6 font-medium">氏名</th>
            <th className="py-4 px-6 font-medium">部屋番号</th>
            <th className="py-4 px-6 font-medium">生年月日</th>
            <th className="py-4 px-6 font-medium">性別</th>
            <th className="py-4 px-6 font-medium">ステータス</th>
            <th className="py-4 px-6 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {elders.map((elder) => (
            <tr key={elder.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-4 px-6">
                <div className="font-medium">{elder.lastName} {elder.firstName}</div>
                <div className="text-xs text-gray-500">{elder.id.slice(0, 8)}...</div>
              </td>
              <td className="py-4 px-6">{elder.roomNumber}</td>
              <td className="py-4 px-6">
                {elder.dateOfBirth ? new Date(elder.dateOfBirth).toLocaleDateString("ja-JP") : "—"}
              </td>
              <td className="py-4 px-6">{elder.gender}</td>
              <td className="py-4 px-6">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    elder.status === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {elder.status === "ACTIVE" ? "在籍中" : "退所"}
                </span>
              </td>
              <td className="py-4 px-6 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(elder)}
                    className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                    title="編集"
                  >
                    <HiOutlinePencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDelete(elder.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={elder.status === "ACTIVE" ? "退所・無効化" : "復帰"}
                  >
                    <HiOutlineTrash className="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}