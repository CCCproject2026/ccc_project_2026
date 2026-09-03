"use client";

import { useState } from "react";
import { HiOutlinePlus } from "react-icons/hi2";
import { AddStaffModal } from "@/features/staff-management/components/AddStaffModal";
import { StaffSummaryCards } from "@/features/staff-management/components/StaffSummaryCards";
import { StaffTable } from "@/features/staff-management/components/StaffTable";
import { INITIAL_STAFF_LIST } from "@/features/staff-management/constants/staff.constans";
import {
	RoleType,
	StaffMember,
} from "@/features/staff-management/types/staff.types";

export function StaffManagementPage() {
	const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF_LIST);
	const [openAddModal, setOpenAddModal] = useState(false);

	const handleDelete = (id: string) => {
		if (id === currentUserId) return; // 自分は削除不可（ロジック側ガード）
		setStaffList((prev) => prev.filter((staff) => staff.id !== id));
	};

	const handleRoleChange = (id: string, newRole: RoleType) => {
		setStaffList((prev) =>
			prev.map((staff) =>
				staff.id === id ? { ...staff, role: newRole } : staff,
			),
		);
	};

	const handleAddStaff = (newStaff: { name: string; role: RoleType }) => {
		const newId = `staff-${String(staffList.length + 1).padStart(3, "0")}`;

		const staff: StaffMember = {
			id: newId,
			name: newStaff.name,
			role: newStaff.role,
			isSelf: false,
		};

		setStaffList((prev) => [...prev, staff]);
	};

	const currentUserId = "staff-001";

	const staffListWithSelf = staffList.map((staff) => ({
		...staff,
		isSelf: staff.id === currentUserId,
	}));

	return (
		<div className="space-y-6 max-w-7xl w-full mx-auto">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold text-slate-900">スタッフ管理</h2>
				</div>

				<button
					type="button"
					onClick={() => setOpenAddModal(true)}
					className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-purple-200 flex items-center space-x-2 transition cursor-pointer"
				>
					<HiOutlinePlus className="text-base" />
					<span>スタッフ追加</span>
				</button>
			</div>

			<StaffSummaryCards staffList={staffListWithSelf} />

			<StaffTable
				staffList={staffListWithSelf}
				onDelete={handleDelete}
				onRoleChange={handleRoleChange}
				currentUserId={currentUserId}
			/>

			<AddStaffModal
				open={openAddModal}
				onClose={() => setOpenAddModal(false)}
				onSubmit={handleAddStaff}
			/>
		</div>
	);
}
