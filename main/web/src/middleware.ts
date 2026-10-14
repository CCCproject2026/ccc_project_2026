import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
	"/login",
	"/login(.*)",
	// 招待メールのリンクから開くパスワード設定ページ（まだログインしていない人が使う）
	"/sign-up",
	"/sign-up(.*)",
	"/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
	if (!isPublicRoute(req)) {
		await auth.protect();
	}
});

export const config = {
	matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
