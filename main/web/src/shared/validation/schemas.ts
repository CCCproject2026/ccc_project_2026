import { z } from "zod";

// =============================================================
// 入力スキーマ（フォーム・API Route Handler で共有）
//
// 画面側のバリデーションとサーバー側の実行時検証で同じ定義を使い、
// 二重管理によるずれを防ぐ。
// 型は z.infer で導出し、各 feature の types から re-export する。
// =============================================================

// ---- 性別（Prisma の Gender enum と同じコード値） ----
export const genderValues = ["MALE", "FEMALE"] as const;
export const genderSchema = z.enum(genderValues, {
	message: "性別を選択してください",
});
export type Gender = z.infer<typeof genderSchema>;

// ---- 高齢者のステータス（Prisma の ElderStatus enum と同じ値） ----
export const elderStatusValues = ["ACTIVE", "INACTIVE"] as const;
export const elderStatusSchema = z.enum(elderStatusValues);
export type ElderStatus = z.infer<typeof elderStatusSchema>;

// ---- スタッフの権限ロール ----
export const roleValues = ["看護師（管理者）", "介護士"] as const;
export const roleSchema = z.enum(roleValues, {
	message: "権限ロールを選択してください",
});
export type RoleType = z.infer<typeof roleSchema>;

// ---- 共通フィールド ----

// 氏名。空文字・空白のみを拒否し、前後の空白は除去する。
const personNameSchema = (label: string) =>
	z
		.string()
		.trim()
		.min(1, `${label}を入力してください`)
		.max(50, `${label}は50文字以内で入力してください`);

// 生年月日（YYYY-MM-DD）。不正な日付・未来日・0〜130歳の範囲外を拒否する。
const dateOfBirthSchema = z
	.string()
	.min(1, "生年月日を入力してください")
	.refine((value) => {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return false;
		const today = new Date();
		const age = today.getFullYear() - date.getFullYear();
		return date <= today && age >= 0 && age <= 130;
	}, "有効な生年月日を入力してください（0〜130歳、未来日不可）");

// ---- 高齢者 ----

export const elderCreateSchema = z.object({
	firstName: personNameSchema("名"),
	lastName: personNameSchema("姓"),
	roomNumber: z
		.string()
		.trim()
		.min(1, "部屋番号を入力してください")
		.max(20, "部屋番号は20文字以内で入力してください"),
	dateOfBirth: dateOfBirthSchema,
	gender: genderSchema,
});

// PATCH 用の部分更新スキーマ。全項目を任意にし、status の変更も許可する。
export const elderUpdateSchema = elderCreateSchema.partial().extend({
	status: elderStatusSchema.optional(),
});

export type ElderFormData = z.infer<typeof elderCreateSchema>;
export type CreateElderInput = z.infer<typeof elderCreateSchema>;
export type UpdateElderInput = z.infer<typeof elderUpdateSchema>;

// ---- スタッフ ----

export const staffFormSchema = z.object({
	name: personNameSchema("氏名"),
	mail: z
		.string()
		.trim()
		.min(1, "メールアドレスを入力してください")
		.email("正しいメールアドレスの形式で入力してください"),
	role: roleSchema,
});
export type StaffFormData = z.infer<typeof staffFormSchema>;
