"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiOutlinePencilSquare } from "react-icons/hi2";
import { updateProfile } from "@/features/profile/api/profile-api";
import { ProfileEditModal } from "@/features/profile/components/ProfileEditModal";
import type { ProfileUpdateInput } from "@/features/profile/schemas/profile-input";
import type { ProfileInfo } from "@/features/profile/types/profile.type";

// 「編集」ボタンと編集フォーム
// マイページ本体はサーバーで表示するので、画面で動かす部分だけをここに分ける
export function ProfileEditButton({ profile }: { profile: ProfileInfo }) {
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);

	function open() {
		setServerError(null);
		setIsOpen(true);
	}

	async function handleSubmit(values: ProfileUpdateInput) {
		setIsSubmitting(true);
		setServerError(null);
		const result = await updateProfile(values);
		setIsSubmitting(false);

		if (result.ok) {
			setIsOpen(false);
			// サーバーで表示しているマイページを読み直して、新しい値を表示する
			router.refresh();
			return;
		}

		// 無効化されたなど、もう利用できないアカウント → 案内ページへ
		if (result.status === 403) {
			router.push("/account-status");
			return;
		}

		// それ以外のエラーは、フォームを開いたまま表示する（入力した値は残す）
		setServerError(result.message);
	}

	return (
		<>
			<button
				type="button"
				onClick={open}
				className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-200 transition"
			>
				<HiOutlinePencilSquare className="text-base" />
				編集
			</button>

			<ProfileEditModal
				open={isOpen}
				profile={profile}
				busy={isSubmitting}
				serverError={serverError}
				onClose={() => setIsOpen(false)}
				onSubmit={handleSubmit}
			/>
		</>
	);
}
