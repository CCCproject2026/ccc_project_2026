"use client";

import type { ReactNode } from "react";
import { Modal } from "./Modal";

// 「本当に実行しますか？」を確認するダイアログ
interface ConfirmDialogProps {
	open: boolean;
	title: string;
	children: ReactNode; // 説明文
	confirmLabel: string; // 実行ボタンの文字
	danger?: boolean; // true なら赤いボタン（無効化など）
	busy?: boolean; // 実行中はボタンを押せなくする
	onConfirm: () => void;
	onClose: () => void;
}

export function ConfirmDialog({
	open,
	title,
	children,
	confirmLabel,
	danger,
	busy,
	onConfirm,
	onClose,
}: ConfirmDialogProps) {
	let confirmClass =
		"bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-200";
	if (danger) {
		confirmClass = "bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-200";
	}

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
						className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition"
					>
						キャンセル
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={busy}
						className={`px-5 py-2.5 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 ${confirmClass}`}
					>
						{busy ? "処理中…" : confirmLabel}
					</button>
				</>
			}
		>
			<div className="text-sm text-slate-700 space-y-3">{children}</div>
		</Modal>
	);
}
