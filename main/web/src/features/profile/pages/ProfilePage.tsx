import {
	HiOutlineCalendarDays,
	HiOutlineEnvelope,
	HiOutlineGlobeAsiaAustralia,
	HiOutlineIdentification,
	HiOutlineShieldCheck,
	HiOutlineUser,
} from "react-icons/hi2";
import {
	ROLE_LABELS,
	STATUS_LABELS,
} from "@/features/staff-management/constants/staff.constant";
import type {
	StaffRole,
	StaffStatus,
} from "@/features/staff-management/types/staff.types";

// マイページ（自分のスタッフ情報を見るだけ。編集はこの版ではできない）
// サーバーで表示するので、他の人の情報を取りにいく API は使わない
export type ProfileInfo = {
	lastName: string;
	firstName: string;
	email: string;
	role: StaffRole;
	status: StaffStatus;
	startDate: string; // 表示用（例: 2026年10月1日）
	endDate: string | null; // 退職日（なければ null）
	dateOfBirth: string; // 表示用
	nationality: string;
	gender: string;
};

interface ProfilePageProps {
	profile: ProfileInfo;
}

// 1行分の項目（アイコン ＋ 見出し ＋ 値）
function InfoRow({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center gap-4 py-4">
			<div className="w-10 h-10 shrink-0 rounded-xl bg-purple-50 text-[#7c3aed] flex items-center justify-center text-lg">
				{icon}
			</div>
			<div className="min-w-0">
				<dt className="text-xs text-slate-400">{label}</dt>
				<dd className="text-sm font-bold text-slate-900 break-all">{value}</dd>
			</div>
		</div>
	);
}

export function ProfilePage({ profile }: ProfilePageProps) {
	const displayName = `${profile.lastName} ${profile.firstName}`;
	const initial = profile.lastName.charAt(0) || profile.firstName.charAt(0);
	const isNurse = profile.role === "NURSE";

	return (
		<div className="space-y-6 max-w-[720px] w-full mx-auto">
			<h2 className="text-2xl font-bold text-slate-900">マイページ</h2>

			{/* 名前とロール */}
			<div className="bg-white rounded-2xl border border-purple-100/50 p-6 flex items-center gap-5">
				<div
					className={`w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center text-2xl font-bold ${
						isNurse
							? "bg-amber-100 text-amber-700"
							: "bg-purple-100 text-[#7c3aed]"
					}`}
				>
					{initial}
				</div>
				<div className="min-w-0">
					<p className="text-xl font-bold text-slate-900">{displayName}</p>
					<div className="flex flex-wrap items-center gap-2 mt-1">
						<span
							className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
								isNurse
									? "bg-amber-50 text-amber-700"
									: "bg-purple-50 text-[#7c3aed]"
							}`}
						>
							{ROLE_LABELS[profile.role]}
						</span>
						<span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded-md">
							{STATUS_LABELS[profile.status]}
						</span>
					</div>
				</div>
			</div>

			{/* スタッフ情報 */}
			<section className="bg-white rounded-2xl border border-slate-100 px-6">
				<h3 className="pt-5 text-sm font-bold text-slate-500">スタッフ情報</h3>
				<dl className="divide-y divide-slate-100">
					<InfoRow
						icon={<HiOutlineEnvelope />}
						label="メールアドレス"
						value={profile.email}
					/>
					<InfoRow
						icon={<HiOutlineShieldCheck />}
						label="権限ロール"
						value={ROLE_LABELS[profile.role]}
					/>
					<InfoRow
						icon={<HiOutlineIdentification />}
						label="入職日"
						value={profile.startDate}
					/>
					{profile.endDate !== null && (
						<InfoRow
							icon={<HiOutlineIdentification />}
							label="退職日"
							value={profile.endDate}
						/>
					)}
					<InfoRow
						icon={<HiOutlineCalendarDays />}
						label="生年月日"
						value={profile.dateOfBirth}
					/>
					<InfoRow
						icon={<HiOutlineGlobeAsiaAustralia />}
						label="国籍"
						value={profile.nationality}
					/>
					<InfoRow
						icon={<HiOutlineUser />}
						label="性別"
						value={profile.gender}
					/>
				</dl>
			</section>

			<p className="text-xs text-slate-400">
				登録内容を変更したい場合は、管理者（看護師）に連絡してください。
			</p>
		</div>
	);
}
