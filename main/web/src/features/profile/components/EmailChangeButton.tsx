"use client";

import { useClerk } from "@clerk/nextjs";

// メールアドレスの「変更」ボタン
// メールアドレスの正は Clerk なので、DB は直接書き換えず Clerk のアカウント画面を開く
// Clerk で変更すると、Webhook（user.updated）で DB にも反映される
export function EmailChangeButton() {
	const clerk = useClerk();

	return (
		<button
			type="button"
			onClick={() => clerk.openUserProfile()}
			className="shrink-0 px-3 py-1.5 text-xs font-bold text-[#7c3aed] bg-purple-50 hover:bg-purple-100 rounded-lg transition"
		>
			変更
		</button>
	);
}
