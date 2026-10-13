import "server-only";
import type { User } from "@prisma/client";
import { ApiError } from "@/shared/lib/api-error";
import { prisma } from "@/shared/lib/prisma";
import {
	type ClerkStaffInvitation,
	type ClerkStaffUser,
	createStaffInvitation,
	findClerkUsersByEmail,
	findPendingInvitations,
	normalizeEmail,
} from "./clerk-admin";
import {
	createConfirmationToken,
	readConfirmationToken,
} from "./confirmation-token";
import type { StaffLock } from "./staff-lock";

// 手動確認が必要な理由
export type ManualCheckReason =
	| "MULTIPLE_ACCOUNTS" // 同じ email の Clerk アカウントが複数ある
	| "LINKED_TO_OTHER_STAFF" // その Clerk アカウントは別のスタッフに紐付いている
	| "EMAIL_NOT_VERIFIED" // primary email が未確認、または一致しない
	| "ACCOUNT_UNUSABLE" // Clerk アカウントが停止・ロック中
	| "FOREIGN_INVITATION"; // 本システム以外で作られた招待が残っている

// 照合の結果
export type ReconcileOutcome =
	| { result: "LINKED"; staff: User } // 紐付けて ACTIVE にした
	| { result: "CONFIRM_REQUIRED"; staff: User; confirmationToken: string } // NURSE の確認が必要
	| { result: "ALREADY_INVITED"; staff: User } // 有効な招待がある（再送しない）
	| { result: "SENT"; staff: User } // 招待を送った
	| { result: "RETRY_REQUIRED"; staff: User } // Clerk を確認できない（送っていない）
	| { result: "SEND_FAILED"; staff: User } // 送信が確実に失敗した
	| { result: "SEND_UNKNOWN"; staff: User } // 送信したかどうか不明
	| { result: "MANUAL_CHECK_REQUIRED"; staff: User; reason: ManualCheckReason };

// 紐付けの判断
export type LinkDecision =
	| { kind: "AUTO_LINK" } // 自動で紐付けてよい
	| { kind: "CONFIRM" } // NURSE が確認すれば紐付けてよい
	| { kind: "MANUAL"; reason: ManualCheckReason }; // 紐付けてはいけない

// 候補の Clerk アカウントを、このスタッフに紐付けてよいか判断する
// DB も Clerk も呼ばない（Webhook の T9 でも使う）
// linkedStaffId: その Clerk アカウントに紐付いている User.id（なければ null）
export function decideLink(
	staff: { id: string; email: string },
	candidate: ClerkStaffUser,
	linkedStaffId: string | null,
): LinkDecision {
	// ④ 他のスタッフに紐付いていないこと
	if (linkedStaffId !== null && linkedStaffId !== staff.id) {
		return { kind: "MANUAL", reason: "LINKED_TO_OTHER_STAFF" };
	}

	// ② 確認済みの primary email が完全一致すること
	if (
		!candidate.isPrimaryEmailVerified ||
		candidate.primaryEmail !== normalizeEmail(staff.email)
	) {
		return { kind: "MANUAL", reason: "EMAIL_NOT_VERIFIED" };
	}

	// 停止・ロック中のアカウントは ACTIVE にしない
	if (!candidate.isUsable) {
		return { kind: "MANUAL", reason: "ACCOUNT_UNUSABLE" };
	}

	// ③ 本システムの招待から作られたアカウントなら、自動で紐付けてよい
	if (candidate.staffUserId === staff.id) {
		return { kind: "AUTO_LINK" };
	}

	// 別の経路で作られたアカウント → NURSE の確認が必要
	return { kind: "CONFIRM" };
}

// PENDING のスタッフを Clerk と照合する
// 呼び出し側でロックを取り、ロックの中で DB から読み直したスタッフを渡すこと
export async function reconcileStaff(input: {
	staff: User;
	actorId: string; // 操作している NURSE の User.id
	confirmationToken?: string; // 既存アカウントを紐付けるときだけ
	lock: StaffLock;
}): Promise<ReconcileOutcome> {
	const { staff, actorId, confirmationToken, lock } = input;

	// ① 照合できるのは PENDING・未紐付けのスタッフだけ
	if (staff.status !== "PENDING" || staff.clerkUserId !== null) {
		throw new ApiError(
			409,
			"INVALID_STATE",
			"このスタッフは照合できる状態ではありません",
		);
	}

	// ===== 1. 同じ email の Clerk アカウントを探す =====
	lock.ensureCanContinue();
	const usersResult = await findClerkUsersByEmail(staff.email);
	if (usersResult.kind !== "SUCCESS") {
		return { result: "RETRY_REQUIRED", staff };
	}
	const candidates = usersResult.data;

	// 候補が複数 → 自動でも確認でも紐付けない
	if (candidates.length > 1) {
		return {
			result: "MANUAL_CHECK_REQUIRED",
			staff,
			reason: "MULTIPLE_ACCOUNTS",
		};
	}

	// 候補が1つ → 紐付けてよいか判断する
	if (candidates.length === 1) {
		const candidate = candidates[0];

		// その Clerk アカウントが、既に別のスタッフに紐付いていないか
		const linkedStaff = await prisma.user.findUnique({
			where: { clerkUserId: candidate.id },
			select: { id: true },
		});
		let linkedStaffId: string | null = null;
		if (linkedStaff !== null) {
			linkedStaffId = linkedStaff.id;
		}

		const decision = decideLink(staff, candidate, linkedStaffId);

		if (decision.kind === "MANUAL") {
			return {
				result: "MANUAL_CHECK_REQUIRED",
				staff,
				reason: decision.reason,
			};
		}

		if (decision.kind === "AUTO_LINK") {
			const linked = await linkStaff(staff, candidate, lock);
			return { result: "LINKED", staff: linked };
		}

		// decision.kind === "CONFIRM"
		// まだ確認していない → 確認トークンを発行して、NURSE に確認してもらう
		if (confirmationToken === undefined) {
			const token = createConfirmationToken({
				userId: staff.id,
				clerkUserId: candidate.id,
				email: normalizeEmail(staff.email),
				userUpdatedAt: staff.updatedAt.toISOString(),
				confirmedBy: actorId,
			});
			return { result: "CONFIRM_REQUIRED", staff, confirmationToken: token };
		}

		// 確認済み → トークンが今の状況と一致するか確かめてから紐付ける
		checkConfirmationToken(confirmationToken, staff, candidate, actorId);
		const linked = await linkStaff(staff, candidate, lock);
		return { result: "LINKED", staff: linked };
	}

	// ここからは Clerk アカウントがない場合

	// 確認トークンが送られてきたのに候補がない → 確認後に状況が変わった
	if (confirmationToken !== undefined) {
		throw new ApiError(
			409,
			"TOKEN_MISMATCH",
			"確認後に状況が変わりました。もう一度確認してください",
		);
	}

	// ===== 2. 有効な招待があるか確認する =====
	lock.ensureCanContinue();
	const invitationsResult = await findPendingInvitations(staff.email);
	if (invitationsResult.kind !== "SUCCESS") {
		return { result: "RETRY_REQUIRED", staff };
	}

	if (hasOwnInvitation(invitationsResult.data, staff.id)) {
		return { result: "ALREADY_INVITED", staff };
	}
	if (invitationsResult.data.length > 0) {
		// 本システム以外の招待がある。そのまま送ると重複になるので、手動で確認してもらう
		return {
			result: "MANUAL_CHECK_REQUIRED",
			staff,
			reason: "FOREIGN_INVITATION",
		};
	}

	// ===== 3. 招待を送る =====
	lock.ensureCanContinue();
	const sendResult = await createStaffInvitation(staff.email, staff.id);

	if (sendResult.kind === "SUCCESS") {
		return { result: "SENT", staff };
	}
	if (sendResult.kind === "UNKNOWN") {
		// 送られたかもしれないので、次の「照合」で確認する
		return { result: "SEND_UNKNOWN", staff };
	}

	// FAILED: 重複エラーの可能性があるので、もう一度 Clerk を確認する（設計書 5節）
	lock.ensureCanContinue();
	const recheck = await findPendingInvitations(staff.email);
	if (recheck.kind === "SUCCESS" && hasOwnInvitation(recheck.data, staff.id)) {
		return { result: "ALREADY_INVITED", staff };
	}
	return { result: "SEND_FAILED", staff };
}

// 本システムがこのスタッフ向けに発行した招待があるか
function hasOwnInvitation(
	invitations: ClerkStaffInvitation[],
	staffId: string,
): boolean {
	for (const invitation of invitations) {
		if (invitation.staffUserId === staffId) {
			return true;
		}
	}
	return false;
}

// 確認トークンが「今の状況」と一致するか確かめる。一致しなければ 409
function checkConfirmationToken(
	token: string,
	staff: User,
	candidate: ClerkStaffUser,
	actorId: string,
): void {
	const data = readConfirmationToken(token);

	const isValid =
		data !== null &&
		data.userId === staff.id &&
		data.clerkUserId === candidate.id && // 候補が変わっていない
		data.email === normalizeEmail(staff.email) &&
		data.userUpdatedAt === staff.updatedAt.toISOString() && // スタッフが更新されていない
		data.confirmedBy === actorId; // 確認した本人が実行している

	if (!isValid) {
		throw new ApiError(
			409,
			"TOKEN_MISMATCH",
			"確認後に状況が変わりました。もう一度確認してください",
		);
	}
}

// スタッフを Clerk アカウントに紐付けて ACTIVE にする
async function linkStaff(
	staff: User,
	candidate: ClerkStaffUser,
	lock: StaffLock,
): Promise<User> {
	lock.ensureCanContinue();

	// 期待する状態（PENDING・未紐付け）のときだけ更新する
	// clerkUserId が他の行と重複した場合は、Prisma が P2002 エラーを出し、errorResponse が 409 にする
	const updated = await prisma.user.updateMany({
		where: { id: staff.id, status: "PENDING", clerkUserId: null },
		data: { status: "ACTIVE", clerkUserId: candidate.id },
	});

	// 0件 = 照合の途中で状態が変わった
	if (updated.count === 0) {
		throw new ApiError(
			409,
			"INVALID_STATE",
			"スタッフの状態が変わったため、紐付けできませんでした",
		);
	}

	return prisma.user.findUniqueOrThrow({ where: { id: staff.id } });
}
