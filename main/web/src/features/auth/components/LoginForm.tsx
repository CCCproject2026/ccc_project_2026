"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { Eye, EyeOff, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import {
	type FormEvent,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";

function LoginCard({ children }: { children: ReactNode }) {
	return (
		<div className="rounded-[20px] bg-white p-10 shadow-[0_24px_64px_rgba(0,0,0,0.3)]">
			<h2 className="mb-2 text-[20px] font-bold text-[#111827]">ログイン</h2>
			<p className="mb-7 text-sm text-[#6B7280]">
				ご登録のアカウントでサインインしてください
			</p>
			{children}
		</div>
	);
}

function ClerkLoginForm() {
	const { client, setActive, signOut } = useClerk();
	const { isSignedIn, isLoaded } = useAuth();
	const router = useRouter();
	const mountChecked = useRef(false);

	useEffect(() => {
		if (!isLoaded || mountChecked.current) return;
		mountChecked.current = true;
		if (isSignedIn) {
			signOut();
		}
	}, [isLoaded, isSignedIn, signOut]);
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

		if (!client) {
			setErrorMessage(
				"認証システムを読み込んでいます。しばらくお待ちください。",
			);
			return;
		}

		setErrorMessage("");
		setIsSubmitting(true);

		try {
			const result = await client.signIn.create({
				identifier: email,
				password,
			});

			if (result.status === "complete") {
				await setActive({ session: result.createdSessionId });
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
					disabled={isSubmitting || !client}
					className="w-full cursor-pointer rounded-[10px] bg-[#7C3AED] p-[13px] text-[15px] font-semibold text-white tracking-[0.01em] transition-colors hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:bg-[#A78BFA]"
				>
					{isSubmitting ? "ログイン中..." : "ログイン"}
				</button>
			</form>
		</LoginCard>
	);
}

export function LoginForm() {
	return <ClerkLoginForm />;
}
