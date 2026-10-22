import "server-only";
import type { User } from "@prisma/client";
import type { ProfileUpdateInput } from "@/features/profile/schemas/profile-input";
import type { ProfileInfo } from "@/features/profile/types/profile.type";
import { ApiError } from "@/shared/lib/api-error";
import { formatJapaneseDate, fromDbDate, toDbDate } from "@/shared/lib/date";
import { prisma } from "@/shared/lib/prisma";

// DB の User を、マイページに渡す形に変える
// 画面に渡すのは表示する項目だけ（id・clerkUserId などは渡さない）
export function toProfileInfo(user: User): ProfileInfo {
	let endDate: string | null = null;
	if (user.endDate !== null) {
		endDate = formatJapaneseDate(user.endDate);
	}

	return {
		lastName: user.lastName,
		firstName: user.firstName,
		email: user.email,
		role: user.role,
		status: user.status,
		startDate: formatJapaneseDate(user.startDate),
		endDate,
		dateOfBirth: formatJapaneseDate(user.dateOfBirth),
		dateOfBirthInput: fromDbDate(user.dateOfBirth),
		nationality: user.nationality,
		gender: user.gender,
	};
}

// ログイン中の本人のプロフィールを更新する
// userId は必ずログイン情報（requireStaff）から渡すこと。リクエストの値は使わない
//
// スタッフ管理の共通ロックは使わない（設計書 6節）
// - Clerk を呼ばず、1件の UPDATE だけで終わる
// - status = ACTIVE を条件にするので、無効化された後なら更新されない
export async function updateMyProfile(
	userId: string,
	input: ProfileUpdateInput,
): Promise<ProfileInfo> {
	// 本人の行で、ACTIVE のときだけ更新する
	// （update ではなく updateMany を使うのは、id 以外の条件 status も付けるため）
	const result = await prisma.user.updateMany({
		where: { id: userId, status: "ACTIVE" },
		data: {
			lastName: input.lastName,
			firstName: input.firstName,
			dateOfBirth: toDbDate(input.dateOfBirth),
			nationality: input.nationality,
			gender: input.gender,
		},
	});

	// 0件 = 行がない、または直前に無効化された
	if (result.count === 0) {
		throw new ApiError(403, "FORBIDDEN", "このアカウントは利用できません");
	}

	// 更新後の値を読み直して返す
	const user = await prisma.user.findUnique({ where: { id: userId } });
	if (user === null) {
		throw new ApiError(403, "FORBIDDEN", "このアカウントは利用できません");
	}

	logProfileUpdate(userId);
	return toProfileInfo(user);
}

// 操作ログ。氏名・生年月日などの個人情報は出さない
function logProfileUpdate(userId: string) {
	console.info(
		JSON.stringify({
			type: "profile_update",
			at: new Date().toISOString(),
			actorId: userId, // 本人が自分を更新するので、実行者と対象は同じ
			targetId: userId,
		}),
	);
}
