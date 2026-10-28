"use client";

import { useUser } from "@clerk/nextjs";

// メールアドレスの横に出す「認証済み / 未認証」のバッジ
// 認証の状態は Clerk だけが持っているので、Clerk の主メールアドレスを見る
export function EmailVerifiedBadge() {
	const { isLoaded, user } = useUser();

	// 読み込み中や主メールアドレスがないときは、何も出さない
	if (!isLoaded || !user || user.primaryEmailAddress === null) {
		return null;
	}

	const isVerified =
		user.primaryEmailAddress.verification.status === "verified";

	if (isVerified) {
		return (
			<span className="ml-2 align-middle bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded-md">
			認証済み
			</span>
		);
	}

	return (
		<span className="ml-2 align-middle bg-amber-50 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded-md">
			未認証
		</span>
	);
}
