import "server-only";
import { requireStaffPage } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import type { DeviceAssignmentEntry } from "../types";

// 割当が外れた直後に届いた結果にも利用者を出せるよう、この時間内に外れた割当も含める
const RECENTLY_UNASSIGNED_MS = 10 * 60 * 1000;

// 機器 → 利用者の一覧を作る（詳細設計 web/03 の7.2）
// ブラウザへ props で渡すため、渡すのは名前と部屋だけにする（個人情報の最小化）
export async function getDeviceDirectory(): Promise<DeviceAssignmentEntry[]> {
	// 認可はデータ取得の入口で行う（layout だけに頼らない）
	await requireStaffPage();

	const since = new Date(Date.now() - RECENTLY_UNASSIGNED_MS);
	const rows = await prisma.deviceAssignment.findMany({
		where: { OR: [{ unassignedAt: null }, { unassignedAt: { gt: since } }] },
		select: {
			assignedAt: true,
			unassignedAt: true,
			device: { select: { deviceCode: true } },
			elder: {
				select: { id: true, firstName: true, lastName: true, roomNumber: true },
			},
		},
		// 新しい割当を先にして、同じ時刻に有効な割当が重なっても新しい方を使う
		orderBy: { assignedAt: "desc" },
	});

	return rows.map((row) => ({
		deviceCode: row.device.deviceCode,
		elderId: row.elder.id,
		elderName:
			`${row.elder.lastName} ${row.elder.firstName}`.trim() || "氏名未登録",
		roomNumber: row.elder.roomNumber || "居室未登録",
		assignedAt: row.assignedAt.toISOString(),
		unassignedAt:
			row.unassignedAt === null ? null : row.unassignedAt.toISOString(),
	}));
}
