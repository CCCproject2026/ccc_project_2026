"use client";

import { useClerk } from "@clerk/nextjs";
import { HiOutlineCog6Tooth } from "react-icons/hi2";

// 「アカウント情報を変更」ボタン
// 写真・メールアドレス・パスワード / 2段階認証・ログイン中の端末は、どれも正が Clerk なので
// DB は直接書き換えず、Clerk のアカウント画面（モーダル）を1つ開くだけにしている
// メールアドレスを変えた場合は、Webhook（user.updated）で DB にも反映される
export function AccountSettingsButton() {
	const clerk = useClerk();

	return (
		<button
			type="button"
			onClick={() => clerk.openUserProfile()}
			className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#7c3aed] bg-purple-50 hover:bg-purple-100 rounded-lg transition"
		>
			<HiOutlineCog6Tooth className="text-base" />
			アカウント情報を変更
		</button>
	);
}
