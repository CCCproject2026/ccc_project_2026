import {
	HiOutlineShieldCheck,
	HiOutlineUser,
	HiOutlineUserGroup,
} from "react-icons/hi2";
import type { StaffItem } from "@/features/staff-management/types/staff.types";

interface StaffSummaryCardsProps {
	staff: StaffItem[]; // 利用中（ACTIVE）のスタッフ
}

export function StaffSummaryCards({ staff }: StaffSummaryCardsProps) {
	// ロールごとの人数を数える
	let nurseCount = 0;
	let caregiverCount = 0;
	for (const item of staff) {
		if (item.role === "NURSE") {
			nurseCount = nurseCount + 1;
		} else {
			caregiverCount = caregiverCount + 1;
		}
	}

	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
			<div className="bg-white p-5 rounded-2xl border border-purple-100/50 shadow-xs flex items-center space-x-4">
				<div className="w-12 h-12 rounded-xl bg-purple-50 text-[#7c3aed] flex items-center justify-center text-xl">
					<HiOutlineUserGroup />
				</div>
				<div>
					<div className="text-2xl font-bold text-slate-900">
						{staff.length}
					</div>
					<div className="text-xs text-slate-400 mt-0.5">利用中のスタッフ</div>
				</div>
			</div>

			<div className="bg-white p-5 rounded-2xl border border-purple-100/50 shadow-xs flex items-center space-x-4">
				<div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-xl">
					<HiOutlineShieldCheck />
				</div>
				<div>
					<div className="text-2xl font-bold text-slate-900">{nurseCount}</div>
					<div className="text-xs text-slate-400 mt-0.5">看護師（管理者）</div>
				</div>
			</div>

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
}
