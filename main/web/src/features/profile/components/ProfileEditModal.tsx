"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
	type ProfileUpdateInput,
	profileUpdateSchema,
} from "@/features/profile/schemas/profile-input";
import type { ProfileInfo } from "@/features/profile/types/profile.type";
import { GENDER_LABELS } from "@/features/staff-management/constants/staff.constant";
import { GENDER_OPTIONS } from "@/features/staff-management/schemas/staff-input";
import { FormField } from "@/shared/ui/FormField";
import { FormModal } from "@/shared/ui/FormModal";

// プロフィール編集フォーム（姓・名・生年月日・国籍・性別）
// ロール・入職日・メールアドレスはここでは変更できない
interface ProfileEditModalProps {
	open: boolean;
	profile: ProfileInfo; // 今の値（フォームの初期値に使う）
	busy: boolean; // 送信中
	serverError: string | null; // サーバーから返ったエラー
	onClose: () => void;
	onSubmit: (values: ProfileUpdateInput) => void;
}

// フォームの入力欄の値（どの欄も文字列）
type ProfileFormFields = z.input<typeof profileUpdateSchema>;

// 入力欄の見た目（エラーなら赤い枠）
function inputClass(hasError: boolean): string {
	return `border rounded-xl w-full p-3 text-sm focus:ring-2 focus:outline-none transition ${
		hasError
			? "border-red-500 focus:ring-red-200"
			: "border-slate-200 focus:ring-purple-300"
	}`;
}

export function ProfileEditModal({
	open,
	profile,
	busy,
	serverError,
	onClose,
	onSubmit,
}: ProfileEditModalProps) {
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<ProfileFormFields, unknown, ProfileUpdateInput>({
		resolver: zodResolver(profileUpdateSchema),
	});

	// フォームを開くたびに、今の値を入れ直す（前回の入力途中の値を残さない）
	useEffect(() => {
		if (!open) {
			return;
		}
		reset({
			lastName: profile.lastName,
			firstName: profile.firstName,
			dateOfBirth: profile.dateOfBirthInput, // 表示用の「1990年4月1日」ではなく YYYY-MM-DD
			nationality: profile.nationality,
			gender: profile.gender,
		});
	}, [open, profile, reset]);

	return (
		<FormModal
			open={open}
			onClose={onClose}
			title="プロフィールを編集"
			formId="profile-form"
			onSubmit={handleSubmit(onSubmit)}
			submitLabel="保存する"
			isSubmitting={busy}
			noValidate
		>
			{serverError && (
				<p
					role="alert"
					className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
				>
					{serverError}
				</p>
			)}

			{/* 氏名 */}
			<div className="grid grid-cols-2 gap-3">
				<FormField
					label="姓"
					htmlFor="profile-last-name"
					error={errors.lastName?.message}
					required
				>
					<input
						id="profile-last-name"
						type="text"
						{...register("lastName")}
						className={inputClass(Boolean(errors.lastName))}
					/>
				</FormField>
				<FormField
					label="名"
					htmlFor="profile-first-name"
					error={errors.firstName?.message}
					required
				>
					<input
						id="profile-first-name"
						type="text"
						{...register("firstName")}
						className={inputClass(Boolean(errors.firstName))}
					/>
				</FormField>
			</div>

			<FormField
				label="生年月日"
				htmlFor="profile-birth"
				error={errors.dateOfBirth?.message}
				required
			>
				<input
					id="profile-birth"
					type="date"
					{...register("dateOfBirth")}
					className={inputClass(Boolean(errors.dateOfBirth))}
				/>
			</FormField>

			{/* 国籍（自由入力）・性別（女性・男性から選ぶ。DB には FEMALE / MALE で保存） */}
			<div className="grid grid-cols-2 gap-3">
				<FormField
					label="国籍"
					htmlFor="profile-nationality"
					error={errors.nationality?.message}
					required
				>
					<input
						id="profile-nationality"
						type="text"
						placeholder="例: 日本"
						{...register("nationality")}
						className={inputClass(Boolean(errors.nationality))}
					/>
				</FormField>
				<FormField
					label="性別"
					htmlFor="profile-gender"
					error={errors.gender?.message}
					required
				>
					<select
						id="profile-gender"
						{...register("gender")}
						className={`${inputClass(Boolean(errors.gender))} bg-white`}
					>
						{GENDER_OPTIONS.map((option) => (
							<option key={option} value={option}>
								{GENDER_LABELS[option]}
							</option>
						))}
					</select>
				</FormField>
			</div>

			<p className="text-xs text-slate-500">
				権限ロール・入職日を変更したい場合は、管理者（看護師）に連絡してください。
			</p>
		</FormModal>
	);
}
