"use client";

import { type FormEvent, useState } from "react";
import { FormField } from "@/shared/ui/FormField";
import { FormModal } from "@/shared/ui/FormModal";
import { useCreateDevice } from "../hooks/useDevices";
import { deviceErrorMessage } from "../lib/device-error-message";
import { formatDeviceLabel } from "../lib/device-format";
import { deviceCreateSchema } from "../schemas/device-input";

// デバイスの登録（詳細設計 03 の8章）
// 入力はデバイス名とデバイスコードの2つ。状態は必ず「利用中」で登録される
// 「登録する」を押すこと自体が確認になるため、確認ダイアログは出さない

const INPUT_CLASS =
	"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500";

interface DeviceRegisterModalProps {
	open: boolean;
	onClose: () => void;
	onRegistered: (message: string) => void;
}

export function DeviceRegisterModal(props: DeviceRegisterModalProps) {
	// 閉じたら入力を消す（次に開いたときに前の入力が残らないようにする）
	if (!props.open) {
		return null;
	}
	return <RegisterForm {...props} />;
}

type FieldErrors = { deviceName?: string; deviceCode?: string };

function RegisterForm({ onClose, onRegistered }: DeviceRegisterModalProps) {
	const [deviceName, setDeviceName] = useState("");
	const [deviceCode, setDeviceCode] = useState("");
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const createMutation = useCreateDevice();

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setFormError(null);

		// サーバーと同じスキーマで先に確認する（サーバーでも必ず確認される）
		const parsed = deviceCreateSchema.safeParse({ deviceName, deviceCode });
		if (!parsed.success) {
			const errors: FieldErrors = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path[0];
				if (key === "deviceName" && errors.deviceName === undefined) {
					errors.deviceName = issue.message;
				}
				if (key === "deviceCode" && errors.deviceCode === undefined) {
					errors.deviceCode = issue.message;
				}
			}
			setFieldErrors(errors);
			return;
		}
		setFieldErrors({});

		try {
			const created = await createMutation.mutateAsync(parsed.data);
			onRegistered(`${formatDeviceLabel(created)} を登録しました。`);
		} catch (error) {
			setFormError(deviceErrorMessage(error));
		}
	};

	return (
		<FormModal
			open
			onClose={onClose}
			title="デバイス登録"
			formId="device-register-form"
			onSubmit={handleSubmit}
			submitLabel="登録する"
			submittingLabel="登録中..."
			isSubmitting={createMutation.isPending}
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
				htmlFor="device-name"
				error={fieldErrors.deviceName}
				required
			>
				<input
					id="device-name"
					type="text"
					value={deviceName}
					onChange={(e) => setDeviceName(e.target.value)}
					placeholder="例: 301号室 ベッド横センサー"
					maxLength={50}
					aria-invalid={fieldErrors.deviceName !== undefined}
					className={INPUT_CLASS}
				/>
			</FormField>
			<FormField
				label="デバイスコード"
				htmlFor="device-code"
				error={fieldErrors.deviceCode}
				required
			>
				<input
					id="device-code"
					type="text"
					value={deviceCode}
					onChange={(e) => setDeviceCode(e.target.value)}
					placeholder="例: ESP32-001"
					autoComplete="off"
					spellCheck={false}
					aria-invalid={fieldErrors.deviceCode !== undefined}
					aria-describedby="device-code-help"
					className={`${INPUT_CLASS} font-mono`}
				/>
				<p id="device-code-help" className="text-xs text-gray-500 mt-1">
					本体のラベルと同じコードを、英大文字で入力してください（例:
					ESP32-001）。一度使ったコードは、停止中のデバイスのものでも使えません。
				</p>
			</FormField>
		</FormModal>
	);
}
