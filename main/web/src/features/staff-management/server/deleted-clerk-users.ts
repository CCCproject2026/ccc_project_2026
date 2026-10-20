import "server-only";
import { notifyOps } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { getClerkUser } from "./clerk-admin";
import { deleteStaffOfDeletedClerkUser } from "./clerk-webhook";
import { withStaffLock } from "./staff-lock";

// Clerk アカウントが削除されたスタッフの定期復旧（T10 と同じ考え方）
//
// Webhook（user.deleted）が届く環境では、その場で削除される。
// ただし Webhook は届かない環境もある（ローカル開発、Clerk 側の障害、
// アプリの停止中など）。その場合に「Clerk にはいないのに DB には残っている」
// 孤児USER行がそのまま残り、再招待もできなくなるため、定期にまとめて削除する。
//
// 1. clerkUserId を持つ User 行を一覧する
// 2. Clerk に確認して、既に消えているアカウントの行だけ削除する
// 3. 1件ずつ共通ロックを取って、削除する直前に状態を確認して削除する
//
// 削除できないもの（Clerk に到達できない・ロックが取れない）は次回に回す。
// 消えたと誤判断しないよう、Clerk の確認が取れないときは何もしない。
export type DeletedClerkUsersReport = {
	scanned: number; // clerkUserId を持つ User 行の数
	deleted: number; // Clerk 側で既に消えていた行の数（削除できたもの）
	failed: number; // 確認・削除できなかったもの（次回に回す）
};

export async function reconcileDeletedClerkUsers(options: {
	dryRun: boolean; // true なら削除せず数えるだけ
}): Promise<DeletedClerkUsersReport> {
	const report: DeletedClerkUsersReport = {
		scanned: 0,
		deleted: 0,
		failed: 0,
	};

	// 1. Clerk と紐付いている User 行を全部取る
	const staffs = await prisma.user.findMany({
		where: { clerkUserId: { not: null } },
		select: { id: true, clerkUserId: true },
	});
	report.scanned = staffs.length;

	// 2. Clerk 側を確認して、削除済みのものだけ処理する
	for (const staff of staffs) {
		const clerkUserId = staff.clerkUserId;
		if (clerkUserId === null) {
			continue;
		}

		const result = await getClerkUser(clerkUserId);
		if (result.kind !== "SUCCESS") {
			// Clerk に到達できない → 消えたとは判断しない（次回に回す）
			report.failed = report.failed + 1;
			continue;
		}
		// まだ Clerk にいる → 何もしない
		if (result.data !== null) {
			continue;
		}

		// Clerk 側で既に消えている
		if (options.dryRun) {
			report.deleted = report.deleted + 1;
			continue;
		}

		// 3. 共通ロックの中で削除する（Webhook と同じ処理を使う）
		try {
			await withStaffLock(async (lock) => {
				await deleteStaffOfDeletedClerkUser(clerkUserId, lock);
			});
			report.deleted = report.deleted + 1;
		} catch {
			// ロックが取れない・接続が切れたなど。次回に回す
			report.failed = report.failed + 1;
			notifyOps("DELETED_CLERK_USER_RECONCILE_FAILED", {
				targetId: staff.id,
				reason:
					"Clerk で削除されたスタッフのデータを削除できませんでした。次回また試します",
			});
		}
	}

	return report;
}
