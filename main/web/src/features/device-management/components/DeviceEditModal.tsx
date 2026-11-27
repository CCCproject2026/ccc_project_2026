"use client";

import { type FormEvent, useState } from "react";
import { FormField } from "@/shared/ui/FormField";
import { FormModal } from "@/shared/ui/FormModal";
import { useUpdateDevice } from "../hooks/useDevices";
import { deviceErrorMessage, isConflict } from "../lib/device-error-message";
import { deviceCodeSchema, deviceNameSchema } from "../schemas/device-input";
import type { DeviceDetail } from "../types/device.types";

// デバイスの名前・コードの編集（詳細設計 03 の5章）
// - 画面を開いたときの updatedAt を expectedUpdatedAt として送る（楽観的ロック）
// - 変えた項目だけを送る（旧形式のコードのデバイスでも、名前だけを直せるようにするため）
// - コードは、一度も割り当てたことがないデバイスだけ変更できる

const INPUT_CLASS =
	"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 disabled:bg-gray-100 disabled:text-gray-500";

interface DeviceEditModalProps {
	device: DeviceDetail | null; // null なら閉じている
	onClose: () => void;
	onSaved: (message: string) => void;
}

export function DeviceEditModal({
	device,
	onClose,
	onSaved,
}: DeviceEditModalProps) {
	// フォームの上に出すエラー。409 で入力欄を作り直しても消えないように、ここで持つ
	const [formError, setFormError] = useState<string | null>(null);

	if (device === null) {
		return null;
	}
	const close = () => {
		setFormError(null);
		onClose();
	};
	// key に updatedAt を入れ、最新の内容を取り直したら入力欄も初期化する
	return (
		<EditForm
			key={device.updatedAt}
			device={device}
			formError={formError}
			setFormError={setFormError}
			onClose={close}
			onSaved={(message) => {
				setFormError(null);
				onSaved(message);
			}}
		/>
	);
}

type FieldErrors = { deviceName?: string; deviceCode?: string };

function EditForm({
	device,
	formError,
	setFormError,
	onClose,
	onSaved,
}: {
	device: DeviceDetail;
	formError: string | null;
	setFormError: (message: string | null) => void;
	onClose: () => void;
	onSaved: (message: string) => void;
}) {
	const [deviceName, setDeviceName] = useState(device.deviceName);
	const [deviceCode, setDeviceCode] = useState(device.deviceCode);
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
	const updateMutation = useUpdateDevice();

	// 割当の履歴があるデバイスは、コードを変更できない（サーバーでも確認する）
	const codeLocked = device.history.length > 0;

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setFormError(null);

		const errors: FieldErrors = {};
		const input: { deviceName?: string; deviceCode?: string } = {};

		// 変えた項目だけを確認して送る
		const nameResult = deviceNameSchema.safeParse(deviceName);
		if (!nameResult.success) {
			errors.deviceName = nameResult.error.issues[0]?.message;
		} else if (nameResult.data !== device.deviceName) {
			input.deviceName = nameResult.data;
		}

		if (!codeLocked && deviceCode.trim() !== device.deviceCode) {
			const codeResult = deviceCodeSchema.safeParse(deviceCode);
			if (!codeResult.success) {
				errors.deviceCode = codeResult.error.issues[0]?.message;
			} else {
				input.deviceCode = codeResult.data;
			}
		}

		setFieldErrors(errors);
		if (errors.deviceName !== undefined || errors.deviceCode !== undefined) {
			return;
		}
		if (input.deviceName === undefined && input.deviceCode === undefined) {
			setFormError("変更された項目がありません。");
			return;
		}

		try {
			await updateMutation.mutateAsync({
				id: device.id,
				expectedUpdatedAt: device.updatedAt,
				...input,
			});
			onSaved("デバイスの情報を保存しました。");
		} catch (error) {
			let message = deviceErrorMessage(error);
			if (isConflict(error)) {
				// 詳細は再取得されるため、入力欄は最新の内容で初期化される
				message = `${message}（入力欄を最新の内容に戻しました）`;
			}
			setFormError(message);
		}
	};

	return (
		<FormModal
			open
			onClose={onClose}
			title="デバイスの編集"
			formId="device-edit-form"
			onSubmit={handleSubmit}
			submitLabel="保存する"
			isSubmitting={updateMutation.isPending}
			noValidate
		>
			{formError !== null && (
				<p
					role="alert"
					className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
				>
					{formError}
				</p>
			)}
			<FormField
				label="デバイス名"
				htmlFor="edit-device-name"
				error={fieldErrors.deviceName}
				required
			>
				<input
					id="edit-device-name"
					type="text"
					value={deviceName}
					onChange={(e) => setDeviceName(e.target.value)}
					maxLength={50}
					aria-invalid={fieldErrors.deviceName !== undefined}
					className={INPUT_CLASS}
				/>
			</FormField>
			<FormField
				label="デバイスコード"
				htmlFor="edit-device-code"
				error={fieldErrors.deviceCode}
			>
				<input
					id="edit-device-code"
					type="text"
					value={deviceCode}
					onChange={(e) => setDeviceCode(e.target.value)}
					disabled={codeLocked}
					autoComplete="off"
					spellCheck={false}
					aria-invalid={fieldErrors.deviceCode !== undefined}
					aria-describedby="edit-device-code-help"
					className={`${INPUT_CLASS} font-mono`}
				/>
				<p id="edit-device-code-help" className="text-xs text-gray-500 mt-1">
					{codeLocked
						? "割当の履歴があるため、デバイスコードは変更できません。"
						: "登録時の入力誤りを直すときだけ変更してください（例: ESP32-001）。"}
				</p>
			</FormField>
		</FormModal>
	);
}
