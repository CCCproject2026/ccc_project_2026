// 開発用：最初の NURSE を作る（T11）
//
// 実行: pnpm bootstrap:nurse
// 入力は .env の BOOTSTRAP_NURSE_* から読む（.env.example を参照）
// 本番では実行しない
import "dotenv/config";
import { z } from "zod";
import { staffInviteSchema } from "@/features/staff-management/schemas/staff-input";
import {
	BootstrapError,
	bootstrapNurse,
} from "@/features/staff-management/server/bootstrap-nurse";
import { prisma } from "@/shared/lib/prisma";

// 入力のチェック（招待と同じ必須項目 ＋ パスワード）
const bootstrapSchema = staffInviteSchema.extend({
	password: z.string().min(8, "パスワードは8文字以上にしてください"),
});

// 実行してよい NODE_ENV（未設定・development・test だけ）
// 「production 以外ならよい」ではなく、許可するものだけを並べる（staging などでも動かないように）
const ALLOWED_NODE_ENVS = ["", "development", "test"];

async function main() {
	// 開発環境以外では絶対に実行しない
	const nodeEnv = process.env.NODE_ENV ?? "";
	if (!ALLOWED_NODE_ENVS.includes(nodeEnv)) {
		console.error(
			`NODE_ENV=${nodeEnv} では bootstrap:nurse を実行できません（開発環境専用）`,
		);
		process.exitCode = 1;
		return;
	}
	// Heroku の dyno の中（heroku run など）では、NODE_ENV に関係なく実行しない
	if (process.env.DYNO !== undefined) {
		console.error("Heroku 上では bootstrap:nurse を実行できません（開発環境専用）");
		process.exitCode = 1;
		return;
	}

	// 1. 環境変数を読む。足りなければ、何もせずに止める
	const parsed = bootstrapSchema.safeParse({
		email: process.env.BOOTSTRAP_NURSE_EMAIL ?? "",
		password: process.env.BOOTSTRAP_NURSE_PASSWORD ?? "",
		role: "NURSE",
		lastName: process.env.BOOTSTRAP_NURSE_LAST_NAME ?? "",
		firstName: process.env.BOOTSTRAP_NURSE_FIRST_NAME ?? "",
		dateOfBirth: process.env.BOOTSTRAP_NURSE_DATE_OF_BIRTH ?? "",
		startDate: process.env.BOOTSTRAP_NURSE_START_DATE ?? "",
		nationality: process.env.BOOTSTRAP_NURSE_NATIONALITY ?? "",
		gender: process.env.BOOTSTRAP_NURSE_GENDER ?? "",
	});
	if (!parsed.success) {
		// どの項目が足りないかだけを出す（値、特にパスワードは出さない）
		console.error("BOOTSTRAP_NURSE_* の設定が足りないか、正しくありません:");
		for (const issue of parsed.error.issues) {
			console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
		}
		process.exitCode = 1;
		return;
	}

	// 2. 作成する
	try {
		const result = await bootstrapNurse(parsed.data);
		console.info(
			`作成しました: ${result.staff.lastName} ${result.staff.firstName}（ACTIVE・NURSE）` +
				(result.isClerkUserCreated
					? "／Clerk アカウントも新しく作成しました"
					: "／既存の Clerk アカウントを使いました"),
		);
	} catch (error) {
		if (error instanceof BootstrapError) {
			console.error(`中止しました: ${error.message}`);
		} else {
			console.error(
				"失敗しました:",
				error instanceof Error ? error.message : typeof error,
			);
		}
		process.exitCode = 1;
	}
}

main().finally(async () => {
	await prisma.$disconnect();
});
