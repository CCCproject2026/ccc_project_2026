// 取消済みスタッフの招待を失効させる定期処理（T10）
//
// 実行:    pnpm staff:reconcile-cancelled
// 確認だけ: pnpm staff:reconcile-cancelled --dry-run
// 本番:    Heroku Scheduler に「10分ごと」で登録する
import "dotenv/config";
import { revokeCancelledInvitations } from "@/features/staff-management/server/cancelled-invitations";
import { prisma } from "@/shared/lib/prisma";

async function main() {
	const dryRun = process.argv.includes("--dry-run");

	const report = await revokeCancelledInvitations({ dryRun });

	// 個人情報は出さない（件数だけ）
	console.info(
		JSON.stringify({
			type: "reconcile_cancelled_invitations",
			at: new Date().toISOString(),
			dryRun,
			...report,
		}),
	);

	// 失効できなかったものがあれば、終了コードを 1 にする（ログで気づけるように）
	if (report.failed > 0) {
		process.exitCode = 1;
	}
}

main()
	.catch((error) => {
		console.error(
			"[reconcile-cancelled-invitations] 失敗しました:",
			error instanceof Error ? error.message : typeof error,
		);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
