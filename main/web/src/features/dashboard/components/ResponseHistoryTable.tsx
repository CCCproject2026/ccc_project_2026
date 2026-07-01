export interface ResponseHistoryEntry {
	id: string;
	detectedAt: string;
	staffName: string | null;
	isActualFall: boolean | null;
	notes: string | null;
}

export interface ResponseHistoryTableProps {
	entries: ResponseHistoryEntry[];
}

function ResultBadge({ isActualFall }: { isActualFall: boolean | null }) {
	if (isActualFall === null) {
		return (
			<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-alarm-bg text-alarm">
				未対応
			</span>
		);
	}
	if (isActualFall) {
		return (
			<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
				転倒
			</span>
		);
	}
	return (
		<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-warning-bg text-warning">
			誤検知
		</span>
	);
}

export function ResponseHistoryTable({ entries }: ResponseHistoryTableProps) {
	if (entries.length === 0) {
		return (
			<section className="bg-white rounded-xl border border-gray-200 p-6">
				<h3 className="text-h3 font-semibold text-gray-800 mb-4">対応履歴</h3>
				<p className="text-sm text-gray-400 text-center py-8">
					対応履歴はありません
				</p>
			</section>
		);
	}

	return (
		<section className="bg-white rounded-xl border border-gray-200 p-6">
			<h3 className="text-h3 font-semibold text-gray-800 mb-4">対応履歴</h3>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wider">
							<th className="pb-3 pr-4 font-medium">検知日時</th>
							<th className="pb-3 pr-4 font-medium">対応スタッフ</th>
							<th className="pb-3 pr-4 font-medium">結果</th>
							<th className="pb-3 font-medium">メモ</th>
						</tr>
					</thead>
					<tbody>
						{entries.map((entry) => (
							<tr
								key={entry.id}
								className="border-b border-gray-50 last:border-0"
							>
								<td className="py-3 pr-4 text-gray-700 whitespace-nowrap">
									{entry.detectedAt}
								</td>
								<td className="py-3 pr-4 text-gray-700 whitespace-nowrap">
									{entry.staffName ?? "—"}
								</td>
								<td className="py-3 pr-4">
									<ResultBadge isActualFall={entry.isActualFall} />
								</td>
								<td className="py-3 text-gray-500 max-w-xs truncate">
									{entry.notes ?? "—"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}
