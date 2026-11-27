"use client";

import { Search } from "lucide-react";
import { useId } from "react";

// 割当先の入所者・予備デバイスを選ぶ一覧（詳細設計 03 の8章「割当先・予備デバイスの選択肢」）
// - 検索欄、候補のラジオボタン、「さらに表示」、件数の表示
// - データの取得は呼び出し側（useInfiniteQuery）が行い、この部品は表示だけを担当する

export type Candidate = {
	id: string;
	label: string; // 1行目（例: 山田 太郎（部屋 301））
};

interface CandidatePickerProps {
	legend: string; // 一覧の見出し（例: 割当先の入所者）
	searchLabel: string;
	searchPlaceholder: string;
	searchText: string;
	onSearchTextChange: (text: string) => void;
	candidates: Candidate[];
	total: number; // 条件に合う全件数
	selectedId: string | null;
	onSelect: (id: string) => void;
	emptyMessage: string;
	isLoading: boolean;
	isError: boolean;
	onRetry: () => void;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	onLoadMore: () => void;
}

export function CandidatePicker({
	legend,
	searchLabel,
	searchPlaceholder,
	searchText,
	onSearchTextChange,
	candidates,
	total,
	selectedId,
	onSelect,
	emptyMessage,
	isLoading,
	isError,
	onRetry,
	hasNextPage,
	isFetchingNextPage,
	onLoadMore,
}: CandidatePickerProps) {
	const searchId = useId();
	const groupName = useId();

	return (
		<div className="space-y-3">
			<div>
				<label
					htmlFor={searchId}
					className="block text-sm font-medium text-gray-700 mb-1"
				>
					{searchLabel}
				</label>
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
					<input
						id={searchId}
						type="search"
						value={searchText}
						onChange={(e) => onSearchTextChange(e.target.value)}
						placeholder={searchPlaceholder}
						maxLength={50}
						className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
					/>
				</div>
			</div>

			<fieldset>
				<legend className="text-sm font-medium text-gray-700 mb-1">
					{legend}
				</legend>
				<CandidateBody
					groupName={groupName}
					candidates={candidates}
					selectedId={selectedId}
					onSelect={onSelect}
					emptyMessage={emptyMessage}
					isLoading={isLoading}
					isError={isError}
					onRetry={onRetry}
				/>
			</fieldset>

			{!isLoading && !isError && candidates.length > 0 && (
				<div className="flex items-center justify-between gap-3">
					{/* まだ表示していない候補があることがわかるように、件数を出す */}
					<p className="text-xs text-gray-500" aria-live="polite">
						全{total}件中{candidates.length}件を表示
					</p>
					{hasNextPage && (
						<button
							type="button"
							onClick={onLoadMore}
							disabled={isFetchingNextPage}
							className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
						>
							{isFetchingNextPage ? "読み込み中…" : "さらに表示"}
						</button>
					)}
				</div>
			)}
		</div>
	);
}

function CandidateBody({
	groupName,
	candidates,
	selectedId,
	onSelect,
	emptyMessage,
	isLoading,
	isError,
	onRetry,
}: {
	groupName: string;
	candidates: Candidate[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	emptyMessage: string;
	isLoading: boolean;
	isError: boolean;
	onRetry: () => void;
}) {
	if (isLoading) {
		return <p className="text-sm text-gray-500 py-4">読み込み中…</p>;
	}
	if (isError) {
		return (
			<div
				role="alert"
				className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
			>
				<span>候補を取得できませんでした。</span>
				<button
					type="button"
					onClick={onRetry}
					className="px-3 py-1 rounded-lg border border-red-300 bg-white text-xs font-medium hover:bg-red-100"
				>
					再試行
				</button>
			</div>
		);
	}
	if (candidates.length === 0) {
		return <p className="text-sm text-gray-500 py-4">{emptyMessage}</p>;
	}

	return (
		<ul className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
			{candidates.map((candidate) => {
				const checked = candidate.id === selectedId;
				return (
					<li key={candidate.id}>
						<label
							className={`flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer ${
								checked ? "bg-violet-50" : "hover:bg-gray-50"
							}`}
						>
							<input
								type="radio"
								name={groupName}
								value={candidate.id}
								checked={checked}
								onChange={() => onSelect(candidate.id)}
								className="accent-violet-600"
							/>
							<span className="text-gray-900">{candidate.label}</span>
						</label>
					</li>
				);
			})}
		</ul>
	);
}

// 複数ページの候補を1つにまとめ、id の重複を除く
// ページの取得の間に他のスタッフが割り当てると、ページの境目がずれて同じ候補が2回届くことがあるため
export function mergeCandidatePages<T extends { id: string }>(
	pages: { data: T[] }[] | undefined,
): T[] {
	if (pages === undefined) {
		return [];
	}
	const seen = new Set<string>();
	const result: T[] = [];
	for (const page of pages) {
		for (const item of page.data) {
			if (!seen.has(item.id)) {
				seen.add(item.id);
				result.push(item);
			}
		}
	}
	return result;
}
