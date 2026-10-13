import "server-only";
import type { User } from "@prisma/client";
import type { StaffInviteInput } from "@/features/staff-management/schemas/staff-input";
import { toDbDate } from "@/shared/lib/date";
import { prisma } from "@/shared/lib/prisma";
import {
	type ClerkStaffUser,
	createClerkUserWithPassword,
	findClerkUsersByEmail,
} from "./clerk-admin";
import { withStaffLock } from "./staff-lock";

// 開発用：最初の NURSE を作る（T11・設計書 9節）
//
// - 本番では実行しない（呼び出し側のスクリプトでも確認する）
// - ACTIVE な NURSE が既にいれば何もしない
// - 途中で失敗して残った「同じ email の DB 行・Clerk アカウント」だけを再利用する
// - 別の User に紐付いた Clerk アカウントや、既存行の紐付けは上書きしない
//
// 問題があれば BootstrapError を投げる（メッセージをそのまま画面に出してよい）
export class BootstrapError extends Error {}

export type BootstrapResult = {
	staff: User;
	isClerkUserCreated: boolean; // 今回 Clerk アカウントを新しく作ったか
};

export async function bootstrapNurse(
	input: StaffInviteInput & { password: string },
): Promise<BootstrapResult> {
	return withStaffLock(async (lock) => {
		// 1. ACTIVE な NURSE が既にいれば、何もしない
		const nurseCount = await prisma.user.count({
			where: { status: "ACTIVE", role: "NURSE" },
		});
		if (nurseCount > 0) {
			throw new BootstrapError(
				"ACTIVE な NURSE が既にいるため、作成しませんでした",
			);
		}

		// 2. 同じ email の DB 行（途中で失敗して残ったもの）
		const existingRow = await prisma.user.findUnique({
			where: { email: input.email },
		});

		// 3. 同じ email の Clerk アカウントを探す。なければ作る
		lock.ensureCanContinue();
		const found = await findClerkUsersByEmail(input.email);
		if (found.kind !== "SUCCESS") {
			throw new BootstrapError(
				"Clerk を確認できませんでした。しばらくしてから再実行してください",
			);
		}
		if (found.data.length > 1) {
			throw new BootstrapError(
				"同じ email の Clerk アカウントが複数あります。Clerk の管理画面で確認してください",
			);
		}

		let clerkUser: ClerkStaffUser;
		let isClerkUserCreated = false;

		if (found.data.length === 1) {
			// 既存の Clerk アカウントを再利用する（確認済みの primary email が一致すること）
			clerkUser = found.data[0];
			checkReusableClerkUser(clerkUser, input.email);
		} else {
			lock.ensureCanContinue();
			const created = await createClerkUserWithPassword({
				email: input.email,
				password: input.password,
				lastName: input.lastName,
				firstName: input.firstName,
			});
			if (created.kind !== "SUCCESS") {
				// 作られたかどうか不明な場合もある。再実行すれば、作られていれば再利用される
				throw new BootstrapError(
					"Clerk アカウントを作成できませんでした。再実行してください（パスワードが弱すぎる場合も失敗します）",
				);
			}
			clerkUser = created.data;
			isClerkUserCreated = true;
		}

		// 4. その Clerk アカウントが、別の User に紐付いていないか
		const linkedRow = await prisma.user.findUnique({
			where: { clerkUserId: clerkUser.id },
		});
		if (linkedRow !== null && linkedRow.email !== input.email) {
			throw new BootstrapError(
				"この Clerk アカウントは、別のスタッフに紐付いています",
			);
		}

		// 5. DB に ACTIVE な NURSE として保存する
		const profile = {
			role: "NURSE" as const,
			status: "ACTIVE" as const,
			lastName: input.lastName,
			firstName: input.firstName,
			dateOfBirth: toDbDate(input.dateOfBirth),
			startDate: toDbDate(input.startDate),
			nationality: input.nationality,
			gender: input.gender,
		};

		lock.ensureCanContinue();
		let staff: User;
		if (existingRow === null) {
			staff = await prisma.user.create({
				data: { ...profile, email: input.email, clerkUserId: clerkUser.id },
			});
		} else {
			// 既存行の紐付けは上書きしない（別の Clerk アカウントに紐付いていたら止める）
			if (
				existingRow.clerkUserId !== null &&
				existingRow.clerkUserId !== clerkUser.id
			) {
				throw new BootstrapError(
					"同じ email の DB 行が、別の Clerk アカウントに紐付いています",
				);
			}
			staff = await prisma.user.update({
				where: { id: existingRow.id },
				data: { ...profile, clerkUserId: clerkUser.id },
			});
		}

		return { staff, isClerkUserCreated };
	});
}

// 再利用してよい Clerk アカウントか確認する
function checkReusableClerkUser(clerkUser: ClerkStaffUser, email: string) {
	if (!clerkUser.isPrimaryEmailVerified || clerkUser.primaryEmail !== email) {
		throw new BootstrapError(
			"Clerk アカウントの確認済みメールアドレスが一致しません",
		);
	}
	if (!clerkUser.isUsable) {
		throw new BootstrapError("Clerk アカウントが停止・ロックされています");
	}
}
