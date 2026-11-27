import { SignUpPage } from "@/features/auth/pages/SignUpPage";

// 招待メールのリンクから開くページ（ログイン不要）
// Clerk がリンクに __clerk_ticket（招待チケット）と __clerk_status を付ける
export default async function SignUpRoute({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const params = await searchParams;

	// 1つの値だけを取り出す（配列や未設定なら null）
	let ticket: string | null = null;
	if (typeof params.__clerk_ticket === "string") {
		ticket = params.__clerk_ticket;
	}
	let clerkStatus: string | null = null;
	if (typeof params.__clerk_status === "string") {
		clerkStatus = params.__clerk_status;
	}

	return <SignUpPage ticket={ticket} clerkStatus={clerkStatus} />;
}
