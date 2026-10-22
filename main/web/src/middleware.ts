import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
	SIGN_IN_URL,
	SIGN_UP_URL,
} from "@/features/auth/constants/auth.constant";

const isPublicRoute = createRouteMatcher([
	"/login",
	"/login(.*)",
	// 招待メールのリンクから開くパスワード設定ページ（まだログインしていない人が使う）
	"/sign-up",
	"/sign-up(.*)",
	"/api/webhooks(.*)",
	// スタッフ管理 API は、各ハンドラーが requireRole で認証・認可をする
	// ここで auth.protect() を通すと、未ログインの API 呼び出しが 401 ではなく 404 になり、
	// 画面で「ログインしてください」と案内できないため、middleware では止めない
	"/api/staff(.*)",
]);

export default clerkMiddleware(
	async (auth, req) => {
		if (!isPublicRoute(req)) {
			await auth.protect();
		}
	},
	{
		// サインイン・サインアップの送り先を、このアプリの画面にする
		// （指定しないと Clerk 自身のページに飛んでしまう）
		signInUrl: SIGN_IN_URL,
		signUpUrl: SIGN_UP_URL,
	},
);

export const config = {
	matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
