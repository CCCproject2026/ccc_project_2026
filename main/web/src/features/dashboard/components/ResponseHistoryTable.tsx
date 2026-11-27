// 高齢者ごとの対応履歴ログ（スタッフが保存した対応記録）
// メモは React のテキストとして出し、HTML として表示しない
import { CheckCircle2, Clock, FileText } from "lucide-react";
import Link from "next/link";

export interface HistoryElder {
	id: string;
	name: string;
	room: string;
	// 在籍中なら詳細画面へリンクする（退所済みは詳細画面が無い）
	active: boolean;
}

export interface HistoryItem {
	id: string;
	startedAt: string; // 対応開始（表示用の文字列）
	completedAt: string; // 記録完了（表示用の文字列）
	duration: string; // 例: 3分
	isActualFall: boolean;
	staff: string;
	memo: string;
	// 全員分の一覧（/response）でだけ使う
	elder?: HistoryElder;
}

interface ResponseHistoryTableProps {
	history: HistoryItem[];
	totalCount: number;
	title?: string;
	// true なら「入所者」の列を出す（全員分の一覧用）
	showElder?: boolean;
}

export function ResponseHistoryTable({
	history,
	totalCount,
	title = "対応履歴ログ",
	showElder = false,
}: ResponseHistoryTableProps) {
	return (
		<article className="bg-white rounded-xl border border-gray-200 overflow-hidden">
			<h2 className="text-h3 font-semibold text-gray-800 p-6 pb-4 flex items-center gap-2">
				<FileText aria-hidden="true" className="w-4 h-4 text-primary" />
				{title}
				<span className="rounded-full bg-primary-bg px-2 py-0.5 text-xs font-bold text-primary-dark">
					{totalCount}件
				</span>
			</h2>

			{history.length === 0 ? (
				<p className="text-center text-sm text-gray-400 pb-8">
					対応履歴はありません。
				</p>
			) : (
				<>
					{/* スマホ・タブレット幅では縦並びのカードにする */}
					<ul className="block md:hidden space-y-3 px-4 pb-4">
						{history.map((item) => (
							<li
								key={item.id}
								className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2"
							>
								<div className="flex justify-between items-start gap-2">
									<span className="text-xs text-gray-500">
										{item.startedAt} 対応開始
									</span>
									<JudgmentBadge isActualFall={item.isActualFall} />
								</div>
								{showElder && item.elder !== undefined && (
									<p className="text-sm font-semibold">
										<ElderName elder={item.elder} />
									</p>
								)}
								<p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
									{item.memo}
								</p>
								<div className="flex justify-between text-xs text-gray-500">
									<span>所要時間: {item.duration}</span>
									<span>担当: {item.staff}</span>
								</div>
							</li>
						))}
					</ul>

					{/* PC・大きな画面用の表 */}
					<div className="hidden md:block">
						<table className="w-full text-left border-collapse text-sm">
							<caption className="sr-only">対応記録の履歴一覧</caption>
							<thead>
								<tr className="bg-gray-50 border-y border-gray-200 text-gray-500">
									<th scope="col" className="px-4 py-3 font-semibold">
										対応開始
									</th>
									{showElder && (
										<th scope="col" className="px-4 py-3 font-semibold">
											入所者
										</th>
									)}
									<th scope="col" className="px-4 py-3 font-semibold">
										記録完了
									</th>
									<th scope="col" className="px-4 py-3 font-semibold">
										所要時間
									</th>
									<th scope="col" className="px-4 py-3 font-semibold">
										転倒判定
									</th>
									<th scope="col" className="px-4 py-3 font-semibold">
										対応スタッフ
									</th>
									<th scope="col" className="px-4 py-3 font-semibold">
										状況メモ
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100 text-gray-700">
								{history.map((item) => (
									<tr key={item.id}>
										<th
											scope="row"
											className="px-4 py-4 font-normal whitespace-nowrap"
										>
											{item.startedAt}
										</th>
										{showElder && (
											<td className="px-4 py-4 whitespace-nowrap">
												{item.elder !== undefined && (
													<ElderName elder={item.elder} />
												)}
											</td>
										)}
										<td className="px-4 py-4 whitespace-nowrap">
											{item.completedAt}
										</td>
										<td className="px-4 py-4 whitespace-nowrap text-gray-500">
											<span className="inline-flex items-center gap-1">
												<Clock aria-hidden="true" className="w-3.5 h-3.5" />
												{item.duration}
											</span>
										</td>
										<td className="px-4 py-4 whitespace-nowrap">
											<JudgmentBadge isActualFall={item.isActualFall} />
										</td>
										<td className="px-4 py-4 whitespace-nowrap">
											{item.staff}
										</td>
										<td className="px-4 py-4 text-gray-600 leading-relaxed min-w-[250px] whitespace-pre-wrap">
											{item.memo}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			)}
		</article>
	);
}

// 入所者名（在籍中なら詳細画面へのリンク）
function ElderName({ elder }: { elder: HistoryElder }) {
	const label = `${elder.name}（${elder.room}）`;
	if (!elder.active) {
		return (
			<span className="text-gray-500">
				{label}
				<span className="ml-1 text-xs">退所済み</span>
			</span>
		);
	}
	return (
		<Link
			href={`/dashboard/${encodeURIComponent(elder.id)}`}
			className="text-primary-dark underline-offset-2 hover:underline"
		>
			{label}
		</Link>
	);
}

// 転倒 / 誤検知。色だけでなく文字でも示す
function JudgmentBadge({ isActualFall }: { isActualFall: boolean }) {
	if (isActualFall) {
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-alarm-bg px-2.5 py-0.5 text-xs font-bold text-alarm">
				転倒
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600">
			<CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5" />
			誤検知
		</span>
	);
}
