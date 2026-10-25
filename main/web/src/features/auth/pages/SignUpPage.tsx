import Link from "next/link";
import { BrandHeader } from "../components/BrandHeader";
import { SetPasswordForm } from "../components/SetPasswordForm";

// 招待メールのリンクから開く、パスワード設定ページ（/sign-up）
// デザインはログイン画面と同じ
interface SignUpPageProps {
	ticket: string | null; // 招待チケット（__clerk_ticket）
	clerkStatus: string | null; // Clerk が付ける状態（__clerk_status）
}

export function SignUpPage({ ticket, clerkStatus }: SignUpPageProps) {
	return (
		<main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#1E0F4E_0%,#3B1F8C_50%,#5B21B6_100%)] px-6 py-8">
			<div className="pointer-events-none absolute top-[10%] left-[5%] h-80 w-80 rounded-full bg-[rgba(139,92,246,0.15)]" />
			<div className="pointer-events-none absolute right-[8%] bottom-[15%] h-60 w-60 rounded-full bg-[rgba(167,139,250,0.1)]" />

			<div className="relative w-full max-w-[440px]">
				<BrandHeader />

				<div className="rounded-[20px] bg-white p-10 shadow-[0_24px_64px_rgba(0,0,0,0.3)]">
					<SignUpContent ticket={ticket} clerkStatus={clerkStatus} />
				</div>

				<p className="mt-6 text-center text-xs text-[#EDE9FE]/50">
					© 2026 転倒予防支援システム — Powered by AI & IoT
				</p>
			</div>
		</main>
	);
}

// 状態ごとに、カードの中身を変える
function SignUpContent({ ticket, clerkStatus }: SignUpPageProps) {
	// 既にアカウントがある人への招待 → ログインしてもらう
	if (clerkStatus === "sign_in" || clerkStatus === "complete") {
		return (
			<MessageCard
				title="アカウントは登録済みです"
				message="このメールアドレスのアカウントは既にあります。ログイン画面からログインしてください。"
			/>
		);
	}

	// 招待チケットがない → 招待メールのリンクから開いていない
	if (ticket === null) {
		return (
			<MessageCard
				title="招待リンクが正しくありません"
				message="招待メールに書かれているリンクから、もう一度開いてください。"
			/>
		);
	}

	return (
		<>
			<h2 className="mb-2 text-[20px] font-bold text-[#111827]">
				パスワードの設定
			</h2>
			<p className="mb-7 text-sm text-[#6B7280]">
				招待ありがとうございます。ログインに使うパスワードを決めてください。
			</p>
			<SetPasswordForm ticket={ticket} />
		</>
	);
}

// メッセージ ＋ ログイン画面へのリンク
function MessageCard({ title, message }: { title: string; message: string }) {
	return (
		<>
			<h2 className="mb-3 text-[20px] font-bold text-[#111827]">{title}</h2>
			<p className="mb-7 text-sm leading-relaxed text-[#6B7280]">{message}</p>
			<Link
				href="/login"
				className="block w-full rounded-[10px] bg-[#7C3AED] p-[13px] text-center text-[15px] font-semibold text-white transition-colors hover:bg-[#6D28D9]"
			>
				ログイン画面へ
			</Link>
		</>
	);
}
