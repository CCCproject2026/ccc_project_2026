"use client";

import { useSignIn } from "@clerk/nextjs";
import { Eye, EyeOff, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState } from "react";
import { DemoCredentialsHint } from "./DemoCredentialsHint";

const isClerkConfigured = Boolean(
	process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

type SignInCreateResult = {
	status: string;
	createdSessionId?: string | null;
};

interface ClerkSignIn {
	create: (params: { identifier: string; password: string }) => Promise<SignInCreateResult>;
}

interface ClerkSignInResult {
	isLoaded: boolean;
	signIn: ClerkSignIn | undefined;
	setActive: ((params: { session: string | null }) => Promise<void>) | undefined;
}

function LoginCard({ children }: { children: ReactNode }) {
	return (
		<div className="rounded-[20px] bg-white p-10 shadow-[0_24px_64px_rgba(0,0,0,0.3)]">
			<h2 className="mb-2 text-[20px] font-bold text-[#111827]">ログイン</h2>
			<p className="mb-7 text-sm text-[#6B7280]">
				ご登録のアカウントでサインインしてください
			</p>
			{children}
			<DemoCredentialsHint />
		</div>
	);
}

function ClerkLoginForm() {
	const { isLoaded, signIn, setActive } = useSignIn() as unknown as ClerkSignInResult;
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	const parseClerkError = (error: unknown) => {
		if (
			typeof error === "object" &&
			error !== null &&
			"errors" in error &&
			Array.isArray(error.errors)
		) {
			const firstError = error.errors[0];
			if (typeof firstError?.longMessage === "string") {
				return firstError.longMessage;
			}
			if (typeof firstError?.message === "string") {
				return firstError.message;
			}
			if (typeof firstError?.code === "string") {
				return `Sign-in failed (${firstError.code}).`;
			}
		}
		return "メールアドレスまたはパスワードが正しくありません。";
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!isLoaded || !signIn) {
			// Dev mode fallback to allow testing the login UI flow when Clerk is loading/blocked
			if (process.env.NODE_ENV === "development") {
				setErrorMessage("");
				setIsSubmitting(true);
				await new Promise((resolve) => setTimeout(resolve, 1000));
				router.push("/dashboard");
				return;
			}
			setErrorMessage("Authentication is still loading. Please wait a moment.");
			return;
		}

		setErrorMessage("");
		setIsSubmitting(true);

		try {
			const result = (await signIn.create({
				identifier: email,
				password,
			})) as SignInCreateResult;

			if (result.status === "complete") {
				await setActive?.({ session: result.createdSessionId ?? null });
				router.push("/dashboard");
				return;
			}

			if (result.status === "needs_second_factor") {
				setErrorMessage(
					"This account requires an additional verification step (2FA).",
				);
				return;
			}

			setErrorMessage(
				`ログインを完了できませんでした。 (status: ${result.status})`,
			);
		} catch (error: unknown) {
			setErrorMessage(parseClerkError(error));
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<LoginCard>
			<form onSubmit={handleSubmit}>
				<div className="mb-5">
					<label
						htmlFor="email"
						className="mb-2 block text-sm font-medium text-[#374151]"
					>
						メールアドレス
					</label>
					<input
						id="email"
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						placeholder="example@care.jp"
						required
						disabled={isSubmitting}
						className="w-full rounded-[10px] border-[1.5px] border-[#E5E7EB] bg-[#FAFAFA] px-[14px] py-[11px] text-[15px] text-[#111827] outline-none transition-colors focus:border-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-70"
					/>
				</div>

				<div className="mb-6">
					<label
						htmlFor="password"
						className="mb-2 block text-sm font-medium text-[#374151]"
					>
						パスワード
					</label>
					<div className="relative">
						<input
							id="password"
							type={showPassword ? "text" : "password"}
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							placeholder="••••••••"
							required
							disabled={isSubmitting}
							className="w-full rounded-[10px] border-[1.5px] border-[#E5E7EB] bg-[#FAFAFA] px-[14px] py-[11px] pr-11 text-[15px] text-[#111827] outline-none transition-colors focus:border-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-70"
						/>
						<button
							type="button"
							onClick={() => setShowPassword((prev) => !prev)}
							disabled={isSubmitting}
							className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center p-1 text-[#9CA3AF] disabled:cursor-not-allowed"
							aria-label={
								showPassword
									? "パスワードを非表示にする"
									: "パスワードを表示する"
							}
						>
							{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
						</button>
					</div>
				</div>

				{errorMessage ? (
					<div className="mb-5 flex items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-[14px] py-[10px] text-[13px] text-[#DC2626]">
						<Shield size={15} />
						<span>{errorMessage}</span>
					</div>
				) : null}

				<button
					type="submit"
					disabled={
						isSubmitting ||
						(!isLoaded && !signIn && process.env.NODE_ENV !== "development")
					}
					className="w-full cursor-pointer rounded-[10px] bg-[#7C3AED] p-[13px] text-[15px] font-semibold text-white tracking-[0.01em] transition-colors hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:bg-[#A78BFA]"
				>
					{isSubmitting ? "ログイン中..." : "ログイン"}
				</button>
			</form>
		</LoginCard>
	);
}

function PreviewLoginForm() {
	return (
		<LoginCard>
			<div className="mb-5 flex items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-[14px] py-[10px] text-[13px] text-[#DC2626]">
				<Shield size={15} />
				<span>
					Preview mode: set Clerk keys in <code>.env</code> to enable real
					sign-in.
				</span>
			</div>

			<form>
				<div className="mb-5">
					<label
						htmlFor="preview-email"
						className="mb-2 block text-sm font-medium text-[#374151]"
					>
						メールアドレス
					</label>
					<input
						id="preview-email"
						type="email"
						placeholder="example@care.jp"
						disabled
						className="w-full cursor-not-allowed rounded-[10px] border-[1.5px] border-[#E5E7EB] bg-[#FAFAFA] px-[14px] py-[11px] text-[15px] text-[#9CA3AF] outline-none opacity-80"
					/>
				</div>

				<div className="mb-6">
					<label
						htmlFor="preview-password"
						className="mb-2 block text-sm font-medium text-[#374151]"
					>
						パスワード
					</label>
					<input
						id="preview-password"
						type="password"
						placeholder="••••••••"
						disabled
						className="w-full cursor-not-allowed rounded-[10px] border-[1.5px] border-[#E5E7EB] bg-[#FAFAFA] px-[14px] py-[11px] text-[15px] text-[#9CA3AF] outline-none opacity-80"
					/>
				</div>

				<button
					type="button"
					disabled
					className="w-full cursor-not-allowed rounded-[10px] bg-[#A78BFA] p-[13px] text-[15px] font-semibold tracking-[0.01em] text-white"
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

	return <ClerkLoginForm />;
}
