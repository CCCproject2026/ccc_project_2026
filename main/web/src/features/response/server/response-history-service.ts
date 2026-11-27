import "server-only";
import type { Prisma } from "@prisma/client";
import { requireStaffPage } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";

export const RESPONSE_HISTORY_PAGE_SIZE = 20;

// 絞り込み: all = すべて、fall = 転倒、false_alarm = 誤検知
export type JudgmentFilter = "all" | "fall" | "false_alarm";

export function judgmentFilterFrom(value: string | string[] | undefined) {
	if (value === "fall" || value === "false_alarm") return value;
	return "all";
}

// 全員分の対応記録の一覧（新しい順）
// CAREGIVER / NURSE の両ロールが全件を見られる（Web基本設計「権限」）
export async function listResponseRecords(
	requestedPage: number,
	judgment: JudgmentFilter,
) {
	// 認可はデータ取得の入口で行う（layout だけに頼らない）
	await requireStaffPage();

	let where: Prisma.ResponseRecordWhereInput = {};
	if (judgment === "fall") where = { isActualFall: true };
	if (judgment === "false_alarm") where = { isActualFall: false };

	// 件数は絞り込みに関係なく全体の内訳も出す
	const [filteredCount, fallCount, falseAlarmCount] = await prisma.$transaction(
		[
			prisma.responseRecord.count({ where }),
			prisma.responseRecord.count({ where: { isActualFall: true } }),
			prisma.responseRecord.count({ where: { isActualFall: false } }),
		],
	);

	const pageCount = Math.max(
		1,
		Math.ceil(filteredCount / RESPONSE_HISTORY_PAGE_SIZE),
	);
	const page = Math.min(Math.max(1, requestedPage), pageCount);

	const records = await prisma.responseRecord.findMany({
		where,
		// 同じ時刻のものがあっても順番が毎回同じになるよう、id でも並べる
		orderBy: [{ completedAt: "desc" }, { id: "desc" }],
		skip: (page - 1) * RESPONSE_HISTORY_PAGE_SIZE,
		take: RESPONSE_HISTORY_PAGE_SIZE,
		select: {
			id: true,
			content: true,
			isActualFall: true,
			responseStartedAt: true,
			completedAt: true,
			elder: {
				select: {
					id: true,
					lastName: true,
					firstName: true,
					roomNumber: true,
					status: true,
				},
			},
			staff: { select: { lastName: true, firstName: true } },
		},
	});

	return {
		records,
		page,
		pageCount,
		filteredCount,
		fallCount,
		falseAlarmCount,
	};
}
