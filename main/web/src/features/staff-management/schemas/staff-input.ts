// スタッフ登録の入力チェック（zod）
// 画面のフォームと API の両方で同じものを使う。そのため "server-only" は付けない
import { z } from "zod";
import { isRealDate, todayInJapan } from "@/shared/lib/date";

// ロール（NURSE か CAREGIVER だけ）
export const staffRoleSchema = z.enum(["NURSE", "CAREGIVER"], {
	message: "ロールを選択してください",
});

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

	// 生年月日は「実在する日付」で「日本時間の今日より前」
	// "YYYY-MM-DD" の文字列どうしは、そのまま < で日付の前後を比べられる
	dateOfBirth: z
		.string()
		.trim()
		.refine(
			(value) => isRealDate(value) && value < todayInJapan(),
			"生年月日は今日より前の日付をYYYY-MM-DD形式で入力してください",
		),

	startDate: z
		.string()
		.trim()
		.refine(
			(value) => isRealDate(value),
			"入職日はYYYY-MM-DD形式の実在する日付で入力してください",
		),

	// 国籍・性別は、この版では自由入力
	nationality: z
		.string()
		.trim()
		.min(1, "国籍を入力してください")
		.max(100, "国籍は100文字以内で入力してください"),

	gender: z
		.string()
		.trim()
		.min(1, "性別を入力してください")
		.max(100, "性別は100文字以内で入力してください"),
});

// 再招待するときの入力（POST /api/staff/invitations/:id/reinvite）
// email は変更できないので、入力から外す（サーバーは DB に保存済みの email を使う）
export const staffReinviteSchema = staffInviteSchema.omit({ email: true });

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
