"use client";

import { RoleType } from "@/features/staff-management/types/staff.types";

interface RolePickerProps {
	value: RoleType;
	onChange: (newRole: RoleType) => void;
	disabled?: boolean;
}

export function RolePicker({ value, onChange, disabled }: RolePickerProps) {
	return (
		<select
			value={value}
			onChange={(e) => onChange(e.target.value as RoleType)}
			disabled={disabled}
			className={`border rounded-lg px-3 py-1 text-xs font-semibold ${
				disabled
					? "bg-slate-100 text-slate-400 cursor-not-allowed"
					: "bg-white text-slate-700"
			}`}
		>
			<option value="看護師（管理者）">看護師（管理者）</option>
			<option value="介護士">介護士</option>
		</select>
	);
}
