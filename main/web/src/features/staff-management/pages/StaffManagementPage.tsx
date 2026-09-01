"use client";

import { useState } from "react";
import { HiOutlinePlus } from "react-icons/hi2";
import { AddStaffModal } from "../components/AddStaffModal";
import { StaffSummaryCards } from "../components/StaffSummaryCards";
import { StaffTable } from "../components/StaffTable";
import { INITIAL_STAFF_LIST } from "../constants/staff.constans";
import { RoleType, StaffMember } from "../types/staff.types";

export function StaffManagementPage() {
	const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF_LIST);
	const [openAddModal, setOpenAddModal] = useState(false);

	const handleDelete = (id: string) => {
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

					<p className="text-xs text-slate-500 mt-1">
						システムにアクセスできるスタッフの一覧と権限を管理します
					</p>
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
