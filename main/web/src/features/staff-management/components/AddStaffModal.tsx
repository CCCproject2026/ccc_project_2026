import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { RoleType } from "../types/staff.types";

// 1. Define the validation schema with Zod
const staffSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "氏名を入力してください")
		.max(50, "氏名は50文字以内で入力してください"),
	mail: z
		.string()
		.trim()
		.min(1, "メールアドレスを入力してください")
		.email("正しいメールアドレスの形式で入力してください"),
	role: z.custom<RoleType>((val) => typeof val === "string", {
		message: "権限ロールを選択してください",
	}),
});

// 2. Infer TypeScript types directly from the schema
type StaffFormData = z.infer<typeof staffSchema>;

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
		resolver: zodResolver(staffSchema),
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

	if (!open) return null;

	const handleFormSubmit = (data: StaffFormData) => {
		onSubmit(data);
		onClose();
	};

	return (
		<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
			<form
				onSubmit={handleSubmit(handleFormSubmit)}
				noValidate
				className="bg-white p-6 rounded-2xl shadow-xl w-[420px]"
			>
				<h2 className="text-lg font-bold mb-5">スタッフを追加</h2>

				{/* Name Field */}
				<div className="mb-5">
					<label
						htmlFor="staff-name"
						className="block mb-2 text-sm font-bold text-slate-700"
					>
						氏名
					</label>
					<input
						id="staff-name"
						type="text"
						placeholder="例: 高橋 義雄"
						{...register("name")}
						className={`border rounded-xl w-full p-3 text-sm focus:ring-2 focus:outline-none transition ${
							errors.name
								? "border-red-500 focus:ring-red-200"
								: "border-slate-200 focus:ring-purple-300"
						}`}
					/>
					{errors.name && (
						<p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
					)}
				</div>

				{/* Email Field */}
				<div className="mb-5">
					<label
						htmlFor="staff-mail"
						className="block mb-2 text-sm font-bold text-slate-700"
					>
						メールアドレス
					</label>
					<input
						id="staff-mail"
						type="email"
						placeholder="例: takahashi@example.com"
						{...register("mail")}
						className={`border rounded-xl w-full p-3 text-sm focus:ring-2 focus:outline-none transition ${
							errors.mail
								? "border-red-500 focus:ring-red-200"
								: "border-slate-200 focus:ring-purple-300"
						}`}
					/>
					{errors.mail && (
						<p className="text-xs text-red-500 mt-1">{errors.mail.message}</p>
					)}
				</div>

				{/* Role Field */}
				<div className="mb-6">
					<p className="block mb-2 text-sm font-bold text-slate-700">
						権限ロール
					</p>

					<div className="space-y-3">
						<button
							type="button"
							className={`border rounded-xl p-4 w-full text-left cursor-pointer transition ${
								selectedRole === "介護士"
									? "border-purple-500 bg-purple-50"
									: "border-slate-200 hover:bg-slate-50"
							}`}
							onClick={() =>
								setValue("role", "介護士", { shouldValidate: true })
							}
						>
							<p className="font-bold text-sm">介護士</p>
							<p className="text-xs text-slate-500 mt-1">USER権限</p>
						</button>

						<button
							type="button"
							className={`border rounded-xl p-4 w-full text-left cursor-pointer transition ${
								selectedRole === "看護師（管理者）"
									? "border-purple-500 bg-purple-50"
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

				{/* Footer Buttons */}
				<div className="flex justify-end gap-3 mt-8">
					<button
						type="button"
						onClick={onClose}
						className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition"
					>
						キャンセル
					</button>

					<button
						type="submit"
						disabled={isSubmitting}
						className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-200 transition"
					>
						追加する
					</button>
				</div>
			</form>
		</div>
	);
};
