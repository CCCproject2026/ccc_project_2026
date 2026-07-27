import React from "react";
import {
	HiOutlineShieldCheck,
	HiOutlineTrash,
	HiOutlineUser,
} from "react-icons/hi2";
import { StaffMember } from "../types/staff.types";

interface Props {
	staffList: StaffMember[];
	onDelete: (id: string) => void;
}

export const StaffTable: React.FC<Props> = ({ staffList, onDelete }) => {
	return (
		<div className="bg-white rounded-2xl border border-purple-100/50 shadow-xs overflow-hidden">
			<div className="px-6 py-4 border-b border-slate-100">
				<h3 className="font-bold text-sm text-slate-800">スタッフ一覧</h3>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-left text-xs border-collapse">
					<thead>
						<tr className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
							<th className="py-4 px-6">スタッフ</th>
							<th className="py-4 px-6">スタッフID</th>
							<th className="py-4 px-6">権限ロール</th>
							<th className="py-4 px-6 text-right">操作</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-50">
						{staffList.map((staff) => {
							const initial = staff.name.charAt(0);
							const isAdmin = staff.role === "看護師（管理者）";

							return (
								<tr key={staff.id} className="hover:bg-purple-50/20 transition">
									{/* Name + Initial Avatar */}
									<td className="py-4 px-6 flex items-center space-x-3">
										<div
											className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
												isAdmin
													? "bg-amber-100 text-amber-700"
													: "bg-purple-100 text-[#7c3aed]"
											}`}
										>
											{initial}
										</div>
										<div className="flex items-center space-x-2">
											<span className="font-bold text-slate-900">
												{staff.name}
											</span>
											{staff.isSelf && (
												<span className="bg-purple-100 text-[#7c3aed] text-[10px] font-bold px-2 py-0.5 rounded-md">
													自分
												</span>
											)}
										</div>
									</td>

									{/* ID */}
									<td className="py-4 px-6 text-slate-400 font-mono">
										{staff.id}
									</td>

									{/* Role Badge */}
									<td className="py-4 px-6">
										{isAdmin ? (
											<span className="inline-flex items-center space-x-1.5 bg-amber-100/70 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold">
												<HiOutlineShieldCheck className="text-sm" />
												<span>看護師（管理者）</span>
											</span>
										) : (
											<span className="inline-flex items-center space-x-1.5 bg-purple-100/60 text-[#7c3aed] px-3 py-1 rounded-full text-xs font-semibold">
												<HiOutlineUser className="text-sm" />
												<span>介護士</span>
											</span>
										)}
									</td>

									{/* Delete Action */}
									<td className="py-4 px-6 text-right">
										{!staff.isSelf && (
											<button
												onClick={() => onDelete(staff.id)}
												className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 ml-auto transition cursor-pointer"
											>
												<HiOutlineTrash className="text-sm" />
												<span>削除</span>
											</button>
										)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
};
