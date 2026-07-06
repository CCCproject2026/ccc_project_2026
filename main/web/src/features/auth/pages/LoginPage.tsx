import { BrandHeader } from "../components/BrandHeader";
import { LoginForm } from "../components/LoginForm";

export function LoginPage() {
	return (
		<main className="relative flex min-h-screen items-center justify-center bg-sidebar-bg px-6 py-8">
			<div className="relative w-full max-w-[440px]">
				<BrandHeader />
				<LoginForm />
				<p className="mt-6 text-center text-xs text-primary-bg/50">
					© 2026 転倒予防支援システム — Powered by AI & IoT
				</p>
			</div>
		</main>
	);
}
