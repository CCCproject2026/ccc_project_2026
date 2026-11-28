"use client";

import { HiOutlineArrowPath, HiOutlineXMark } from "react-icons/hi2";
import { ROLE_LABELS } from "@/features/staff-management/constants/staff.constant";
import type { StaffItem } from "@/features/staff-management/types/staff.types";
import { StaffName } from "./StaffName";

// 登録待ち（PENDING）のスタッフ一覧
interface InvitationTableProps {
	staff: StaffItem[];
	busyId: string | null; // 処理中のスタッフ（ボタンを押せなくする）
	onSync: (staff: StaffItem) => void;
	onCancel: (staff: StaffItem) => void;
}

// 照合・取消ボタン（PC とスマホで同じものを使う）
function InvitationActions({
	staff,
	busyId,
	onSync,
	onCancel,
}: {
	staff: StaffItem;
	busyId: string | null;
	onSync: (staff: StaffItem) => void;
	onCancel: (staff: StaffItem) => void;
}) {
	const isBusy = busyId !== null;
	const canSync = staff.availableActions.includes("SYNC");
	const canCancel = staff.availableActions.includes("CANCEL");

	return (
		<div className="flex items-center gap-2 justify-end">
			{canSync && (
				<button
					type="button"
					onClick={() => onSync(staff)}
					disabled={isBusy}
					className="bg-purple-50 text-[#7c3aed] hover:bg-purple-100 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
				>
					<HiOutlineArrowPath className="text-sm" />
					<span>{busyId === staff.id ? "照合中…" : "照合"}</span>
				</button>
			)}
			{canCancel && (
				<button
					type="button"
					onClick={() => onCancel(staff)}
					disabled={isBusy}
					className="bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
				>
					<HiOutlineXMark className="text-sm" />
					<span>取消</span>
				</button>
			)}
		</div>
	);
}

export function InvitationTable({
	staff,
	busyId,
	onSync,
	onCancel,
}: InvitationTableProps) {
	if (staff.length === 0) {
		return (
			<div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-sm text-slate-400">
				登録待ちのスタッフはいません
			</div>
		);
	}

	return (
		<div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
			{/* PC：表 */}
			<table className="hidden md:table w-full text-left text-xs border-collapse">
				<thead>
					<tr className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
						<th className="py-4 px-6">スタッフ</th>
						<th className="py-4 px-6">権限ロール</th>
						<th className="py-4 px-6">状態</th>
						<th className="py-4 px-6 text-right">操作</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-slate-50">
					{staff.map((item) => (
						<tr key={item.id} className="hover:bg-purple-50/20 transition">
							<td className="py-4 px-6">
								<StaffName staff={item} />
							</td>
							<td className="py-4 px-6 text-slate-600 font-semibold">
								{ROLE_LABELS[item.role]}
							</td>
							<td className="py-4 px-6">
								<span className="bg-amber-50 text-amber-700 text-[11px] font-bold px-2 py-1 rounded-md">
									登録待ち
								</span>
							</td>
							<td className="py-4 px-6">
								<InvitationActions
									staff={item}
									busyId={busyId}
									onSync={onSync}
									onCancel={onCancel}
								/>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{/* スマホ：カード */}
			<div className="md:hidden divide-y divide-slate-100">
				{staff.map((item) => (
					<div key={item.id} className="p-4 space-y-3">
						<StaffName staff={item} />
						<div className="flex items-center gap-2 text-xs">
							<span className="text-slate-600 font-semibold">
								{ROLE_LABELS[item.role]}
							</span>
							<span className="bg-amber-50 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded-md">
								登録待ち
							</span>
						</div>
						<InvitationActions
							staff={item}
							busyId={busyId}
							onSync={onSync}
							onCancel={onCancel}
						/>
					</div>
				))}
			</div>
		</div>
	);
}
