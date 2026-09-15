"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";

interface ModalProps {
	open: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
	footer?: ReactNode;
	maxWidthClass?: string;
}

export function Modal({
	open,
	onClose,
	title,
	children,
	footer,
	maxWidthClass = "max-w-md",
}: ModalProps) {
	const titleId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;

		const dialog = dialogRef.current;
		if (!dialog) return;

		const previouslyFocused = document.activeElement as HTMLElement | null;

		const focusables = () =>
			Array.from(
				dialog.querySelectorAll<HTMLElement>(
					'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
				),
			);

		focusables()[0]?.focus();

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
				return;
			}

			if (e.key !== "Tab") return;

			const items = focusables();
			if (items.length === 0) return;

			const first = items[0];
			const last = items[items.length - 1];

			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			previouslyFocused?.focus();
		};
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				onClick={(e) => e.stopPropagation()}
				className={`my-auto bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 w-full max-h-[calc(100vh-2rem)] flex flex-col ${maxWidthClass}`}
			>
				<div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
					<h2 id={titleId} className="text-lg font-bold text-gray-900">
						{title}
					</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="閉じる"
						className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="p-6 space-y-4 overflow-y-auto min-h-0">{children}</div>

				{footer && (
					<div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 shrink-0">
						{footer}
					</div>
				)}
			</div>
		</div>
	);
}
