import "server-only";
import { notifyOps } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { getClerkUser } from "./clerk-admin";
import { unlinkStaffOfDeletedClerkUser } from "./clerk-webhook";
import { withStaffLock } from "./staff-lock";

// Clerk アカウントが削除されたスタッフの定期復旧（T10 と同じ考え方）
//
// Webhook（user.deleted）が届く環境では、その場で INACTIVE・未紐付けになる。
// ただし Webhook は届かない環境もある（ローカル開発、Clerk 側の障害、
// アプリの停止中など）。その場合に「Clerk にはいないのに DB では紐付いたまま」の
// User 行が残り、再招待もできなくなるため、定期にまとめて紐付けを外す。
// User 行と対応記録は物理削除しない（Webhook と同じ処理を使う）。
//
// 1. clerkUserId を持つ User 行を一覧する
// 2. Clerk に確認して、既に消えているアカウントの行だけ処理する
// 3. 1件ずつ共通ロックを取って、直前に状態を確認してから INACTIVE・未紐付けにする
//
// 処理できないもの（Clerk に到達できない・ロックが取れない）は次回に回す。
// 消えたと誤判断しないよう、Clerk の確認が取れないときは何もしない。
export type DeletedClerkUsersReport = {
	scanned: number; // clerkUserId を持つ User 行の数
	unlinked: number; // Clerk 側で既に消えていた行の数（INACTIVE・未紐付けにできたもの）
	failed: number; // 確認・処理できなかったもの（次回に回す）
};

export async function reconcileDeletedClerkUsers(options: {
	dryRun: boolean; // true なら DB を変えず数えるだけ
}): Promise<DeletedClerkUsersReport> {
	const report: DeletedClerkUsersReport = {
		scanned: 0,
		unlinked: 0,
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
			report.unlinked = report.unlinked + 1;
			continue;
		}

		// 3. 共通ロックの中で INACTIVE・未紐付けにする（Webhook と同じ処理を使う）
		try {
			await withStaffLock(async (lock) => {
				await unlinkStaffOfDeletedClerkUser(clerkUserId, lock);
			});
			report.unlinked = report.unlinked + 1;
		} catch {
			// ロックが取れない・接続が切れたなど。次回に回す
			report.failed = report.failed + 1;
			notifyOps("DELETED_CLERK_USER_RECONCILE_FAILED", {
				targetId: staff.id,
				reason:
					"Clerk で削除されたスタッフの紐付けを外せませんでした。次回また試します",
			});
		}
	}

	return report;
}
