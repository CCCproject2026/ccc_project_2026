import type { StaffItem } from "@/features/staff-management/types/staff.types";

// 頭文字のアイコン ＋ 氏名 ＋ メールアドレス
interface StaffNameProps {
	staff: StaffItem;
	isSelf?: boolean; // ログイン中の本人なら「自分」を表示
}

export function StaffName({ staff, isSelf }: StaffNameProps) {
	const initial = staff.displayName.charAt(0) || "?";
	const isNurse = staff.role === "NURSE";

	return (
		<div className="flex items-center space-x-3 min-w-0">
			<div
				className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-bold ${
					isNurse
						? "bg-amber-100 text-amber-700"
						: "bg-purple-100 text-[#7c3aed]"
				}`}
			>
				{initial}
			</div>
			<div className="min-w-0">
				<div className="flex items-center space-x-2">
					<span className="font-bold text-slate-900 truncate">
						{staff.displayName}
					</span>
					{isSelf && (
						<span className="shrink-0 bg-purple-100 text-[#7c3aed] text-[10px] font-bold px-2 py-0.5 rounded-md">
							自分
						</span>
					)}
				</div>
				<div className="text-xs text-slate-400 truncate">{staff.email}</div>
			</div>
		</div>
	);
}
