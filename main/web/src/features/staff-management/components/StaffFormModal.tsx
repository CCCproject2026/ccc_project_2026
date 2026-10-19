"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
	GENDER_LABELS,
	ROLE_LABELS,
} from "@/features/staff-management/constants/staff.constant";
import {
	GENDER_OPTIONS,
	type StaffInviteInput,
	type StaffReinviteInput,
	staffInviteSchema,
	staffReinviteSchema,
} from "@/features/staff-management/schemas/staff-input";
import type { StaffItem } from "@/features/staff-management/types/staff.types";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { FormField } from "@/shared/ui/FormField";
import { Modal } from "@/shared/ui/Modal";

// 招待フォーム（新規招待・再招待の両方で使う）
// 設計書：招待時に必須プロフィールをすべて入力する
// mode によって、onSubmit に渡す値の形が変わる
type StaffFormModalProps = {
	open: boolean;
	busy: boolean; // 送信中
	serverError: string | null; // サーバーから返った入力エラー
	onClose: () => void;
} & (
	| {
			mode: "invite";
			onSubmit: (values: StaffInviteInput) => void;
	  }
	| {
			mode: "reinvite";
			target: StaffItem | null; // 再招待の対象スタッフ
			onSubmit: (values: StaffReinviteInput) => void;
	  }
);

// フォームの入力欄の値（どの欄も文字列）
type StaffFormFields = z.input<typeof staffInviteSchema>;

// 再招待フォームのチェック：email は表示するだけ（送信しない）なので、文字列であればよい
const reinviteFormSchema = staffReinviteSchema.extend({ email: z.string() });

// mode によってチェックを切り替える
// （2つのスキーマで出力の型が違うので、ここだけ型を合わせる。値は onSubmit の前に読み直す）
const inviteResolver = zodResolver(
	staffInviteSchema,
) as Resolver<StaffFormFields>;
const reinviteResolver = zodResolver(
	reinviteFormSchema,
) as unknown as Resolver<StaffFormFields>;

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

export function StaffFormModal(props: StaffFormModalProps) {
	const { open, mode, busy, serverError, onClose } = props;
	let target: StaffItem | null = null;
	if (props.mode === "reinvite") {
		target = props.target;
	}
	const isReinvite = mode === "reinvite";

	const {
		register,
		handleSubmit,
		setValue,
		reset,
		control,
		formState: { errors },
	} = useForm<StaffFormFields>({
		resolver: isReinvite ? reinviteResolver : inviteResolver,
		defaultValues: EMPTY_VALUES,
	});

	// 確認ダイアログに表示する値（null なら確認ダイアログは閉じている）
	const [pendingValues, setPendingValues] = useState<StaffFormFields | null>(
		null,
	);

	// フォームのチェックが通ったら、すぐ送信せずに確認ダイアログを開く
	const submit = (values: StaffFormFields) => {
		setPendingValues(values);
	};

	// 確認ダイアログで「招待メールを送る」を押したら、mode に合った形にして渡す
	const confirmSubmit = () => {
		if (pendingValues === null) {
			return;
		}
		if (props.mode === "reinvite") {
			props.onSubmit(staffReinviteSchema.parse(pendingValues));
		} else {
			props.onSubmit(staffInviteSchema.parse(pendingValues));
		}
		// フォームに戻す（サーバーエラーがあればフォームに表示される）
		setPendingValues(null);
	};

	// 選ばれているロール（ボタンの色を変えるため）
	const selectedRole = useWatch({ control, name: "role" });

	// フォームを開くたびに、中身を入れ直す
	useEffect(() => {
		// 開き直したときに、前回の確認ダイアログが残らないようにする
		setPendingValues(null);
		if (!open) {
			return;
		}
		if (mode === "reinvite" && target) {
			// 再招待：email は変更できない
			// 生年月日・入職日・国籍・性別は画面に返していないので空欄。空欄のままなら今の値を使う
			reset({
				...EMPTY_VALUES,
				email: target.email,
				role: target.role,
				lastName: target.lastName,
				firstName: target.firstName,
			});
		} else {
			reset(EMPTY_VALUES);
		}
	}, [open, mode, target, reset]);

	const title = isReinvite ? "スタッフを再招待" : "スタッフを招待";

	// 空欄の項目は、再招待なら「変更しない」、招待なら「-」と表示する
	function displayValue(value: string | undefined): string {
		if (value) {
			return value;
		}
		if (isReinvite) {
			return "変更しない";
		}
		return "-";
	}

	// 性別は DB の値（FEMALE / MALE）ではなく、日本語で表示する
	let genderText = displayValue(undefined);
	if (pendingValues?.gender === "FEMALE" || pendingValues?.gender === "MALE") {
		genderText = GENDER_LABELS[pendingValues.gender];
	}

	return (
		<>
			{/* 確認ダイアログを開いている間は、フォームを隠す（Esc で両方閉じないように） */}
			<Modal
				open={open && pendingValues === null}
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
					onSubmit={handleSubmit(submit)}
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
								<p className="text-xs text-slate-500 mt-1">
									スタッフ管理も可能
								</p>
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

					{isReinvite && (
						<p className="text-xs text-slate-500">
							生年月日・入職日・国籍・性別は、変更する場合だけ入力してください。空欄のままなら登録済みの内容を使います。
						</p>
					)}

					{/* 日付 */}
					<div className="grid grid-cols-2 gap-3">
						<FormField
							label="生年月日"
							htmlFor="staff-birth"
							error={errors.dateOfBirth?.message}
							required={!isReinvite}
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
							required={!isReinvite}
						>
							<input
								id="staff-start"
								type="date"
								{...register("startDate")}
								className={inputClass(Boolean(errors.startDate))}
							/>
						</FormField>
					</div>

					{/* 国籍（自由入力）・性別（女性・男性から選ぶ。DB には FEMALE / MALE で保存） */}
					<div className="grid grid-cols-2 gap-3">
						<FormField
							label="国籍"
							htmlFor="staff-nationality"
							error={errors.nationality?.message}
							required={!isReinvite}
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
							required={!isReinvite}
						>
							<select
								id="staff-gender"
								{...register("gender")}
								className={`${inputClass(Boolean(errors.gender))} bg-white`}
							>
								<option value="">
									{isReinvite ? "変更しない" : "選択してください"}
								</option>
								{GENDER_OPTIONS.map((option) => (
									<option key={option} value={option}>
										{GENDER_LABELS[option]}
									</option>
								))}
							</select>
						</FormField>
					</div>
				</form>
			</Modal>

			{/* 送信前の確認（入力内容をもう一度見てもらう） */}
			<ConfirmDialog
				open={open && pendingValues !== null}
				title="この内容で招待メールを送りますか？"
				confirmLabel="招待メールを送る"
				busy={busy}
				onClose={() => setPendingValues(null)}
				onConfirm={confirmSubmit}
			>
				{pendingValues && (
					<dl className="rounded-xl bg-slate-50 p-4 text-xs space-y-1">
						<div>
							<dt className="inline text-slate-500">メール：</dt>
							<dd className="inline font-bold">{pendingValues.email}</dd>
						</div>
						<div>
							<dt className="inline text-slate-500">ロール：</dt>
							<dd className="inline font-bold">
								{ROLE_LABELS[pendingValues.role]}
							</dd>
						</div>
						<div>
							<dt className="inline text-slate-500">氏名：</dt>
							<dd className="inline font-bold">
								{pendingValues.lastName} {pendingValues.firstName}
							</dd>
						</div>
						<div>
							<dt className="inline text-slate-500">生年月日：</dt>
							<dd className="inline font-bold">
								{displayValue(pendingValues.dateOfBirth)}
							</dd>
						</div>
						<div>
							<dt className="inline text-slate-500">入職日：</dt>
							<dd className="inline font-bold">
								{displayValue(pendingValues.startDate)}
							</dd>
						</div>
						<div>
							<dt className="inline text-slate-500">国籍：</dt>
							<dd className="inline font-bold">
								{displayValue(pendingValues.nationality)}
							</dd>
						</div>
						<div>
							<dt className="inline text-slate-500">性別：</dt>
							<dd className="inline font-bold">{genderText}</dd>
						</div>
					</dl>
				)}
				<p className="text-xs text-slate-500">
					メールアドレスに間違いがないか、もう一度確認してください。
				</p>
			</ConfirmDialog>
		</>
	);
}
