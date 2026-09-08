"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { FormField } from "@/shared/ui/FormField";
import { Modal } from "@/shared/ui/Modal";

export function DeviceRegisterModal() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
			>
				<Plus className="w-4 h-4" />
				デバイス登録
			</button>

			<Modal
				open={isOpen}
				onClose={() => setIsOpen(false)}
				title="デバイス登録"
				footer={
					<>
						<button
							type="button"
							onClick={() => setIsOpen(false)}
							className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							キャンセル
						</button>
						<button
							type="button"
							onClick={() => setIsOpen(false)}
							className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
						>
							登録する
						</button>
					</>
				}
			>
				<FormField label="デバイス名 (deviceName)" htmlFor="device-name">
					<input
						id="device-name"
						type="text"
						placeholder="例: ESP32-101"
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
					/>
				</FormField>
				<FormField label="デバイスコード (serialCode)" htmlFor="device-code">
					<input
						id="device-code"
						type="text"
						placeholder="例: dev-001"
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
					/>
				</FormField>
				<FormField label="部屋番号" htmlFor="device-room">
					<input
						id="device-room"
						type="text"
						placeholder="割り当て予定の部屋番号"
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
					/>
				</FormField>
				<FormField label="備考 (任意)" htmlFor="device-notes">
					<textarea
						id="device-notes"
						rows={3}
						placeholder="特記事項があれば入力してください"
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
					></textarea>
				</FormField>
			</Modal>
		</>
	);
}
