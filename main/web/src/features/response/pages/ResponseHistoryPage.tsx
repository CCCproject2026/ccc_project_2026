import { ClipboardList, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { ResponseHistoryTable } from "@/features/dashboard/components/ResponseHistoryTable";
import { formatDuration, formatSlashDateTime } from "@/shared/lib/date";
import { StatCard } from "@/shared/ui/StatCard";
import {
	type JudgmentFilter,
	listResponseRecords,
} from "../server/response-history-service";

const FILTERS: { value: JudgmentFilter; label: string }[] = [
	{ value: "all", label: "すべて" },
	{ value: "fall", label: "転倒" },
	{ value: "false_alarm", label: "誤検知" },
];

// 一覧の URL。「すべて」・1ページ目は付けない
function listHref(judgment: JudgmentFilter, page: number): string {
	const params = new URLSearchParams();
	if (judgment !== "all") params.set("judgment", judgment);
	if (page > 1) params.set("page", String(page));
	const query = params.toString();
	return query === "" ? "/response" : `/response?${query}`;
}

// 全員分の対応記録（対応履歴）の一覧
export async function ResponseHistoryPage({
	page,
	judgment,
}: {
	page: number;
	judgment: JudgmentFilter;
}) {
	const data = await listResponseRecords(page, judgment);

	const history = data.records.map((record) => ({
		id: record.id,
		startedAt: formatSlashDateTime(record.responseStartedAt),
		completedAt: formatSlashDateTime(record.completedAt),
		duration: formatDuration(record.responseStartedAt, record.completedAt),
		isActualFall: record.isActualFall,
		staff:
			`${record.staff.lastName} ${record.staff.firstName}`.trim() ||
			"氏名未登録",
		memo: record.content,
		elder: {
			id: record.elder.id,
			name:
				`${record.elder.lastName} ${record.elder.firstName}`.trim() ||
				"氏名未登録",
			room: record.elder.roomNumber || "居室未登録",
			active: record.elder.status === "ACTIVE",
		},
	}));

	return (
		<div className="flex flex-col gap-6 pb-6 max-w-[1600px] mx-auto w-full">
			{/* 件数（スタッフが記録した結果。AI の判定件数ではない） */}
			<section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<StatCard
					title="対応記録"
					value={data.fallCount + data.falseAlarmCount}
					icon={ClipboardList}
					color="blue"
					description="保存された対応記録の合計"
				/>
				<StatCard
					title="転倒"
					value={data.fallCount}
					icon={TriangleAlert}
					color="red"
					description="実際の転倒だった記録"
				/>
				<StatCard
					title="誤検知"
					value={data.falseAlarmCount}
					icon={ShieldCheck}
					color="green"
					description="転倒ではなかった記録"
				/>
			</section>

			{/* 絞り込み */}
			<nav aria-label="転倒判定で絞り込む" className="flex gap-2">
				{FILTERS.map((filter) => {
					const selected = filter.value === judgment;
					return (
						<Link
							key={filter.value}
							href={listHref(filter.value, 1)}
							aria-current={selected ? "page" : undefined}
							className={`rounded-full px-4 py-1.5 text-sm font-semibold border ${
								selected
									? "bg-primary text-white border-primary"
									: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
							}`}
						>
							{filter.label}
						</Link>
					);
				})}
			</nav>

			<ResponseHistoryTable
				title="対応履歴"
				history={history}
				totalCount={data.filteredCount}
				showElder
			/>

			{data.pageCount > 1 && (
				<nav
					aria-label="対応履歴のページ"
					className="flex items-center justify-center gap-4 text-sm"
				>
					{data.page > 1 && (
						<Link href={listHref(judgment, data.page - 1)}>前へ</Link>
					)}
					<span>
						{data.page} / {data.pageCount}
					</span>
					{data.page < data.pageCount && (
						<Link href={listHref(judgment, data.page + 1)}>次へ</Link>
					)}
				</nav>
			)}
		</div>
	);
}
