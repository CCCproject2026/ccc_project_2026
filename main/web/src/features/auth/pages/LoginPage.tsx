import { BrandHeader } from "../components/BrandHeader";
import { LoginForm } from "../components/LoginForm";

export function LoginPage() {
	return (
		<main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#1E0F4E_0%,#3B1F8C_50%,#5B21B6_100%)] px-6 py-8">
			<div className="pointer-events-none absolute top-[10%] left-[5%] h-80 w-80 rounded-full bg-[rgba(139,92,246,0.15)]" />
			<div className="pointer-events-none absolute right-[8%] bottom-[15%] h-60 w-60 rounded-full bg-[rgba(167,139,250,0.1)]" />

			<div className="relative w-full max-w-[440px]">
				<BrandHeader />
				<LoginForm />
				<p className="mt-6 text-center text-xs text-[#EDE9FE]/50">
					© 2026 転倒予防支援システム — Powered by AI & IoT
				</p>
			</div>
		</main>
	);
}
