import "server-only";
import { requireStaffPage } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";

export const RESIDENT_PAGE_SIZE = 24;

export async function getDashboardPeople(requestedPage: number) {
	await requireStaffPage();
	// 件数と一覧を同じスナップショットから読み、退所処理との競合を避ける。
	return prisma.$transaction(
		async (tx) => {
			const residentCount = await tx.elder.count({
				where: { status: "ACTIVE" },
			});
			const staffCount = await tx.user.count({ where: { status: "ACTIVE" } });
			const pageCount = Math.max(
				1,
				Math.ceil(residentCount / RESIDENT_PAGE_SIZE),
			);
			const page = Math.min(Math.max(1, requestedPage), pageCount);
			const residents = await tx.elder.findMany({
				where: { status: "ACTIVE" },
				select: {
					id: true,
					firstName: true,
					lastName: true,
					dateOfBirth: true,
					roomNumber: true,
				},
				orderBy: [{ roomNumber: "asc" }, { id: "asc" }],
				skip: (page - 1) * RESIDENT_PAGE_SIZE,
				take: RESIDENT_PAGE_SIZE,
			});
			return { residents, residentCount, staffCount, page, pageCount };
		},
		{ isolationLevel: "RepeatableRead" },
	);
}

// 詳細画面に出す対応履歴の件数（新しい順）。件数の集計は全件で行う
export const RESIDENT_HISTORY_LIMIT = 50;

// 高齢者詳細: 割当中のデバイスと、対応記録の履歴・件数
// 呼ぶ前に getDashboardResident で在籍中の高齢者か確かめること
export async function getResidentActivity(elderId: string) {
	await requireStaffPage();
	// 3つの読み取りを1回のやり取りにまとめる（対話型トランザクションではないので時間切れにならない）
	const [assignment, records, counts] = await prisma.$transaction([
		// 現在有効な割当（unassignedAt が NULL）。1人に1件だけ（DB の部分一意 index）
		prisma.deviceAssignment.findFirst({
			where: { elderId, unassignedAt: null },
			select: {
				assignedAt: true,
				device: {
					select: { deviceCode: true, deviceName: true, status: true },
				},
			},
		}),
		prisma.responseRecord.findMany({
			where: { elderId },
			orderBy: { completedAt: "desc" },
			take: RESIDENT_HISTORY_LIMIT,
			select: {
				id: true,
				content: true,
				isActualFall: true,
				responseStartedAt: true,
				completedAt: true,
				staff: { select: { lastName: true, firstName: true } },
			},
		}),
		prisma.responseRecord.groupBy({
			by: ["isActualFall"],
			where: { elderId },
			_count: { _all: true },
			orderBy: { isActualFall: "asc" },
		}),
	]);

	let fallCount = 0;
	let falseAlarmCount = 0;
	for (const row of counts) {
		const count = typeof row._count === "object" ? (row._count._all ?? 0) : 0;
		if (row.isActualFall) {
			fallCount = count;
		} else {
			falseAlarmCount = count;
		}
	}

	return {
		device: assignment === null ? null : assignment.device,
		records,
		fallCount,
		falseAlarmCount,
	};
}

// 認可はデータ取得の入口で行う。layout の実行有無にかかわらず個人情報を保護する。
export async function getDashboardResident(id: string) {
	await requireStaffPage();
	// 一覧と公開範囲を揃える。退所済みの ID を直接指定しても詳細を返さない。
	return prisma.elder.findFirst({
		where: { id, status: "ACTIVE" },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			dateOfBirth: true,
			roomNumber: true,
		},
	});
}
