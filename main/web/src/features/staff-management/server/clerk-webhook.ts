import "server-only";
import type { User } from "@prisma/client";
import { ApiError } from "@/shared/lib/api-error";
import { notifyOps } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { logStaffOperation } from "./audit";
import { type ClerkStaffUser, getClerkUser } from "./clerk-admin";
import { decideLink, linkStaff } from "./reconcile";
import { type StaffLock, withStaffLock } from "./staff-lock";

// ログイン中の本人について、Webhook と同じ同期を行う
// 招待から登録した直後は、Webhook が遅れる（ローカルでは届かない）ことがあるため、
// 本人がログインした時にも同じ紐付けの確認を1回行う。紐付け条件は Webhook と同じ。
// ACTIVE になったら true
//
// このページは何度でも開けるので、紐付けの見込みがない人ではロックを取らない
// （ロックを取ると、NURSE の操作や Webhook を待たせてしまうため）
export async function syncSignedInUser(clerkUserId: string): Promise<boolean> {
	// 呼び出し元のページにはエラー画面がないため、DB の読み取りも含めてすべて try の中で行う
	// （DB の一時的な失敗で 500 画面にしない）
	try {
		// 1. ロックを取る前に、紐付けの見込みがあるかだけ確認する（DB は更新しない）
		const isLinkable = await canAutoLinkLater(clerkUserId);
		if (!isLinkable) {
			return false;
		}

		// 2. ロックを取って、Webhook と同じ同期を行う
		await withStaffLock(async (lock) => {
			await syncClerkUser(clerkUserId, lock);
		});

		// 3. ACTIVE になったかを確認する
		const staff = await prisma.user.findUnique({
			where: { clerkUserId },
			select: { status: true },
		});
		return staff !== null && staff.status === "ACTIVE";
	} catch (error) {
		// 想定内：Clerk に届かない・ロックが取れない・時間切れ（どれも 503）
		// 画面では「登録が完了していません」のまま。次に開いたときに、もう一度試す
		if (error instanceof ApiError && error.status === 503) {
			return false;
		}
		// 想定外（DB の障害・実装のバグなど）は、握りつぶさずに記録する
		// 個人情報を含む可能性があるため、メッセージ本文は出さない
		notifyOps("SIGNED_IN_SYNC_FAILED", {
			reason: error instanceof Error ? error.name : typeof error,
		});
		return false;
	}
}

// 本システムの招待から作られたアカウントで、相手のスタッフがまだ PENDING・未紐付けなら true
// ロックの外で読むだけなので、ここで true でも、ロックの中で条件をもう一度確認する
async function canAutoLinkLater(clerkUserId: string): Promise<boolean> {
	const result = await getClerkUser(clerkUserId);
	// Clerk に届かない → 今回はあきらめる（次に開いたときに、もう一度試す）
	if (result.kind !== "SUCCESS") {
		return false;
	}
	const clerkUser = result.data;
	// 削除済み、または本システムの招待から作られたアカウントではない
	if (clerkUser === null || clerkUser.staffUserId === null) {
		return false;
	}

	const staff = await prisma.user.findUnique({
		where: { id: clerkUser.staffUserId },
		select: { status: true, clerkUserId: true },
	});
	return (
		staff !== null && staff.status === "PENDING" && staff.clerkUserId === null
	);
}

// Clerk の user.created / user.updated を受け取ったときの処理（T9）
// 呼び出し側でロックを取ってから呼ぶこと
//
// 古いイベントの値で上書きしないよう、イベントの中身ではなく
// ロックを取った後に Clerk から最新の情報を取り直して使う（設計書 7節）
export async function syncClerkUser(
	clerkUserId: string,
	lock: StaffLock,
): Promise<void> {
	// 1. Clerk から最新の情報を取る
	lock.ensureCanContinue();
	const result = await getClerkUser(clerkUserId);
	if (result.kind !== "SUCCESS") {
		// 5xx を返して、Clerk に再送してもらう
		throw new ApiError(
			503,
			"TEMPORARILY_UNAVAILABLE",
			"Clerk からユーザー情報を取得できませんでした",
		);
	}
	const clerkUser = result.data;

	// 既に削除されたアカウント → 何もしない
	if (clerkUser === null) {
		return;
	}

	// 2. 既に紐付いているスタッフがいれば、email を同期する
	const linkedStaff = await prisma.user.findUnique({
		where: { clerkUserId },
	});
	if (linkedStaff !== null) {
		await syncEmail(linkedStaff, clerkUser, lock);
		return;
	}

	// 3. まだ紐付いていなければ、自動紐付けの条件を確認する
	await tryAutoLink(clerkUser, lock);
}

// Clerk の user.deleted を受け取ったときの処理
// 呼び出し側でロックを取ってから呼ぶこと
//
// Clerk のダッシュボードでアカウントが削除されると、その人はもうログインできない。
// DB の User は物理削除しない（設計書）ので、INACTIVE・未紐付けにする。
// こうしておくと、同じ人が戻ってきたときに NURSE が画面から「再招待」できる。
// （紐付けたままだと、「有効化」は Clerk アカウントがないので失敗し、
//   「再招待」は紐付け済みなので受け付けず、画面から直せなくなる）
export async function unlinkDeletedClerkUser(
	clerkUserId: string,
	lock: StaffLock,
): Promise<void> {
	// 1. 本当に削除されたかを Clerk に確認する（古いイベントや偽のイベントで外さないため）
	lock.ensureCanContinue();
	const result = await getClerkUser(clerkUserId);
	if (result.kind !== "SUCCESS") {
		// 5xx を返して、Clerk に再送してもらう
		throw new ApiError(
			503,
			"TEMPORARILY_UNAVAILABLE",
			"Clerk からユーザー情報を取得できませんでした",
		);
	}
	// まだアカウントがある → 何もしない
	if (result.data !== null) {
		return;
	}

	// 2. 紐付いているスタッフを探す。いなければ何もしない（再送されたときも、ここで終わる）
	const staff = await prisma.user.findUnique({
		where: { clerkUserId },
	});
	if (staff === null) {
		return;
	}

	// 3. INACTIVE・未紐付けにする。role・プロフィール・email はそのまま残す
	lock.ensureCanContinue();
	const updated = await prisma.user.updateMany({
		where: { id: staff.id, clerkUserId },
		data: { status: "INACTIVE", clerkUserId: null },
	});
	// 0件 = 途中で別の操作が先に変えた → 何もしない
	if (updated.count === 0) {
		return;
	}

	logStaffOperation({
		actorId: null,
		targetId: staff.id,
		action: "CLERK_USER_DELETED",
		before: { status: staff.status, role: staff.role },
		after: { status: "INACTIVE", role: staff.role },
		externalResult: "SKIPPED",
	});

	// 4. 利用中の NURSE がいなくなったら、担当者に知らせる
	// Clerk 側で既に削除されているので、ここで止めることはできない
	if (staff.status === "ACTIVE" && staff.role === "NURSE") {
		const nurseCount = await prisma.user.count({
			where: { status: "ACTIVE", role: "NURSE" },
		});
		if (nurseCount === 0) {
			notifyOps("LAST_NURSE_DELETED", {
				targetId: staff.id,
				reason:
					"Clerk で最後の看護師（管理者）のアカウントが削除されました。bootstrap-nurse で復旧してください",
			});
		}
	}
}

// 紐付け済みスタッフの email を、Clerk の最新の email にそろえる
// role・status は変えない（INACTIVE を ACTIVE に戻したりしない）
async function syncEmail(
	staff: User,
	clerkUser: ClerkStaffUser,
	lock: StaffLock,
): Promise<void> {
	// 確認済みの primary email だけを使う
	if (clerkUser.primaryEmail === null || !clerkUser.isPrimaryEmailVerified) {
		return;
	}
	// 変わっていなければ何もしない
	if (clerkUser.primaryEmail === staff.email) {
		return;
	}

	// 別のスタッフが同じ email を使っている → 更新しない。担当者に知らせる（設計書 7節）
	const sameEmail = await prisma.user.findUnique({
		where: { email: clerkUser.primaryEmail },
		select: { id: true },
	});
	if (sameEmail !== null && sameEmail.id !== staff.id) {
		notifyOps("EMAIL_CONFLICT", {
			targetId: staff.id,
			reason:
				"Clerk の email が別のスタッフと重複しているため、DB の email を更新しませんでした",
		});
		return;
	}

	lock.ensureCanContinue();
	await prisma.user.updateMany({
		where: { id: staff.id, clerkUserId: staff.clerkUserId },
		data: { email: clerkUser.primaryEmail },
	});

	logStaffOperation({
		actorId: null,
		targetId: staff.id,
		action: "EMAIL_SYNC",
		externalResult: "SKIPPED",
	});
}

// 本システムの招待から作られたアカウントなら、PENDING のスタッフに紐付けて ACTIVE にする
async function tryAutoLink(
	clerkUser: ClerkStaffUser,
	lock: StaffLock,
): Promise<void> {
	// 本システムの招待から作られたアカウントでなければ何もしない
	if (clerkUser.staffUserId === null) {
		return;
	}

	const staff = await prisma.user.findUnique({
		where: { id: clerkUser.staffUserId },
	});
	// 対象がいない → 新しい User は作らない
	if (staff === null) {
		return;
	}
	// PENDING・未紐付けのときだけ。取消済み（INACTIVE）は ACTIVE に戻さない
	if (staff.status !== "PENDING" || staff.clerkUserId !== null) {
		return;
	}

	// このアカウントはどのスタッフにも紐付いていない（syncClerkUser で確認済み）
	const decision = decideLink(staff, clerkUser, null);
	if (decision.kind !== "AUTO_LINK") {
		// 自動では紐付けない。NURSE が画面から「照合」する
		return;
	}

	try {
		const linked = await linkStaff(staff, clerkUser, lock);
		logStaffOperation({
			actorId: null,
			targetId: linked.id,
			action: "WEBHOOK_LINK",
			before: { status: staff.status, role: staff.role },
			after: { status: linked.status, role: linked.role },
			externalResult: "SUCCESS",
		});
	} catch (error) {
		// 途中で状態が変わった（409）→ 何もしない。それ以外は再送してもらう
		if (error instanceof ApiError && error.status === 409) {
			return;
		}
		throw error;
	}
}
