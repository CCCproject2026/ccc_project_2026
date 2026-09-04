import React from "react";
import {
	HiOutlineShieldCheck,
	HiOutlineUser,
	HiOutlineUserGroup,
} from "react-icons/hi2";
import { StaffMember } from "../types/staff.types";

interface Props {
	staffList: StaffMember[];
}

export const StaffSummaryCards: React.FC<Props> = ({ staffList }) => {
	const totalCount = staffList.length;
	const adminCount = staffList.filter(
		(s) => s.role === "看護師（管理者）",
	).length;
	const caregiverCount = staffList.filter((s) => s.role === "介護士").length;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
			{/* Total Staff Card */}
			<div className="bg-white p-5 rounded-2xl border border-purple-100/50 shadow-xs flex items-center space-x-4">
				<div className="w-12 h-12 rounded-xl bg-purple-50 text-[#7c3aed] flex items-center justify-center text-xl">
					<HiOutlineUserGroup />
				</div>
				<div>
					<div className="text-2xl font-bold text-slate-900">{totalCount}</div>
					<div className="text-xs text-slate-400 mt-0.5">総スタッフ数</div>
				</div>
			</div>

			{/* Admin Nurses Card */}
			<div className="bg-white p-5 rounded-2xl border border-purple-100/50 shadow-xs flex items-center space-x-4">
				<div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-xl">
					<HiOutlineShieldCheck />
				</div>
				<div>
					<div className="text-2xl font-bold text-slate-900">{adminCount}</div>
					<div className="text-xs text-slate-400 mt-0.5">看護師（管理者）</div>
				</div>
			</div>

			{/* Caregivers Card */}
			<div className="bg-white p-5 rounded-2xl border border-purple-100/50 shadow-xs flex items-center space-x-4">
				<div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center text-xl">
					<HiOutlineUser />
				</div>
				<div>
					<div className="text-2xl font-bold text-slate-900">
						{caregiverCount}
					</div>
					<div className="text-xs text-slate-400 mt-0.5">介護士</div>
				</div>
			</div>
		</div>
	);
};
