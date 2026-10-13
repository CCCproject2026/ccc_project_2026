import { Clock, PauseCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { BrandHeader } from "@/features/auth/components/BrandHeader";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { getLoginUser } from "@/shared/lib/auth";

// ログインはしているが、システムを使えない人に見せるページ
// 業務データ（入居者・アラームなど）は絶対に表示しない
// デザインはログイン画面と同じ（背景・ロゴ・白いカード）
export default async function AccountStatusPage() {
	const { isSignedIn, user } = await getLoginUser();

	if (!isSignedIn) {
		redirect("/login");
	}
	// 使える人がこのページに来たら、ダッシュボードへ戻す
	if (user !== null && user.status === "ACTIVE") {
		redirect("/dashboard");
	}

	// 利用停止中かどうか
	// PENDING の人はまだ clerkUserId が DB に入っていないので、user が null になり「登録が完了していません」になる
	const isInactive = user !== null && user.status === "INACTIVE";

	// 表示する文とアイコンを状態ごとに決める
	let title = "登録が完了していません";
	let message =
		"アカウントの登録処理がまだ完了していません。しばらく待ってから、もう一度ログインしてください。";
	let icon = <Clock size={28} className="text-[#7C3AED]" />;
	let iconBackground = "bg-[#EDE9FE]";

	if (isInactive) {
		title = "このアカウントは利用停止中です";
		message = "現在、このアカウントではシステムを利用できません。";
		icon = <PauseCircle size={28} className="text-[#DC2626]" />;
		iconBackground = "bg-[#FEF2F2]";
	}

	return (
		<main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#1E0F4E_0%,#3B1F8C_50%,#5B21B6_100%)] px-6 py-8">
			{/* ログイン画面と同じ背景の丸い飾り */}
			<div className="pointer-events-none absolute top-[10%] left-[5%] h-80 w-80 rounded-full bg-[rgba(139,92,246,0.15)]" />
			<div className="pointer-events-none absolute right-[8%] bottom-[15%] h-60 w-60 rounded-full bg-[rgba(167,139,250,0.1)]" />

			{/* 注意: max-w-md は globals.css の --spacing-md(12px) になってしまうので、px で指定する */}
			<div className="relative w-full max-w-[440px]">
				<BrandHeader />

				<div className="rounded-[20px] bg-white p-10 text-center shadow-[0_24px_64px_rgba(0,0,0,0.3)]">
					<div
						className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${iconBackground}`}
					>
						{icon}
					</div>

					<h2 className="mb-3 text-[20px] font-bold text-[#111827]">{title}</h2>
					<p className="mb-2 text-sm leading-relaxed text-[#6B7280]">
						{message}
					</p>
					<p className="mb-8 text-sm leading-relaxed text-[#6B7280]">
						お困りの場合は、管理者（看護師）に連絡してください。
					</p>

					<SignOutButton />
				</div>

				<p className="mt-6 text-center text-xs text-[#EDE9FE]/50">
					© 2026 転倒予防支援システム — Powered by AI & IoT
				</p>
			</div>
		</main>
	);
}
