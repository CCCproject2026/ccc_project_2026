"use client";

import { useState } from "react";
import { AddStaffModal } from "@/features/staff-management/components/AddStaffModal";
import { StaffHeader } from "@/features/staff-management/components/StaffHeader";
import { StaffTable } from "@/features/staff-management/components/StaffTable";
import { INITIAL_STAFF_LIST } from "@/features/staff-management/constants/staff.constans";
import {
	RoleType,
	StaffMember,
} from "@/features/staff-management/types/staff.types";

export default function StaffPage() {
	const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF_LIST);
	const [open, setOpen] = useState(false);

	const handleAddStaff = (newStaff: { name: string; role: RoleType }) => {
		const newId = `staff-${String(staffList.length + 1).padStart(3, "0")}`;

		const staff: StaffMember = {
			id: newId,
			name: newStaff.name,
			role: newStaff.role,
			isSelf: false,
		};

		setStaffList([...staffList, staff]);
	};

	return (
		<div className="p-6 space-y-6">
			<StaffHeader onAdd={() => setOpen(true)} />

			<StaffTable
				staffList={staffList}
				onRoleChange={(id, newRole) =>
					setStaffList((prev) =>
						prev.map((s) => (s.id === id ? { ...s, role: newRole } : s)),
					)
				}
				onDelete={(id) =>
					setStaffList((prev) => prev.filter((s) => s.id !== id))
				}
				currentUserId="staff-001"
			/>

			<AddStaffModal
				open={open}
				onClose={() => setOpen(false)}
				onSubmit={handleAddStaff}
			/>
		</div>
	);
}
