"use client";

import { X } from "lucide-react";

// 画面の上に出すお知らせ（成功・エラー・案内）
export type Notice = {
	type: "success" | "error" | "info";
	message: string;
};

interface NoticeBannerProps {
	notice: Notice | null;
	onClose: () => void;
}

export function NoticeBanner({ notice, onClose }: NoticeBannerProps) {
	if (notice === null) {
		return null;
	}

	// 種類ごとの色
	let colorClass = "border-emerald-200 bg-emerald-50 text-emerald-800";
	if (notice.type === "error") {
		colorClass = "border-red-200 bg-red-50 text-red-700";
	}
	if (notice.type === "info") {
		colorClass = "border-amber-200 bg-amber-50 text-amber-800";
	}

	return (
		<div
			role={notice.type === "error" ? "alert" : "status"}
			className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${colorClass}`}
		>
			<p>{notice.message}</p>
			<button
				type="button"
				onClick={onClose}
				aria-label="閉じる"
				className="shrink-0 rounded-full p-0.5 opacity-60 hover:opacity-100"
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	);
}
