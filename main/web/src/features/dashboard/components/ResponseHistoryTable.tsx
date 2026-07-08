// Response history table placeholder.
// uses shared/ui/Table, shared/tokens/colors, shared/tokens/spacing
// src/features/dashboard/components/ResponseHistoryTable.tsx

// 1. 受け取るデータの型（Props）を定義
interface ResponseHistoryTableProps {
	data: Array<{
		id: string;
		createdAt: string;
		respondedAt: string;
		duration: string;
		judgment: string;
		staff: string;
		memo: string;
	}>;
}

// 2. 引数で { data } を受け取るように修正
export function ResponseHistoryTable({ data }: ResponseHistoryTableProps) {
	return (
		<div className="overflow-x-auto">
			{/* テーブルのレンダリング処理で、この data を使うようにします */}
			{/* 例: data.map((item) => ...) */}
		</div>
	);
}
