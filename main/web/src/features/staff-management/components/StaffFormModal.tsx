"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ROLE_LABELS } from "@/features/staff-management/constants/staff.constant";
import {
	type StaffInviteInput,
	staffInviteSchema,
} from "@/features/staff-management/schemas/staff-input";
import type { StaffItem } from "@/features/staff-management/types/staff.types";
import { FormField } from "@/shared/ui/FormField";
import { Modal } from "@/shared/ui/Modal";

// 招待フォーム（新規招待・再招待の両方で使う）
// 設計書：招待時に必須プロフィールをすべて入力する
interface StaffFormModalProps {
	open: boolean;
	mode: "invite" | "reinvite";
	target?: StaffItem | null; // 再招待のときの対象スタッフ
	busy: boolean; // 送信中
	serverError: string | null; // サーバーから返った入力エラー
	onClose: () => void;
	onSubmit: (values: StaffInviteInput) => void;
}

// 空のフォーム
const EMPTY_VALUES = {
	email: "",
	role: "CAREGIVER" as const,
	lastName: "",
	firstName: "",
	dateOfBirth: "",
	startDate: "",
	nationality: "",
	gender: "",
};

// 入力欄の見た目（エラーなら赤い枠）
function inputClass(hasError: boolean): string {
	return `border rounded-xl w-full p-3 text-sm focus:ring-2 focus:outline-none transition ${
		hasError
			? "border-red-500 focus:ring-red-200"
			: "border-slate-200 focus:ring-purple-300"
	}`;
}

export function StaffFormModal({
	open,
	mode,
	target,
	busy,
	serverError,
	onClose,
	onSubmit,
}: StaffFormModalProps) {
	const {
		register,
		handleSubmit,
		setValue,
		reset,
		control,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(staffInviteSchema),
		defaultValues: EMPTY_VALUES,
	});

	// 選ばれているロール（ボタンの色を変えるため）
	const selectedRole = useWatch({ control, name: "role" });

	// フォームを開くたびに、中身を入れ直す
	useEffect(() => {
		if (!open) {
			return;
		}
		if (mode === "reinvite" && target) {
			// 再招待：email は変更できない。氏名は「姓 名」から分けて入れておく
			const nameParts = target.displayName.split(" ");
			reset({
				...EMPTY_VALUES,
				email: target.email,
				role: target.role,
				lastName: nameParts[0] ?? "",
				firstName: nameParts.slice(1).join(" "),
			});
		} else {
			reset(EMPTY_VALUES);
		}
	}, [open, mode, target, reset]);

	const isReinvite = mode === "reinvite";
	const title = isReinvite ? "スタッフを再招待" : "スタッフを招待";

	return (
		<Modal
			open={open}
			onClose={onClose}
			title={title}
			maxWidthClass="max-w-[560px]"
			footer={
				<>
					<button
						type="button"
						onClick={onClose}
						className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition"
					>
						キャンセル
					</button>
					<button
						type="submit"
						form="staff-form"
						disabled={busy}
						className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-200 transition"
					>
						{busy ? "送信中…" : "招待メールを送る"}
					</button>
				</>
			}
		>
			<form
				id="staff-form"
				onSubmit={handleSubmit(onSubmit)}
				noValidate
				className="space-y-4"
			>
				{serverError && (
					<p
						role="alert"
						className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
					>
						{serverError}
					</p>
				)}

				<FormField
					label="メールアドレス"
					htmlFor="staff-email"
					error={errors.email?.message}
					required
				>
					<input
						id="staff-email"
						type="email"
						placeholder="例: takahashi@example.com"
						readOnly={isReinvite}
						{...register("email")}
						className={`${inputClass(Boolean(errors.email))} ${
							isReinvite ? "bg-slate-100 text-slate-500" : ""
						}`}
					/>
					{isReinvite && (
						<p className="text-xs text-slate-400 mt-1">
							メールアドレスは変更できません
						</p>
					)}
				</FormField>

				{/* ロール */}
				<div>
					<p className="block mb-2 text-sm font-medium text-gray-700">
						権限ロール<span className="text-red-500"> *</span>
					</p>
					<div className="grid grid-cols-2 gap-3">
						<button
							type="button"
							className={`border rounded-xl p-3 text-left cursor-pointer transition ${
								selectedRole === "CAREGIVER"
									? "border-purple-500 bg-purple-50"
									: "border-slate-200 hover:bg-slate-50"
							}`}
							onClick={() =>
								setValue("role", "CAREGIVER", { shouldValidate: true })
							}
						>
							<p className="font-bold text-sm">{ROLE_LABELS.CAREGIVER}</p>
							<p className="text-xs text-slate-500 mt-1">業務画面を利用</p>
						</button>
						<button
							type="button"
							className={`border rounded-xl p-3 text-left cursor-pointer transition ${
								selectedRole === "NURSE"
									? "border-purple-500 bg-purple-50"
									: "border-slate-200 hover:bg-slate-50"
							}`}
							onClick={() =>
								setValue("role", "NURSE", { shouldValidate: true })
							}
						>
							<p className="font-bold text-sm">{ROLE_LABELS.NURSE}</p>
							<p className="text-xs text-slate-500 mt-1">スタッフ管理も可能</p>
						</button>
					</div>
					{errors.role && (
						<p className="text-xs text-red-500 mt-1">{errors.role.message}</p>
					)}
				</div>

				{/* 氏名 */}
				<div className="grid grid-cols-2 gap-3">
					<FormField
						label="姓"
						htmlFor="staff-last-name"
						error={errors.lastName?.message}
						required
					>
						<input
							id="staff-last-name"
							type="text"
							placeholder="例: 高橋"
							{...register("lastName")}
							className={inputClass(Boolean(errors.lastName))}
						/>
					</FormField>
					<FormField
						label="名"
						htmlFor="staff-first-name"
						error={errors.firstName?.message}
						required
					>
						<input
							id="staff-first-name"
							type="text"
							placeholder="例: 義雄"
							{...register("firstName")}
							className={inputClass(Boolean(errors.firstName))}
						/>
					</FormField>
				</div>

				{/* 日付 */}
				<div className="grid grid-cols-2 gap-3">
					<FormField
						label="生年月日"
						htmlFor="staff-birth"
						error={errors.dateOfBirth?.message}
						required
					>
						<input
							id="staff-birth"
							type="date"
							{...register("dateOfBirth")}
							className={inputClass(Boolean(errors.dateOfBirth))}
						/>
					</FormField>
					<FormField
						label="入職日"
						htmlFor="staff-start"
						error={errors.startDate?.message}
						required
					>
						<input
							id="staff-start"
							type="date"
							{...register("startDate")}
							className={inputClass(Boolean(errors.startDate))}
						/>
					</FormField>
				</div>

				{/* 国籍・性別（この版では自由入力） */}
				<div className="grid grid-cols-2 gap-3">
					<FormField
						label="国籍"
						htmlFor="staff-nationality"
						error={errors.nationality?.message}
						required
					>
						<input
							id="staff-nationality"
							type="text"
							placeholder="例: 日本"
							{...register("nationality")}
							className={inputClass(Boolean(errors.nationality))}
						/>
					</FormField>
					<FormField
						label="性別"
						htmlFor="staff-gender"
						error={errors.gender?.message}
						required
					>
						<input
							id="staff-gender"
							type="text"
							placeholder="例: 女性"
							{...register("gender")}
							className={inputClass(Boolean(errors.gender))}
						/>
					</FormField>
				</div>
			</form>
		</Modal>
	);
}
