export const StaffHeader = ({ onAdd }: { onAdd: () => void }) => {
	return (
		<div className="flex justify-between items-center mb-4">
			<h2 className="text-lg font-bold">スタッフ一覧</h2>

			<button
				type="button"
				onClick={onAdd}
				className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold"
			>
				スタッフを追加
			</button>
		</div>
	);
};
