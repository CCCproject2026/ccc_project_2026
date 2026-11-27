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
