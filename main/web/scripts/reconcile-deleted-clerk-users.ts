// Clerk アカウントが削除されたスタッフのデータを削除する定期処理
//
// 実行:    pnpm staff:reconcile-deleted
// 確認だけ: pnpm staff:reconcile-deleted --dry-run
// 本番:    Heroku Scheduler に「10分ごと」で登録する
//
// Webhook（user.deleted）が届かない環境（ローカル開発など）でも、
// 孤児になった User 行をまとめて削除できるようにする。
import "dotenv/config";
import { reconcileDeletedClerkUsers } from "@/features/staff-management/server/deleted-clerk-users";
import { prisma } from "@/shared/lib/prisma";

async function main() {
	const dryRun = process.argv.includes("--dry-run");

	const report = await reconcileDeletedClerkUsers({ dryRun });

	// 個人情報は出さない（件数だけ）
	console.info(
		JSON.stringify({
			type: "reconcile_deleted_clerk_users",
			at: new Date().toISOString(),
			dryRun,
			...report,
		}),
	);

	// 確認・削除できなかったものがあれば、終了コードを 1 にする（ログで気づけるように）
	if (report.failed > 0) {
		process.exitCode = 1;
	}
}

main()
	.catch((error) => {
		console.error(
			"[reconcile-deleted-clerk-users] 失敗しました:",
			error instanceof Error ? error.message : typeof error,
		);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
