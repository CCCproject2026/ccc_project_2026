"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/shared/ui/FormField";
import { FormModal } from "@/shared/ui/FormModal";
import {
	type StaffFormData,
	staffFormSchema,
} from "@/shared/validation/schemas";

interface AddStaffModalProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (staff: StaffFormData) => void;
}

export const AddStaffModal = ({
	open,
	onClose,
	onSubmit,
}: AddStaffModalProps) => {
	const {
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<StaffFormData>({
		resolver: zodResolver(staffFormSchema),
		defaultValues: {
			name: "",
			mail: "",
			role: "介護士",
		},
	});

	// Watch current role selection to apply active button styles
	const selectedRole = watch("role");

	// Reset form inputs whenever the modal closes
	useEffect(() => {
		if (!open) {
			reset();
		}
	}, [open, reset]);

	const handleFormSubmit = (data: StaffFormData) => {
		onSubmit(data);
		onClose();
	};

	return (
		<FormModal
			open={open}
			onClose={onClose}
			title="スタッフを追加"
			formId="add-staff-form"
			onSubmit={handleSubmit(handleFormSubmit)}
			submitLabel="追加する"
			isSubmitting={isSubmitting}
			submittingLabel="保存中..."
			noValidate
		>
			<FormField label="氏名" htmlFor="staff-name" error={errors.name?.message}>
				<input
					id="staff-name"
					type="text"
					placeholder="例: 高橋 義雄"
					{...register("name")}
					className={`border rounded-xl w-full p-3 text-sm focus:ring-2 focus:outline-none transition ${
						errors.name
							? "border-red-500 focus:ring-red-200"
							: "border-slate-200 focus:ring-violet-300"
					}`}
				/>
			</FormField>

			<FormField
				label="メールアドレス"
				htmlFor="staff-mail"
				error={errors.mail?.message}
			>
				<input
					id="staff-mail"
					type="email"
					placeholder="例: takahashi@example.com"
					{...register("mail")}
					className={`border rounded-xl w-full p-3 text-sm focus:ring-2 focus:outline-none transition ${
						errors.mail
							? "border-red-500 focus:ring-red-200"
							: "border-slate-200 focus:ring-violet-300"
					}`}
				/>
			</FormField>

			{/* Role Field */}
			<div>
				<p className="block mb-2 text-sm font-bold text-slate-700">
					権限ロール
				</p>

				<div className="space-y-3">
					<button
						type="button"
						className={`border rounded-xl p-4 w-full text-left cursor-pointer transition ${
							selectedRole === "介護士"
								? "border-violet-500 bg-violet-50"
								: "border-slate-200 hover:bg-slate-50"
						}`}
						onClick={() => setValue("role", "介護士", { shouldValidate: true })}
					>
						<p className="font-bold text-sm">介護士</p>
						<p className="text-xs text-slate-500 mt-1">USER権限</p>
					</button>

					<button
						type="button"
						className={`border rounded-xl p-4 w-full text-left cursor-pointer transition ${
							selectedRole === "看護師（管理者）"
								? "border-violet-500 bg-violet-50"
								: "border-slate-200 hover:bg-slate-50"
						}`}
						onClick={() =>
							setValue("role", "看護師（管理者）", { shouldValidate: true })
						}
					>
						<p className="font-bold text-sm">看護師（管理者）</p>
						<p className="text-xs text-slate-500 mt-1">ADMIN権限</p>
					</button>
				</div>
				{errors.role && (
					<p className="text-xs text-red-500 mt-1">{errors.role.message}</p>
				)}
			</div>
		</FormModal>
	);
};
