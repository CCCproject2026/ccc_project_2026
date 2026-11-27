// 対応記録の入力（POST /api/response-records の本文）
// 画面とサーバーの両方で使う。投稿者（staffId）と記録完了時刻（completedAt）は
// サーバー側で付けるので、ここには入れない（Web基本設計「投稿の流れ」4）
import { z } from "zod";

export const RESPONSE_CONTENT_MAX_LENGTH = 2000;
// 対応開始から保存までの上限（画面を開きっぱなしにした場合でも足りる長さ）
export const RESPONSE_MAX_ELAPSED_MS = 24 * 60 * 60 * 1000;

export const responseRecordCreateSchema = z.object({
	elderId: z.string().min(1).max(64),
	// 空白だけは不可（DB の response_record_content_check と同じ）
	content: z
		.string()
		.trim()
		.min(1, "対応内容を入力してください")
		.max(
			RESPONSE_CONTENT_MAX_LENGTH,
			`対応内容は${RESPONSE_CONTENT_MAX_LENGTH}文字以内で入力してください`,
		),
	isActualFall: z.boolean({ error: "実際の転倒だったかを選んでください" }),
	// 「対応開始」を押してから保存までの経過時間（ミリ秒）
	// ブラウザの時計の「時刻」を送ると PC の時計のずれがそのまま入るので、経過時間を送り、
	// サーバーで「記録完了時刻 − 経過時間」を対応開始時刻にする
	elapsedMs: z
		.number()
		.int()
		.min(0)
		.max(RESPONSE_MAX_ELAPSED_MS, "対応開始から時間が経ちすぎています"),
});

export type ResponseRecordCreateInput = z.infer<
	typeof responseRecordCreateSchema
>;
