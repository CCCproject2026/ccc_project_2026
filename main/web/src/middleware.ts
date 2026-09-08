import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
	"/login",
	"/login(.*)",
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
