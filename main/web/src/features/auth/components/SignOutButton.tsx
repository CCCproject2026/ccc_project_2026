"use client";

import { useClerk } from "@clerk/nextjs";

// 案内ページ用のログアウトボタン（ログイン画面のボタンと同じデザイン）
// （サイドバーのボタンは暗い背景用のデザインなので、別に用意する）
export function SignOutButton() {
	const { signOut } = useClerk();

	return (
		<button
			type="button"
			onClick={() => signOut({ redirectUrl: "/login" })}
			className="w-full cursor-pointer rounded-[10px] bg-[#7C3AED] p-[13px] text-[15px] font-semibold tracking-[0.01em] text-white transition-colors hover:bg-[#6D28D9]"
		>
			ログアウト
		</button>
	);
}
