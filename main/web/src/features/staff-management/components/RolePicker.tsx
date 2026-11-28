"use client";

import { ROLE_LABELS } from "@/features/staff-management/constants/staff.constant";
import type { StaffRole } from "@/features/staff-management/types/staff.types";

interface RolePickerProps {
	value: StaffRole;
	onChange: (newRole: StaffRole) => void;
	disabled?: boolean;
	disabledReason?: string; // 押せない理由（マウスを乗せると表示される）
}

export function RolePicker({
	value,
	onChange,
	disabled,
	disabledReason,
}: RolePickerProps) {
	return (
		<select
			value={value}
			onChange={(e) => onChange(e.target.value as StaffRole)}
			disabled={disabled}
			title={disabled ? disabledReason : undefined}
			aria-label="権限ロール"
			className={`border rounded-lg px-3 py-1 text-xs font-semibold ${
				disabled
					? "bg-slate-100 text-slate-400 cursor-not-allowed"
					: "bg-white text-slate-700"
			}`}
		>
			<option value="NURSE">{ROLE_LABELS.NURSE}</option>
			<option value="CAREGIVER">{ROLE_LABELS.CAREGIVER}</option>
		</select>
	);
}
