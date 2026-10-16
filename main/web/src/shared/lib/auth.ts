import "server-only";
import { auth } from "@clerk/nextjs/server";
import type { User, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { ApiError } from "./api-error";
import { prisma } from "./prisma";

// ログイン中の人を DB から探す
// ロールや利用状態はすぐ変わることがあるので、キャッシュせず毎回 DB を見る
export async function getLoginUser(): Promise<{
	isSignedIn: boolean;
	clerkUserId: string | null; // ログイン中の Clerk ユーザー ID
	user: User | null;
}> {
	const { userId } = await auth();

	// Clerk にログインしていない
	if (!userId) {
		return { isSignedIn: false, clerkUserId: null, user: null };
	}

	// Clerk の ID で DB の User を探す（見つからなければ null）
	const user = await prisma.user.findUnique({
		where: { clerkUserId: userId },
	});
	return { isSignedIn: true, clerkUserId: userId, user };
}

// ===== API 用（エラーを投げて、errorResponse で 401 / 403 を返す） =====

// ACTIVE なスタッフだけ通す
export async function requireStaff(): Promise<User> {
	const { isSignedIn, user } = await getLoginUser();

	if (!isSignedIn) {
		throw new ApiError(401, "UNAUTHENTICATED", "ログインしてください");
	}
	if (user === null || user.status !== "ACTIVE") {
		throw new ApiError(403, "FORBIDDEN", "このアカウントは利用できません");
	}
	return user;
}

// ACTIVE で、かつ指定したロールの人だけ通す
export async function requireRole(role: UserRole): Promise<User> {
	const user = await requireStaff();

	if (user.role !== role) {
		throw new ApiError(403, "FORBIDDEN", "この操作を行う権限がありません");
	}
	return user;
}

// ===== ページ用（エラーではなく、別のページへ移動させる） =====
// 注意: redirect() は特別なエラーを投げて動くので、try / catch の中で呼ばないこと

// ACTIVE なスタッフだけ通す。それ以外は案内ページへ
export async function requireStaffPage(): Promise<User> {
	const { isSignedIn, user } = await getLoginUser();

	if (!isSignedIn) {
		redirect("/login");
	}
	if (user === null || user.status !== "ACTIVE") {
		redirect("/account-status");
	}
	return user;
}

// ACTIVE で、かつ指定したロールの人だけ通す。ロールが違う人はダッシュボードへ
export async function requireRolePage(role: UserRole): Promise<User> {
	const user = await requireStaffPage();

	if (user.role !== role) {
		redirect("/dashboard");
	}
	return user;
}
