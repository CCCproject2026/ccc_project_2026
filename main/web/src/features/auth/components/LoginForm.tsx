"use client";

import { Shield } from "lucide-react";
import type { ReactNode } from "react";
import { ClerkSignInCard } from "./ClerkSignInCard";

const isClerkConfigured = Boolean(
	process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

function LoginCard({ children }: { children: ReactNode }) {
	return (
		<div className="rounded-xl bg-white p-10 shadow-[0_24px_64px_rgba(0,0,0,0.3)]">
			<h2 className="mb-2 text-h2 font-bold text-primary-dark">ログイン</h2>
			<p className="mb-7 text-sm text-gray-500">
				ご登録のアカウントでサインインしてください
			</p>
			{children}
		</div>
	);
}

function PreviewLoginForm() {
	return (
		<LoginCard>
			<div className="mb-5 flex items-center gap-2 rounded-lg border border-border-alarm bg-alarm-bg px-[14px] py-[10px] text-[13px] text-alarm">
				<Shield size={15} />
				<span>
					プレビューモード: Clerkキーを <code>.env</code>{" "}
					に設定すると実際のサインインが有効になります。
				</span>
			</div>

			<form>
				<div className="mb-5">
					<label
						htmlFor="preview-email"
						className="mb-2 block text-sm font-medium text-gray-700"
					>
						メールアドレス
					</label>
					<input
						id="preview-email"
						type="email"
						placeholder="example@care.jp"
						disabled
						className="w-full cursor-not-allowed rounded-md border-border bg-surface px-[14px] py-[11px] text-[15px] text-gray-400 outline-none opacity-80"
					/>
				</div>

				<div className="mb-6">
					<label
						htmlFor="preview-password"
						className="mb-2 block text-sm font-medium text-gray-700"
					>
						パスワード
					</label>
					<input
						id="preview-password"
						type="password"
						placeholder="••••••••"
						disabled
						className="w-full cursor-not-allowed rounded-md border-border bg-surface px-[14px] py-[11px] text-[15px] text-gray-400 outline-none opacity-80"
					/>
				</div>

				<button
					type="button"
					disabled
					className="w-full cursor-not-allowed rounded-md bg-primary-bg p-[13px] text-[15px] font-semibold tracking-[0.01em] text-white"
				>
					ログイン
				</button>
			</form>
		</LoginCard>
	);
}

export function LoginForm() {
	if (!isClerkConfigured) {
		return <PreviewLoginForm />;
	}

	return <ClerkSignInCard />;
}
