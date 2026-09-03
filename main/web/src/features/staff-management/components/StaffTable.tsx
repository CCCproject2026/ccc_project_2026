import React from "react";
import { HiOutlineTrash } from "react-icons/hi2";
import { RoleType, StaffMember } from "../types/staff.types";
import { RolePicker } from "./RolePicker";

interface StaffTableProps {
	staffList: StaffMember[];
	onRoleChange: (id: string, newRole: RoleType) => void;
	onDelete: (id: string) => void;
	currentUserId: string;
}

export const StaffTable = ({
	staffList,
	onRoleChange,
	onDelete,
	currentUserId,
}: StaffTableProps) => {
	return (
		<div>
			<h2 className="text-lg font-bold mb-4">スタッフ一覧</h2>

			{/* Desktop Table */}
			<div className="hidden md:block overflow-x-auto">
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
							const isSelf = staff.id === currentUserId;

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

											{isSelf && (
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
										<RolePicker
											value={staff.role}
											onChange={(newRole) => onRoleChange(staff.id, newRole)}
											disabled={isSelf}
										/>
									</td>

									{/* Delete Action */}
									<td className="py-4 px-6 text-right">
										{!isSelf && (
											<button
												type="button"
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

			{/* Mobile Cards */}
			<div className="md:hidden space-y-4 p-4">
				{staffList.map((staff) => {
					const isSelf = staff.id === currentUserId;
					const isAdmin = staff.role === "看護師（管理者）";
					const initial = staff.name.charAt(0);

					return (
						<div
							key={staff.id}
							className="border rounded-xl p-4 shadow-sm bg-white space-y-3"
						>
							{/* Avatar + Name */}
							<div className="flex items-center space-x-3">
								<div
									className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
										isAdmin
											? "bg-amber-100 text-amber-700"
											: "bg-purple-100 text-[#7c3aed]"
									}`}
								>
									{initial}
								</div>

								<div className="flex items-center space-x-2">
									<span className="font-bold text-slate-900 text-base">
										{staff.name}
									</span>

									{isSelf && (
										<span className="bg-purple-100 text-[#7c3aed] text-[10px] font-bold px-2 py-0.5 rounded-md">
											自分
										</span>
									)}
								</div>
							</div>

							{/* ID */}
							<div className="text-sm text-slate-500 font-mono">
								ID: {staff.id}
							</div>

							{/* RolePicker */}
							<div>
								<RolePicker
									value={staff.role}
									onChange={(newRole) => onRoleChange(staff.id, newRole)}
									disabled={isSelf}
								/>
							</div>

							{/* Delete Button */}
							<div className="pt-2">
								{!isSelf ? (
									<button
										type="button"
										onClick={() => onDelete(staff.id)}
										className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 transition cursor-pointer"
									>
										<HiOutlineTrash className="text-sm" />
										<span>削除</span>
									</button>
								) : (
									<span className="text-gray-400 text-xs">自分は削除不可</span>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
