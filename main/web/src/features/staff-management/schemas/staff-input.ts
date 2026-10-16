// スタッフ登録の入力チェック（zod）
// 画面のフォームと API の両方で同じものを使う。そのため "server-only" は付けない
import { z } from "zod";
import { isRealDate, todayInJapan } from "@/shared/lib/date";

// ロール（NURSE か CAREGIVER だけ）
export const staffRoleSchema = z.enum(["NURSE", "CAREGIVER"], {
	message: "ロールを選択してください",
});

// 性別の選択肢（画面のドロップダウンと同じ値）
export const GENDER_OPTIONS = ["女性", "男性"] as const;

// ===== 項目ごとのチェック（新規招待と再招待で共通） =====

// 生年月日は「実在する日付」で「日本時間の今日より前」
// "YYYY-MM-DD" の文字列どうしは、そのまま < で日付の前後を比べられる
const dateOfBirthSchema = z
	.string()
	.trim()
	.refine(
		(value) => isRealDate(value) && value < todayInJapan(),
		"生年月日は今日より前の日付をYYYY-MM-DD形式で入力してください",
	);

const startDateSchema = z
	.string()
	.trim()
	.refine(
		(value) => isRealDate(value),
		"入職日はYYYY-MM-DD形式の実在する日付で入力してください",
	);

// 国籍は自由入力
const nationalitySchema = z
	.string()
	.trim()
	.min(1, "国籍を入力してください")
	.max(100, "国籍は100文字以内で入力してください");

// 性別はドロップダウンから選ぶので、決められた値だけ受け付ける
// （フォームの初期値は "" なので、入力は string として受け取ってからチェックする）
const genderSchema = z
	.string()
	.pipe(z.enum(GENDER_OPTIONS, { message: "性別を選択してください" }));

// 再招待で「空欄なら登録済みの値のまま」にする項目
// 空欄（""）は undefined にそろえる。undefined の項目は DB を更新しない
function keepIfBlank<T extends z.ZodType>(schema: T) {
	return z.union([z.literal("").transform(() => undefined), schema]).optional();
}

// 招待するときの入力（POST /api/staff/invitations）
export const staffInviteSchema = z.object({
	// 前後の空白を消して小文字にしてから、メールの形かチェックする
	// （pipe を使うと「整える → チェック」の順番になる）
	email: z
		.string()
		.trim()
		.toLowerCase()
		.pipe(z.email("正しいメールアドレスの形式で入力してください")),

	role: staffRoleSchema,

	lastName: z
		.string()
		.trim()
		.min(1, "姓を入力してください")
		.max(50, "姓は50文字以内で入力してください"),

	firstName: z
		.string()
		.trim()
		.min(1, "名を入力してください")
		.max(50, "名は50文字以内で入力してください"),

	dateOfBirth: dateOfBirthSchema,
	startDate: startDateSchema,
	nationality: nationalitySchema,
	gender: genderSchema,
});

// 再招待するときの入力（POST /api/staff/invitations/:id/reinvite）
// email は変更できないので、入力から外す（サーバーは DB に保存済みの email を使う）
// 生年月日・入職日・国籍・性別は画面に返していない（個人情報のため）。
// そのため再招待フォームでは空欄で表示し、空欄のままなら登録済みの値をそのまま使う
export const staffReinviteSchema = staffInviteSchema
	.omit({ email: true })
	.extend({
		dateOfBirth: keepIfBlank(dateOfBirthSchema),
		startDate: keepIfBlank(startDateSchema),
		nationality: keepIfBlank(nationalitySchema),
		gender: keepIfBlank(genderSchema),
	});

// ロール変更（PATCH /api/staff/:id/role）
export const staffRoleChangeSchema = z.object({
	role: staffRoleSchema,
});

// 照合（POST /api/staff/invitations/:id/sync）
// 既存アカウントを紐付けるときだけ確認トークンを送る
export const staffSyncSchema = z.object({
	confirmationToken: z.string().min(1).optional(),
});

// スタッフ一覧の検索条件（GET /api/staff?status=ACTIVE）
export const staffListQuerySchema = z.object({
	status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

// チェック後のデータの型
export type StaffInviteInput = z.infer<typeof staffInviteSchema>;
export type StaffReinviteInput = z.infer<typeof staffReinviteSchema>;
