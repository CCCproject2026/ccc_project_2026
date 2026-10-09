"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { HiOutlineChevronDown } from "react-icons/hi2";
import { z } from "zod";
import { Elder } from "@/features/elder-management/types/elder.types";
import { FormField } from "@/shared/ui/FormField";
import { Modal } from "@/shared/ui/Modal";

const genderOptions = ["男性", "女性", "その他", "回答しない"] as const;
type Gender = (typeof genderOptions)[number];

const elderSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "名を入力してください")
    .max(50, "名は50文字以内で入力してください"),
  lastName: z
    .string()
    .trim()
    .min(1, "姓を入力してください")
    .max(50, "姓は50文字以内で入力してください"),
  roomNumber: z
    .string()
    .trim()
    .min(1, "部屋番号を入力してください")
    .max(20, "部屋番号は20文字以内で入力してください"),
  dateOfBirth: z
    .string()
    .min(1, "生年月日を入力してください")
    .refine((val) => {
      const date = new Date(val);
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      return date <= today && age >= 0 && age <= 130;
    }, "有効な生年月日を入力してください（0〜130歳、未来日不可）"),
  gender: z.enum(genderOptions, { message: "性別を選択してください" }),
});

type ElderFormData = z.infer<typeof elderSchema>;

interface AddElderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ElderFormData) => void;
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
    resolver: zodResolver(elderSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      roomNumber: "",
      dateOfBirth: "",
      gender: "女性",
    },
  });

  useEffect(() => {
    if (open && initialData) {
      reset({
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        roomNumber: initialData.roomNumber,
        dateOfBirth: initialData.dateOfBirth?.split("T")[0] || "",
        gender: initialData.gender as Gender,
      });
    } else if (open && !initialData) {
      reset({
        firstName: "",
        lastName: "",
        roomNumber: "",
        dateOfBirth: "",
        gender: "女性",
      });
    }
  }, [open, initialData, reset]);

  if (!open) return null;

  const handleFormSubmit = (data: ElderFormData) => {
    onSubmit(data);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "高齢者を編集" : "高齢者を追加"}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            form="elder-form"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "保存中..." : "保存"}
          </button>
        </>
      }
    >
      <form id="elder-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="姓" htmlFor="lastName" error={errors.lastName?.message}>
            <input
              id="lastName"
              type="text"
              placeholder="例: 山田"
              {...register("lastName")}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </FormField>

          <FormField label="名" htmlFor="firstName" error={errors.firstName?.message}>
            <input
              id="firstName"
              type="text"
              placeholder="例: 太郎"
              {...register("firstName")}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </FormField>
        </div>

        <FormField label="部屋番号" htmlFor="roomNumber" error={errors.roomNumber?.message}>
          <input
            id="roomNumber"
            type="text"
            placeholder="例: 101号室"
            {...register("roomNumber")}
            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
        </FormField>

        <FormField label="生年月日" htmlFor="dateOfBirth" error={errors.dateOfBirth?.message}>
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
              <option value="男性">男性</option>
              <option value="女性">女性</option>
              <option value="その他">その他</option>
              <option value="回答しない">回答しない</option>
            </select>
            <HiOutlineChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </FormField>
      </form>
    </Modal>
  );
};