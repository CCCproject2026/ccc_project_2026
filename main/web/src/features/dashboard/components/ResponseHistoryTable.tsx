// src/features/dashboard/components/ResponseHistoryTable.tsx

interface ResponseHistoryTableProps {
	data: Array<{
		id: string;
		createdAt: string;
		respondedAt: string;
		duration: string;
		judgment: string; // "転倒" | "誤検知" | "その他巡回" など
		staff: string;
		memo: string;
	}>;
}

export function ResponseHistoryTable({ data }: ResponseHistoryTableProps) {
	// 💡 ロジック追加: 判定結果（judgment）が「転倒」または「誤検知」のデータのみに絞り込む
	const alarmHistoryOnly = data.filter(
		(item) => item.judgment === "転倒" || item.judgment === "誤検知",
	);

	// 絞り込んだ結果、データが空の場合の安全処理
	if (!alarmHistoryOnly || alarmHistoryOnly.length === 0) {
		return (
			<div className="text-center py-8 text-gray-400 text-sm">
				アラームに関する対応履歴はありません。
			</div>
		);
	}

	return (
		<div className="overflow-x-auto w-full rounded-xl border border-gray-100">
			<table className="w-full text-left border-collapse min-w-[800px]">
				<thead>
					<tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
						<th className="px-6 py-4">発生日時</th>
						<th className="px-6 py-4">対応完了</th>
						<th className="px-6 py-4">対応時間</th>
						<th className="px-6 py-4">判定結果</th>
						<th className="px-6 py-4">対応スタッフ</th>
						<th className="px-6 py-4">メモ</th>
					</tr>
				</thead>

				<tbody className="divide-y divide-gray-100 text-sm text-gray-600 bg-white">
					{/* 💡 修正: 元の data ではなく、絞り込んだ alarmHistoryOnly でループを回す */}
					{alarmHistoryOnly.map((item) => (
						<tr
							key={item.id}
							className="hover:bg-gray-50/50 transition-colors duration-150"
						>
							<td className="px-6 py-4 whitespace-nowrap font-medium text-gray-700">
								{item.createdAt}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-gray-500">
								{item.respondedAt}
							</td>
							<td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800">
								{item.duration}
							</td>
							<td className="px-6 py-4 whitespace-nowrap">
								<span
									className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
										item.judgment === "転倒"
											? "bg-red-50 text-red-600 border border-red-100/50"
											: "bg-amber-50 text-amber-600 border border-amber-100/50"
									}`}
								>
									{item.judgment}
								</span>
							</td>
							<td className="px-6 py-4 whitespace-nowrap font-medium text-gray-700">
								{item.staff}
							</td>
							<td
								className="px-6 py-4 max-w-[300px] truncate text-gray-500 text-xs"
								title={item.memo}
							>
								{item.memo || "—"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
