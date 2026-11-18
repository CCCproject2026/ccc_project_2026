"use client";

import {
	HiOutlineArrowPath,
	HiOutlinePencil,
	HiOutlineTrash,
} from "react-icons/hi2";
import {
	ElderRow,
	ElderStatus,
} from "@/features/elder-management/types/elder.types";

interface ElderTableProps {
	elders: ElderRow[];
	onEdit: (elder: ElderRow) => void;
	onDelete: (id: string) => void;
	onReactivate: (id: string) => void;
	loading?: boolean;
	error?: Error | null;
	onRetry?: () => void;
	searchQuery?: string;
	status?: ElderStatus;
}

export function ElderTable({
	elders,
	onEdit,
	onDelete,
	onReactivate,
	loading,
	error,
	onRetry,
	searchQuery,
	status,
}: ElderTableProps) {
	if (loading) {
		return (
			<div className="space-y-3 p-6">
				{[...Array(5)].map((_, i) => (
					<div key={i} className="h-14 animate-pulse bg-gray-100 rounded-lg" />
				))}
			</div>
		);
	}

	if (error && elders.length === 0) {
		return (
			<div className="text-center py-12 px-6">
				<p className="text-lg font-medium text-rose-600">
					高齢者情報の取得に失敗しました
				</p>
				<p className="text-sm text-gray-500 mt-1">
					{error.message || "通信環境やサーバーの状態を確認してください"}
				</p>
				{onRetry && (
					<button
						type="button"
						onClick={onRetry}
						className="mt-4 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm"
					>
						再試行する
					</button>
				)}
			</div>
		);
	}

	if (elders.length === 0) {
		const isInactive = status === "INACTIVE";
		const isSearching = !!searchQuery;
		return (
			<div className="text-center py-12 px-6 text-gray-500">
				<p className="text-lg font-medium">
					{isSearching
						? "条件に一致する高齢者が見つかりません"
						: isInactive
							? "無効化された高齢者はいません"
							: "高齢者が登録されていません"}
				</p>
				<p className="text-sm mt-1">
					{isSearching
						? "検索条件を変えて再度お試しください"
						: isInactive
							? "退所・無効化した高齢者がここに表示されます"
							: "「高齢者を追加」から登録してください"}
				</p>
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
								<div className="font-medium">
									{elder.lastName} {elder.firstName}
								</div>
							</td>
							<td className="py-4 px-6">{elder.roomNumber}</td>
							<td className="py-4 px-6">
								{elder.dateOfBirth
									? new Date(elder.dateOfBirth).toLocaleDateString("ja-JP")
									: "—"}
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
										type="button"
										className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
										title="編集"
										aria-label={`${elder.lastName} ${elder.firstName} を編集`}
									>
										<HiOutlinePencil className="w-5 h-5" />
									</button>
									<button
										type="button"
										onClick={() =>
											elder.status === "ACTIVE"
												? onDelete(elder.id)
												: onReactivate(elder.id)
										}
										className={`p-2 rounded-lg transition-colors ${
											elder.status === "ACTIVE"
												? "text-gray-500 hover:text-red-600 hover:bg-red-50"
												: "text-gray-500 hover:text-green-600 hover:bg-green-50"
										}`}
										title={
											elder.status === "ACTIVE" ? "退所・無効化" : "在籍に戻す"
										}
										aria-label={`${elder.lastName} ${elder.firstName} を${elder.status === "ACTIVE" ? "退所・無効化" : "在籍に戻す"}`}
									>
										{elder.status === "ACTIVE" ? (
											<HiOutlineTrash className="w-5 h-5" />
										) : (
											<HiOutlineArrowPath className="w-5 h-5" />
										)}
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
