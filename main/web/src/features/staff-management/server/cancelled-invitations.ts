import "server-only";
import { notifyOps } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { listAllPendingInvitations } from "./clerk-admin";
import { withStaffLock } from "./staff-lock";
import { revokeOwnInvitations } from "./staff-service";

// 定期処理の結果
export type CancelledInvitationsReport = {
	pendingInvitations: number; // Clerk の有効な招待の数
	targets: number; // 失効させる必要があったスタッフの数
	revoked: number; // 失効できたスタッフの数
	failed: number; // 失効できなかったスタッフの数（次回また試す）
	skipped: number; // ロックの中で確認したら対象外だった（再招待された等）
};

// 取消済みスタッフの招待を失効させる定期処理（T10・設計書 6節）
//
// 取消の後に、遅れて招待が作られた場合に備える。
// 1. Clerk の有効な招待をまとめて取得する
// 2. 本システムが発行した招待のうち、相手が「INACTIVE・未紐付け」のものを探す
// 3. 対象ごとに共通ロックを取り、状態を確認し直してから失効させる
// INACTIVE のスタッフを有効化することはしない。
export async function revokeCancelledInvitations(options: {
	dryRun: boolean; // true なら失効させず、対象を数えるだけ
}): Promise<CancelledInvitationsReport> {
	const report: CancelledInvitationsReport = {
		pendingInvitations: 0,
		targets: 0,
		revoked: 0,
		failed: 0,
		skipped: 0,
	};

	// 1. Clerk の有効な招待をまとめて取得する
	const invitationsResult = await listAllPendingInvitations();
	if (invitationsResult.kind !== "SUCCESS") {
		notifyOps("CANCELLED_INVITATIONS_CHECK_FAILED", {
			reason: "Clerk の招待一覧を取得できませんでした。次回また試します",
		});
		throw new Error("Clerk の招待一覧を取得できませんでした");
	}
	report.pendingInvitations = invitationsResult.data.length;

	// 本システムが発行した招待の、相手の User.id（重複なし）
	const staffIds: string[] = [];
	for (const invitation of invitationsResult.data) {
		if (
			invitation.staffUserId !== null &&
			!staffIds.includes(invitation.staffUserId)
		) {
			staffIds.push(invitation.staffUserId);
		}
	}
	if (staffIds.length === 0) {
		return report;
	}

	// 2. そのうち INACTIVE・未紐付け（取消済み・招待失敗）のスタッフ
	const targets = await prisma.user.findMany({
		where: { id: { in: staffIds }, status: "INACTIVE", clerkUserId: null },
		select: { id: true },
	});
	report.targets = targets.length;

	if (options.dryRun) {
		return report;
	}

	// 3. 対象ごとにロックを取り、確認し直してから失効させる
	for (const target of targets) {
		try {
			await withStaffLock(async (lock) => {
				// ロックを待っている間に再招待された可能性があるので、読み直す
				const staff = await prisma.user.findUnique({
					where: { id: target.id },
				});
				if (
					staff === null ||
					staff.status !== "INACTIVE" ||
					staff.clerkUserId !== null
				) {
					report.skipped = report.skipped + 1;
					return;
				}

				const isRevoked = await revokeOwnInvitations(staff, lock);
				if (isRevoked) {
					report.revoked = report.revoked + 1;
				} else {
					report.failed = report.failed + 1;
					notifyOps("CANCELLED_INVITATION_REVOKE_FAILED", {
						targetId: staff.id,
						reason:
							"取消済みスタッフの招待を失効できませんでした。次回また試します",
					});
				}
			});
		} catch {
			// ロックが取れない・接続が切れたなど。次回また試す
			report.failed = report.failed + 1;
			notifyOps("CANCELLED_INVITATION_REVOKE_FAILED", {
				targetId: target.id,
				reason: "定期処理の途中でエラーが発生しました。次回また試します",
			});
		}
	}

	return report;
}
