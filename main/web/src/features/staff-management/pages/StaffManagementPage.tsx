"use client";

import { useState } from "react";
import { HiOutlinePlus } from "react-icons/hi2";
import { StaffSummaryCards } from "../components/StaffSummaryCards";
import { StaffTable } from "../components/StaffTable";
import { INITIAL_STAFF_LIST } from "../constants/staff.constans";
import { RoleType, StaffMember } from "../types/staff.types";

export function StaffManagementPage() {
	const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF_LIST);

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
	const currentUserId = "staff-001"; // モックでOK、後で認証と接続
	// staffList に isSelf を付与する
	const staffListWithSelf = staffList.map((staff) => ({
		...staff,
		isSelf: staff.id === currentUserId,
	}));

	return (
		<div className="space-y-6 max-w-7xl w-full mx-auto">
			{/* Title & Action Button Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold text-slate-900">スタッフ管理</h2>
					<p className="text-xs text-slate-500 mt-1">
						システムにアクセスできるスタッフの一覧と権限を管理します
					</p>
				</div>

				<button
					type="button"
					className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-purple-200 flex items-center space-x-2 transition cursor-pointer"
				>
					<HiOutlinePlus className="text-base" />
					<span>スタッフ追加</span>
				</button>
			</div>

			{/* Summary Cards */}
			<StaffSummaryCards staffList={staffListWithSelf} />

			{/* Staff Table */}
			<StaffTable
				staffList={staffListWithSelf}
				onDelete={handleDelete}
				onRoleChange={handleRoleChange}
				currentUserId={currentUserId}
			/>
		</div>
	);
}
