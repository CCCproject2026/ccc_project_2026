"use client";

import type { FormEventHandler, ReactNode } from "react";
import { Modal } from "@/shared/ui/Modal";

interface FormModalProps {
	open: boolean;
	onClose: () => void;
	title: string;
	formId: string;
	onSubmit: FormEventHandler<HTMLFormElement>;
	submitLabel: string;
	isSubmitting?: boolean;
	submittingLabel?: string;
	cancelLabel?: string;
	noValidate?: boolean;
	children: ReactNode;
}

/**
 * 入力フォーム用モーダル。Modal の枠とフッター（キャンセル／保存）の実装を
 * 共通化し、各フォームは children にフィールドを並べるだけで済むようにする。
 *
 * 保存ボタンは isSubmitting の間だけ無効化される。
 */
export function FormModal({
	open,
	onClose,
	title,
	formId,
	onSubmit,
	submitLabel,
	isSubmitting = false,
	submittingLabel = "保存中...",
	cancelLabel = "キャンセル",
	noValidate = false,
	children,
}: FormModalProps) {
	return (
		<Modal
			open={open}
			onClose={onClose}
			title={title}
			footer={
				<>
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						{cancelLabel}
					</button>
					<button
						type="submit"
						form={formId}
						disabled={isSubmitting}
						className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
					>
						{isSubmitting ? submittingLabel : submitLabel}
					</button>
				</>
			}
		>
			<form
				id={formId}
				onSubmit={onSubmit}
				noValidate={noValidate}
				className="space-y-4"
			>
				{children}
			</form>
		</Modal>
	);
}
