"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

// 招待を受けた人が、パスワードを決めて登録するフォーム
// ticket: 招待メールのリンクに付いている Clerk の招待チケット
interface SetPasswordFormProps {
	ticket: string;
}

// パスワードの最低文字数
const MIN_PASSWORD_LENGTH = 8;

// Clerk のエラーを、画面に出す日本語の文にする
function toErrorMessage(error: unknown): string {
	if (
		typeof error === "object" &&
		error !== null &&
		"errors" in error &&
		Array.isArray(error.errors) &&
		error.errors.length > 0
	) {
		const first = error.errors[0];
		const code = typeof first?.code === "string" ? first.code : "";

		// よくあるエラーは日本語で説明する
		if (code === "form_password_pwned") {
			return "このパスワードは過去に流出したことがあるため使えません。別のパスワードにしてください。";
		}
		if (code === "form_password_length_too_short") {
			return `パスワードは${MIN_PASSWORD_LENGTH}文字以上にしてください。`;
		}
		if (code.includes("ticket") || code.includes("invitation")) {
			return "招待リンクの有効期限が切れているか、既に使われています。管理者（看護師）に再招待を依頼してください。";
		}
		if (typeof first?.longMessage === "string") {
			return first.longMessage;
		}
	}
	return "登録できませんでした。しばらくしてから、もう一度お試しください。";
}

export function SetPasswordForm({ ticket }: SetPasswordFormProps) {
	const { client, setActive, signOut } = useClerk();
	const { isLoaded, isSignedIn } = useAuth();
	const router = useRouter();

	const [password, setPassword] = useState("");
	const [passwordConfirm, setPasswordConfirm] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	// このフォームで登録して、自分のセッションを作ったら true
	// （state ではなく ref にするのは、値を変えても再描画させず、すぐに読めるようにするため）
	const hasCreatedSessionRef = useRef(false);

	// 別のアカウントでログインしたままのブラウザで開いた場合は、先にログアウトする
	// （ログアウトしないと、その人のアカウントでダッシュボードが開いてしまう）
	// ただし、このフォームで登録した直後のログイン（自分で作ったセッション）はログアウトしない
	useEffect(() => {
		if (hasCreatedSessionRef.current) {
			return;
		}
		if (isLoaded && isSignedIn) {
			void signOut();
		}
	}, [isLoaded, isSignedIn, signOut]);

	// まだ準備中（Clerk の読み込み中、またはログアウト中）
	const isReady = isLoaded && !isSignedIn && Boolean(client);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setErrorMessage("");

		// 1. 入力のチェック
		if (password.length < MIN_PASSWORD_LENGTH) {
			setErrorMessage(
				`パスワードは${MIN_PASSWORD_LENGTH}文字以上にしてください。`,
			);
			return;
		}
		if (password !== passwordConfirm) {
			setErrorMessage("確認用のパスワードが一致しません。");
			return;
		}
		if (!isReady || !client) {
			setErrorMessage("準備中です。しばらくしてから、もう一度お試しください。");
			return;
		}

		setIsSubmitting(true);
		try {
			// 2. 招待チケットとパスワードでアカウントを作る
			//    （メールアドレスは招待で確認済みなので、確認コードは不要）
			const result = await client.signUp.create({
				strategy: "ticket",
				ticket,
				password,
			});

			// 3. 完了したらログインして、ダッシュボードへ
			if (result.status === "complete") {
				// setActive で isSignedIn が true になる前に、印を付けておく
				hasCreatedSessionRef.current = true;
				await setActive({ session: result.createdSessionId });
				router.push("/dashboard");
				return;
			}

			// Clerk の設定で、他の項目（名前など）も必要になっている場合
			setErrorMessage(
				`登録を完了できませんでした（不足している項目: ${result.missingFields.join(", ")}）。管理者に連絡してください。`,
			);
		} catch (error: unknown) {
			setErrorMessage(toErrorMessage(error));
		} finally {
			setIsSubmitting(false);
		}
	};

	const inputClass =
		"w-full rounded-[10px] border-[1.5px] border-[#E5E7EB] bg-[#FAFAFA] px-[14px] py-[11px] pr-11 text-[15px] text-[#111827] outline-none transition-colors focus:border-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-70";

	return (
		<form onSubmit={handleSubmit} noValidate>
			<div className="mb-5">
				<label
					htmlFor="new-password"
					className="mb-2 block text-sm font-medium text-[#374151]"
				>
					パスワード（{MIN_PASSWORD_LENGTH}文字以上）
				</label>
				<div className="relative">
					<input
						id="new-password"
						type={showPassword ? "text" : "password"}
						autoComplete="new-password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						disabled={isSubmitting}
						className={inputClass}
					/>
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
						className="absolute top-1/2 right-3 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
					>
						{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
					</button>
				</div>
			</div>

			<div className="mb-6">
				<label
					htmlFor="new-password-confirm"
					className="mb-2 block text-sm font-medium text-[#374151]"
				>
					パスワード（確認用）
				</label>
				<input
					id="new-password-confirm"
					type={showPassword ? "text" : "password"}
					autoComplete="new-password"
					value={passwordConfirm}
					onChange={(e) => setPasswordConfirm(e.target.value)}
					disabled={isSubmitting}
					className={inputClass}
				/>
			</div>

			{/* Clerk のボット対策（CAPTCHA）を表示する場所。自作の登録フォームには必ず必要 */}
			<div id="clerk-captcha" className="mb-5" />

			{errorMessage && (
				<div
					role="alert"
					className="mb-5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-[14px] py-[10px] text-[13px] text-[#DC2626]"
				>
					{errorMessage}
				</div>
			)}

			<button
				type="submit"
				disabled={isSubmitting || !isReady}
				className="w-full cursor-pointer rounded-[10px] bg-[#7C3AED] p-[13px] text-[15px] font-semibold tracking-[0.01em] text-white transition-colors hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:bg-[#A78BFA]"
			>
				{isSubmitting ? "登録中…" : isReady ? "登録してはじめる" : "準備中…"}
			</button>
		</form>
	);
}
