"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { HiOutlineChevronDown } from "react-icons/hi2";
import type { Elder } from "@/features/elder-management/types/elder.types";
import { FormField } from "@/shared/ui/FormField";
import { FormModal } from "@/shared/ui/FormModal";
import {
	type ElderFormData,
	elderCreateSchema,
	genderValues,
} from "@/shared/validation/schemas";

const DEFAULT_VALUES: ElderFormData = {
	firstName: "",
	lastName: "",
	roomNumber: "",
	dateOfBirth: "",
	gender: "FEMALE",
};

interface AddElderModalProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (data: ElderFormData) => void | Promise<void>;
	initialData?: Elder | null;
	isEditing?: boolean;
}

export const AddElderModal = ({
	open,
	onClose,
	onSubmit,
	initialData = null,
	isEditing = false,
}: AddElderModalProps) => {
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<ElderFormData>({
		resolver: zodResolver(elderCreateSchema),
		defaultValues: DEFAULT_VALUES,
	});

	useEffect(() => {
		if (!open) return;
		if (initialData) {
			reset({
				firstName: initialData.firstName,
				lastName: initialData.lastName,
				roomNumber: initialData.roomNumber,
				dateOfBirth: initialData.dateOfBirth?.split("T")[0] || "",
				gender: initialData.gender,
			});
		} else {
			reset(DEFAULT_VALUES);
		}
	}, [open, initialData, reset]);

	// 親の保存処理(Promise)を return し、通信完了まで isSubmitting を維持する。
	// これにより保存中の再クリックによる二重登録を防ぐ。
	const handleFormSubmit = (data: ElderFormData) => onSubmit(data);

	return (
		<FormModal
			open={open}
			onClose={onClose}
			title={isEditing ? "高齢者を編集" : "高齢者を追加"}
			formId="elder-form"
			onSubmit={handleSubmit(handleFormSubmit)}
			submitLabel="保存"
			isSubmitting={isSubmitting}
			submittingLabel="保存中..."
		>
			<div className="grid grid-cols-2 gap-4">
				<FormField
					label="姓"
					htmlFor="lastName"
					error={errors.lastName?.message}
				>
					<input
						id="lastName"
						type="text"
						placeholder="例: 山田"
						{...register("lastName")}
						className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
					/>
				</FormField>

				<FormField
					label="名"
					htmlFor="firstName"
					error={errors.firstName?.message}
				>
					<input
						id="firstName"
						type="text"
						placeholder="例: 太郎"
						{...register("firstName")}
						className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
					/>
				</FormField>
			</div>

			<FormField
				label="部屋番号"
				htmlFor="roomNumber"
				error={errors.roomNumber?.message}
			>
				<input
					id="roomNumber"
					type="text"
					placeholder="例: 101号室"
					{...register("roomNumber")}
					className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
				/>
			</FormField>

			<FormField
				label="生年月日"
				htmlFor="dateOfBirth"
				error={errors.dateOfBirth?.message}
			>
				<input
					id="dateOfBirth"
					type="date"
					{...register("dateOfBirth")}
					className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
					max={new Date().toISOString().split("T")[0]}
				/>
			</FormField>

			<FormField label="性別" htmlFor="gender" error={errors.gender?.message}>
				<div className="relative">
					<select
						id="gender"
						{...register("gender")}
						className="w-full h-10 pl-3 pr-10 border border-gray-300 rounded-lg text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
					>
						{genderValues.map((value) => (
							<option key={value} value={value}>
								{value}
							</option>
						))}
					</select>
					<HiOutlineChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
				</div>
			</FormField>
		</FormModal>
	);
};
