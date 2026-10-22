import "server-only";
import type { Prisma, User, UserRole } from "@prisma/client";
import type {
	StaffInviteInput,
	StaffReinviteInput,
} from "@/features/staff-management/schemas/staff-input";
import type {
	StaffItem,
	StaffRetryAction,
} from "@/features/staff-management/types/staff.types";
import { ApiError } from "@/shared/lib/api-error";
import { requireRole } from "@/shared/lib/auth";
import { toDbDate } from "@/shared/lib/date";
import { prisma } from "@/shared/lib/prisma";
import { logStaffOperation } from "./audit";
import {
	findPendingInvitations,
	getClerkUser,
	revokeInvitation,
} from "./clerk-admin";
import {
	type ManualCheckReason,
	type ReconcileOutcome,
	reconcileStaff,
} from "./reconcile";
import { toStaffItem } from "./staff-dto";
import { type StaffLock, withStaffLock } from "./staff-lock";

// 操作が成功したときの応答
export type StaffOperationResponse = {
	staff: StaffItem;
	result?: ReconcileOutcome["result"]; // 照合した場合の結果
	reason?: ManualCheckReason; // 手動確認が必要な理由
	confirmationToken?: string; // 既存アカウントを紐付けるための確認トークン
};

// ============================================================
// 共通の小さな関数
// ============================================================

// ACTIVE な NURSE の人数（最後の NURSE を守るために使う）
async function countActiveNurses(): Promise<number> {
	return prisma.user.count({ where: { status: "ACTIVE", role: "NURSE" } });
}

// DB の User を、画面に返す StaffItem にする
async function toDto(staff: User): Promise<StaffItem> {
	const activeNurseCount = await countActiveNurses();
	return toStaffItem(staff, activeNurseCount);
}

// id でスタッフを探す。いなければ 404
async function findStaffOrThrow(id: string): Promise<User> {
	const staff = await prisma.user.findUnique({ where: { id } });
	if (staff === null) {
		throw new ApiError(404, "NOT_FOUND", "スタッフが見つかりません");
	}
	return staff;
}

// 状態が違うときの 409
function invalidState(message: string): ApiError {
	return new ApiError(409, "INVALID_STATE", message);
}

// Clerk の処理に失敗したときの 502（今の DB の状態と、次に案内する操作を返す）
async function externalFailure(
	message: string,
	staff: User,
	retryAction?: StaffRetryAction,
): Promise<ApiError> {
	return new ApiError(502, "EXTERNAL_FAILURE", message, {
		staff: await toDto(staff),
		retryAction,
	});
}

// 操作ログに残す状態
function snapshot(staff: User) {
	return { status: staff.status, role: staff.role };
}

// 照合の結果を、操作ログの「外部処理結果」にする
function externalResultOf(
	result: ReconcileOutcome["result"],
): "SUCCESS" | "FAILED" | "UNKNOWN" | "SKIPPED" {
	if (result === "SENT" || result === "LINKED") {
		return "SUCCESS";
	}
	if (result === "SEND_FAILED" || result === "INVITATION_EXISTS") {
		return "FAILED";
	}
	if (result === "SEND_UNKNOWN" || result === "RETRY_REQUIRED") {
		return "UNKNOWN";
	}
	return "SKIPPED";
}

// 照合の結果を、API の応答にする
async function toResponse(
	outcome: ReconcileOutcome,
): Promise<StaffOperationResponse> {
	const response: StaffOperationResponse = {
		staff: await toDto(outcome.staff),
		result: outcome.result,
	};
	if (outcome.result === "CONFIRM_REQUIRED") {
		response.confirmationToken = outcome.confirmationToken;
	}
	if (outcome.result === "MANUAL_CHECK_REQUIRED") {
		response.reason = outcome.reason;
	}
	return response;
}

// ============================================================
// 一覧（読むだけなのでロックは使わない）
// ============================================================

// 登録待ち（PENDING）の一覧
export async function listInvitations(): Promise<{ staff: StaffItem[] }> {
	const users = await prisma.user.findMany({
		where: { status: "PENDING" },
		orderBy: { createdAt: "asc" },
	});
	const activeNurseCount = await countActiveNurses();

	const staff: StaffItem[] = [];
	for (const user of users) {
		staff.push(toStaffItem(user, activeNurseCount));
	}
	return { staff };
}

// 利用中・停止中の一覧（status を指定しなければ両方）
export async function listStaff(
	status?: "ACTIVE" | "INACTIVE",
): Promise<{ staff: StaffItem[] }> {
	let where: Prisma.UserWhereInput = { status: { in: ["ACTIVE", "INACTIVE"] } };
	if (status !== undefined) {
		where = { status };
	}

	const users = await prisma.user.findMany({
		where,
		orderBy: { createdAt: "asc" },
	});
	const activeNurseCount = await countActiveNurses();

	const staff: StaffItem[] = [];
	for (const user of users) {
		staff.push(toStaffItem(user, activeNurseCount));
	}
	return { staff };
}

// ============================================================
// T6：新規招待・照合
// ============================================================

// 新規招待（POST /api/staff/invitations）
export async function inviteStaff(
	input: StaffInviteInput,
): Promise<StaffOperationResponse> {
	return withStaffLock(async (lock) => {
		// ロックを待っている間に権限が変わったかもしれないので、もう一度確認する
		const actor = await requireRole("NURSE");

		// 同じ email のスタッフがいれば 409（User を増やさない）
		const existing = await prisma.user.findUnique({
			where: { email: input.email },
		});
		if (existing !== null) {
			let message = "このメールアドレスのスタッフは既に登録されています";
			if (existing.status === "PENDING") {
				message =
					"このメールアドレスは登録待ちです。招待一覧から「照合」してください";
			}
			if (existing.status === "INACTIVE") {
				message =
					"このメールアドレスのスタッフは停止中です。スタッフ一覧から「再招待」または「有効化」してください";
			}
			throw new ApiError(409, "DUPLICATE", message, {
				staff: await toDto(existing),
			});
		}

		// 全項目を入れて PENDING で作る
		lock.ensureCanContinue();
		const created = await prisma.user.create({
			data: {
				email: input.email,
				role: input.role,
				lastName: input.lastName,
				firstName: input.firstName,
				dateOfBirth: toDbDate(input.dateOfBirth),
				startDate: toDbDate(input.startDate),
				nationality: input.nationality,
				gender: input.gender,
				status: "PENDING",
			},
		});

		// Clerk と照合して、必要なら招待を送る
		const outcome = await reconcileStaff({
			staff: created,
			actorId: actor.id,
			lock,
		});
		return finishInvitation(outcome, actor.id, "INVITE", null, lock);
	});
}

// 照合（POST /api/staff/invitations/:id/sync）
export async function syncInvitation(
	id: string,
	confirmationToken?: string,
): Promise<StaffOperationResponse> {
	return withStaffLock(async (lock) => {
		const actor = await requireRole("NURSE");
		const staff = await findStaffOrThrow(id);
		const before = snapshot(staff);

		const outcome = await reconcileStaff({
			staff,
			actorId: actor.id,
			confirmationToken,
			lock,
		});

		logStaffOperation({
			actorId: actor.id,
			targetId: staff.id,
			action: "SYNC",
			before,
			after: snapshot(outcome.staff),
			externalResult: externalResultOf(outcome.result),
		});

		// 照合からの送信は、失敗しても結果不明でも PENDING のまま（設計書 4.2）
		if (
			outcome.result === "RETRY_REQUIRED" ||
			outcome.result === "SEND_UNKNOWN" ||
			outcome.result === "SEND_FAILED"
		) {
			throw await externalFailure(
				"Clerk と照合できませんでした。しばらくしてから、もう一度「照合」してください",
				outcome.staff,
				"SYNC",
			);
		}
		return toResponse(outcome);
	});
}

// 新規招待・再招待の照合結果を、API の応答にする
async function finishInvitation(
	outcome: ReconcileOutcome,
	actorId: string,
	action: "INVITE" | "REINVITE",
	before: { status: string; role: string } | null,
	lock: StaffLock,
): Promise<StaffOperationResponse> {
	let staff = outcome.staff;

	// 送信が確実に失敗した → INACTIVE にする（設計書 3節）
	if (outcome.result === "SEND_FAILED") {
		lock.ensureCanContinue();
		await prisma.user.updateMany({
			where: { id: staff.id, status: "PENDING", clerkUserId: null },
			data: { status: "INACTIVE" },
		});
		staff = await prisma.user.findUniqueOrThrow({ where: { id: staff.id } });
	}

	logStaffOperation({
		actorId,
		targetId: staff.id,
		action,
		before: before ?? undefined,
		after: snapshot(staff),
		externalResult: externalResultOf(outcome.result),
	});

	if (outcome.result === "SEND_FAILED") {
		throw await externalFailure(
			"招待メールを送信できませんでした。しばらくしてから「再招待」してください",
			staff,
			"REINVITE",
		);
	}
	// 招待が残っていて送れなかった → PENDING のまま、照合で確認する
	// （DB 側を INACTIVE にしない。Clerk 側には招待が残っているため）
	if (outcome.result === "INVITATION_EXISTS") {
		throw await externalFailure(
			"このメールアドレスには招待が残っているため、招待メールを送信できませんでした。Clerk の管理画面で確認してください",
			staff,
			"SYNC",
		);
	}
	// 結果がわからない・Clerk を確認できない → PENDING のまま、照合で確認する
	if (
		outcome.result === "SEND_UNKNOWN" ||
		outcome.result === "RETRY_REQUIRED"
	) {
		throw await externalFailure(
			"招待メールを送信できたか確認できませんでした。招待一覧から「照合」してください",
			staff,
			"SYNC",
		);
	}
	return toResponse(outcome);
}

// ============================================================
// T7：取消・再招待
// ============================================================

// 本システムがこのスタッフ向けに発行した有効な招待を、すべて失効させる
// 「残っていない」ことを確認できたら true（T10 の定期処理でも使う）
export async function revokeOwnInvitations(
	staff: User,
	lock: StaffLock,
): Promise<boolean> {
	lock.ensureCanContinue();
	const found = await findPendingInvitations(staff.email);
	if (found.kind !== "SUCCESS") {
		return false;
	}

	let revokedCount = 0;
	for (const invitation of found.data) {
		if (invitation.staffUserId === staff.id) {
			lock.ensureCanContinue();
			// 1件ずつの結果は見ない（既に失効済みでもエラーになるため）。最後にまとめて確認する
			await revokeInvitation(invitation.id);
			revokedCount = revokedCount + 1;
		}
	}

	// 失効させる招待がなかった
	if (revokedCount === 0) {
		return true;
	}

	// 最新の状態を取り直して、自分の招待が残っていないか確認する
	lock.ensureCanContinue();
	const after = await findPendingInvitations(staff.email);
	if (after.kind !== "SUCCESS") {
		return false;
	}
	for (const invitation of after.data) {
		if (invitation.staffUserId === staff.id) {
			return false;
		}
	}
	return true;
}

// 招待の取消（DELETE /api/staff/invitations/:id）
// PENDING → INACTIVE。INACTIVE・未紐付けなら、Clerk の招待失効だけをやり直す
export async function cancelInvitation(
	id: string,
): Promise<StaffOperationResponse> {
	return withStaffLock(async (lock) => {
		const actor = await requireRole("NURSE");
		let staff = await findStaffOrThrow(id);
		const before = snapshot(staff);

		// 本人が既に登録していた（取消とサインアップが重なった）
		if (staff.status === "ACTIVE") {
			throw invalidState(
				"このスタッフは既に登録済みです。取消ではなく「無効化」してください",
			);
		}
		if (staff.clerkUserId !== null) {
			throw invalidState("このスタッフは取消できる状態ではありません");
		}

		// 1. DB を先に INACTIVE にする（この後に Webhook が来ても ACTIVE に戻さない）
		if (staff.status === "PENDING") {
			lock.ensureCanContinue();
			const updated = await prisma.user.updateMany({
				where: { id, status: "PENDING", clerkUserId: null },
				data: { status: "INACTIVE" },
			});
			if (updated.count === 0) {
				throw invalidState(
					"スタッフの状態が変わったため、取消できませんでした。画面を更新してください",
				);
			}
			staff = await prisma.user.findUniqueOrThrow({ where: { id } });
		}

		// 2. Clerk の招待を失効させる
		const isRevoked = await revokeOwnInvitations(staff, lock);

		logStaffOperation({
			actorId: actor.id,
			targetId: staff.id,
			action: "CANCEL",
			before,
			after: snapshot(staff),
			externalResult: isRevoked ? "SUCCESS" : "UNKNOWN",
		});

		if (!isRevoked) {
			throw await externalFailure(
				"招待の失効を確認できませんでした。「取消処理を再試行」してください",
				staff,
				"RETRY_CANCEL",
			);
		}
		return { staff: await toDto(staff) };
	});
}

// 再招待（POST /api/staff/invitations/:id/reinvite）
// 同じ User 行の項目を更新して PENDING に戻し、照合する。email は変えない
export async function reinviteStaff(
	id: string,
	input: StaffReinviteInput,
): Promise<StaffOperationResponse> {
	return withStaffLock(async (lock) => {
		const actor = await requireRole("NURSE");
		const staff = await findStaffOrThrow(id);
		const before = snapshot(staff);

		if (staff.status !== "INACTIVE" || staff.clerkUserId !== null) {
			throw invalidState(
				"再招待できるのは、招待を取消・失敗したスタッフだけです",
			);
		}

		// 更新する項目。生年月日・入職日・国籍・性別は、入力されたものだけ更新する
		// （再招待フォームでは空欄で表示するので、空欄なら登録済みの値をそのまま使う）
		const data: Prisma.UserUpdateManyMutationInput = {
			role: input.role,
			lastName: input.lastName,
			firstName: input.firstName,
			status: "PENDING",
		};
		if (input.dateOfBirth !== undefined) {
			data.dateOfBirth = toDbDate(input.dateOfBirth);
		}
		if (input.startDate !== undefined) {
			data.startDate = toDbDate(input.startDate);
		}
		if (input.nationality !== undefined) {
			data.nationality = input.nationality;
		}
		if (input.gender !== undefined) {
			data.gender = input.gender;
		}

		lock.ensureCanContinue();
		const updated = await prisma.user.updateMany({
			where: { id, status: "INACTIVE", clerkUserId: null },
			data,
		});
		if (updated.count === 0) {
			throw invalidState(
				"スタッフの状態が変わったため、再招待できませんでした。画面を更新してください",
			);
		}
		const pending = await prisma.user.findUniqueOrThrow({ where: { id } });

		const outcome = await reconcileStaff({
			staff: pending,
			actorId: actor.id,
			lock,
		});
		return finishInvitation(outcome, actor.id, "REINVITE", before, lock);
	});
}

// ============================================================
// T8：ロール変更・無効化・有効化
// ============================================================

// ロール変更（PATCH /api/staff/:id/role）
export async function changeRole(
	id: string,
	newRole: UserRole,
): Promise<StaffOperationResponse> {
	return withStaffLock(async (lock) => {
		const actor = await requireRole("NURSE");

		// 自分のロールは変更できない（他の看護師に依頼する）
		// 画面でも押せないようにしているが、API を直接呼ばれても防ぐ
		if (actor.id === id) {
			throw new ApiError(
				403,
				"FORBIDDEN",
				"自分のロールは変更できません。他の看護師（管理者）に依頼してください",
			);
		}

		const staff = await findStaffOrThrow(id);
		const before = snapshot(staff);

		if (staff.status !== "ACTIVE") {
			throw invalidState("ロールを変更できるのは、利用中のスタッフだけです");
		}
		// 同じロールなら何もしない
		if (staff.role === newRole) {
			return { staff: await toDto(staff) };
		}

		lock.ensureCanContinue();
		// 件数の確認と更新を、同じトランザクションで行う（設計書 6節）
		const changed = await prisma.$transaction(async (tx) => {
			if (staff.role === "NURSE") {
				const nurseCount = await tx.user.count({
					where: { status: "ACTIVE", role: "NURSE" },
				});
				if (nurseCount <= 1) {
					throw new ApiError(
						403,
						"LAST_NURSE",
						"最後の看護師（管理者）は介護士に変更できません",
					);
				}
			}

			const result = await tx.user.updateMany({
				where: { id, status: "ACTIVE", role: staff.role },
				data: { role: newRole },
			});
			if (result.count === 0) {
				throw invalidState(
					"スタッフの状態が変わったため、変更できませんでした。画面を更新してください",
				);
			}
			return tx.user.findUniqueOrThrow({ where: { id } });
		});

		logStaffOperation({
			actorId: actor.id,
			targetId: id,
			action: "CHANGE_ROLE",
			before,
			after: snapshot(changed),
			externalResult: "SKIPPED",
		});
		return { staff: await toDto(changed) };
	});
}

// 無効化（DELETE /api/staff/:id）
// DB だけを INACTIVE にする（Clerk の停止 API は呼ばない）
export async function deactivateStaff(
	id: string,
): Promise<StaffOperationResponse> {
	return withStaffLock(async (lock) => {
		const actor = await requireRole("NURSE");

		// 自分自身は無効化できない（すぐにログインできなくなるため。他の看護師に依頼する）
		// 画面でも押せないようにしているが、API を直接呼ばれても防ぐ
		if (actor.id === id) {
			throw new ApiError(
				403,
				"FORBIDDEN",
				"自分自身は無効化できません。他の看護師（管理者）に依頼してください",
			);
		}

		const staff = await findStaffOrThrow(id);
		const before = snapshot(staff);

		// 既に無効化済み → そのまま 200（何度実行しても同じ結果）
		if (staff.status === "INACTIVE" && staff.clerkUserId !== null) {
			return { staff: await toDto(staff) };
		}
		if (staff.status === "PENDING") {
			throw invalidState(
				"無効化できるのは、利用中のスタッフだけです。登録待ちの場合は「取消」してください",
			);
		}
		if (staff.status !== "ACTIVE") {
			// INACTIVE・未紐付け = 招待を取消済み（既にログインできない状態）
			throw invalidState(
				"このスタッフは招待を取消済みのため、無効化は不要です",
			);
		}

		lock.ensureCanContinue();
		const deactivated = await prisma.$transaction(async (tx) => {
			if (staff.role === "NURSE") {
				const nurseCount = await tx.user.count({
					where: { status: "ACTIVE", role: "NURSE" },
				});
				if (nurseCount <= 1) {
					throw new ApiError(
						403,
						"LAST_NURSE",
						"最後の看護師（管理者）は無効化できません",
					);
				}
			}

			const result = await tx.user.updateMany({
				where: { id, status: "ACTIVE" },
				data: { status: "INACTIVE" },
			});
			if (result.count === 0) {
				throw invalidState(
					"スタッフの状態が変わったため、無効化できませんでした。画面を更新してください",
				);
			}
			return tx.user.findUniqueOrThrow({ where: { id } });
		});

		logStaffOperation({
			actorId: actor.id,
			targetId: id,
			action: "DEACTIVATE",
			before,
			after: snapshot(deactivated),
			externalResult: "SKIPPED",
		});
		return { staff: await toDto(deactivated) };
	});
}

// 有効化（POST /api/staff/:id/activate）
// Clerk アカウントを確認してから ACTIVE に戻す。ロール・プロフィールはそのまま、email は最新にする
export async function activateStaff(
	id: string,
): Promise<StaffOperationResponse> {
	return withStaffLock(async (lock) => {
		const actor = await requireRole("NURSE");
		const staff = await findStaffOrThrow(id);
		const before = snapshot(staff);

		// 既に利用中 → そのまま 200
		if (staff.status === "ACTIVE") {
			return { staff: await toDto(staff) };
		}
		if (staff.status !== "INACTIVE" || staff.clerkUserId === null) {
			throw invalidState("有効化できるのは、利用停止中のスタッフだけです");
		}
		const clerkUserId = staff.clerkUserId;

		// 1. Clerk アカウントが存在して、使える状態か確認する
		lock.ensureCanContinue();
		const result = await getClerkUser(clerkUserId);
		if (result.kind !== "SUCCESS") {
			throw await externalFailure(
				"Clerk のアカウントを確認できませんでした。しばらくしてから、もう一度お試しください",
				staff,
			);
		}
		const account = result.data;
		if (account === null) {
			throw invalidState(
				"Clerk のアカウントが存在しないため、有効化できません",
			);
		}
		if (!account.isUsable) {
			throw invalidState(
				"Clerk のアカウントが停止・ロックされているため、有効化できません",
			);
		}
		if (account.primaryEmail === null || !account.isPrimaryEmailVerified) {
			throw invalidState(
				"Clerk のメールアドレスが確認されていないため、有効化できません",
			);
		}

		// 2. email を最新にする。別のスタッフと重複していれば有効化しない
		const sameEmail = await prisma.user.findUnique({
			where: { email: account.primaryEmail },
		});
		if (sameEmail !== null && sameEmail.id !== staff.id) {
			throw new ApiError(
				409,
				"DUPLICATE",
				"このメールアドレスは別のスタッフが使用しているため、有効化できません",
			);
		}

		// 3. ACTIVE に戻す
		lock.ensureCanContinue();
		const updated = await prisma.user.updateMany({
			where: { id, status: "INACTIVE", clerkUserId },
			data: { status: "ACTIVE", email: account.primaryEmail },
		});
		if (updated.count === 0) {
			throw invalidState(
				"スタッフの状態が変わったため、有効化できませんでした。画面を更新してください",
			);
		}
		const activated = await prisma.user.findUniqueOrThrow({ where: { id } });

		logStaffOperation({
			actorId: actor.id,
			targetId: id,
			action: "ACTIVATE",
			before,
			after: snapshot(activated),
			externalResult: "SUCCESS",
		});
		return { staff: await toDto(activated) };
	});
}
