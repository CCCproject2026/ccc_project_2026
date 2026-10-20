// マイページのプロフィール更新の入力チェック（zod）
// 画面のフォームと API の両方で同じものを使う。そのため "server-only" は付けない
import { z } from "zod";
import { staffInviteSchema } from "@/features/staff-management/schemas/staff-input";

// 本人が更新できる5項目だけを、招待の入力チェックから取り出す
// （文字数・日付・性別のルールを二重に書かないため）
//
// .strict() を付けると、決めた項目以外（role・status・email・startDate など）が
// 送られてきたときにエラーになる。本人がロールなどを変えられないようにするため
export const profileUpdateSchema = staffInviteSchema
	.pick({
		lastName: true,
		firstName: true,
		dateOfBirth: true,
		nationality: true,
		gender: true,
	})
	.strict();

// チェック後のデータの型
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
