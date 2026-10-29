import "server-only";
import { requireStaffPage } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";

export const RESIDENT_PAGE_SIZE = 24;

export async function getDashboardPeople(requestedPage: number) {
	await requireStaffPage();
	// 件数と一覧を同じスナップショットから読み、退所処理との競合を避ける。
	return prisma.$transaction(async (tx) => {
		const residentCount = await tx.elder.count({ where: { status: "ACTIVE" } });
		const staffCount = await tx.user.count({ where: { status: "ACTIVE" } });
		const pageCount = Math.max(1, Math.ceil(residentCount / RESIDENT_PAGE_SIZE));
		const page = Math.min(Math.max(1, requestedPage), pageCount);
		const residents = await tx.elder.findMany({
			where: { status: "ACTIVE" },
			select: { id: true, firstName: true, lastName: true, dateOfBirth: true, roomNumber: true },
			orderBy: [{ roomNumber: "asc" }, { id: "asc" }],
			skip: (page - 1) * RESIDENT_PAGE_SIZE,
			take: RESIDENT_PAGE_SIZE,
		});
		return { residents, residentCount, staffCount, page, pageCount };
	}, { isolationLevel: "RepeatableRead" });
}
