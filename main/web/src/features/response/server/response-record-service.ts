import "server-only";
import type { User } from "@prisma/client";
import { ApiError } from "@/shared/lib/api-error";
import { prisma } from "@/shared/lib/prisma";
import type { ResponseRecordCreateInput } from "../schemas/response-record-input";

// 対応記録を保存する
// 呼ぶ前に requireStaff() で ACTIVE なスタッフか確かめること
export async function createResponseRecord(
	staff: User,
	input: ResponseRecordCreateInput,
) {
	// 記録完了時刻はサーバーの時計で付ける。対応開始時刻は「完了 − 経過時間」で求めるので、
	// PC の時計がずれていても保存でき、DB の responseStartedAt <= completedAt も必ず守られる
	const completedAt = new Date();
	const responseStartedAt = new Date(completedAt.getTime() - input.elapsedMs);

	// 在籍中の高齢者だけに記録できる
	const elder = await prisma.elder.findFirst({
		where: { id: input.elderId, status: "ACTIVE" },
		select: { id: true },
	});
	if (elder === null) {
		throw new ApiError(404, "NOT_FOUND", "対象の高齢者が見つかりません");
	}

	const record = await prisma.responseRecord.create({
		data: {
			elderId: elder.id,
			staffId: staff.id, // 投稿者はログイン中のスタッフ（画面からは受け取らない）
			content: input.content,
			isActualFall: input.isActualFall,
			responseStartedAt,
			completedAt,
		},
		select: { id: true, completedAt: true },
	});

	return { id: record.id, completedAt: record.completedAt.toISOString() };
}
