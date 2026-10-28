import {
	HiOutlineCalendarDays,
	HiOutlineEnvelope,
	HiOutlineGlobeAsiaAustralia,
	HiOutlineIdentification,
	HiOutlineShieldCheck,
	HiOutlineUser,
} from "react-icons/hi2";
import { AccountSettingsButton } from "@/features/profile/components/AccountSettingsButton";
import { EmailVerifiedBadge } from "@/features/profile/components/EmailVerifiedBadge";
import { ProfileAvatar } from "@/features/profile/components/ProfileAvatar";
import { ProfileEditButton } from "@/features/profile/components/ProfileEditButton";
import type { ProfileInfo } from "@/features/profile/types/profile.type";
import {
	getGenderLabel,
	ROLE_LABELS,
	STATUS_LABELS,
} from "@/features/staff-management/constants/staff.constant";

// マイページ（自分のスタッフ情報を見る・姓名などを編集する）
// サーバーで表示するので、他の人の情報を取りにいく API は使わない
// 画面で動かす部分（編集ボタン・アカウント情報ボタン・写真・認証バッジ）だけ components に分けている

interface ProfilePageProps {
	profile: ProfileInfo;
}

// 1行分の項目（アイコン ＋ 見出し ＋ 値 ＋ 右端のボタン）
function InfoRow({
	icon,
	label,
	value,
	badge,
	note,
	action,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	badge?: React.ReactNode; // 値のすぐ右に出すバッジ（なければ何も出さない）
	note?: string; // 値の下に出す小さな説明
	action?: React.ReactNode; // 右端に出すボタン（なければ何も出さない）
}) {
	return (
		<div className="flex items-center gap-4 py-4">
			<div className="w-10 h-10 shrink-0 rounded-xl bg-purple-50 text-[#7c3aed] flex items-center justify-center text-lg">
				{icon}
			</div>
			<div className="min-w-0 flex-1">
				<dt className="text-xs text-slate-400">{label}</dt>
				<dd className="text-sm font-bold text-slate-900 break-all">
					{value}
					{badge}
				</dd>
				{note && <dd className="text-xs text-slate-400 mt-0.5">{note}</dd>}
			</div>
			{action}
		</div>
	);
}

export function ProfilePage({ profile }: ProfilePageProps) {
	const displayName = `${profile.lastName} ${profile.firstName}`;
	const initial = profile.lastName.charAt(0) || profile.firstName.charAt(0);
	const isNurse = profile.role === "NURSE";

	return (
		<div className="space-y-6 max-w-[720px] w-full mx-auto">
			<div className="flex items-center justify-between gap-4">
				<h2 className="text-2xl font-bold text-slate-900">マイページ</h2>
				<ProfileEditButton profile={profile} />
			</div>

			{/* 写真・名前とロール ＋ アカウント情報（写真・メール・パスワードなど）の変更ボタン */}
			<div className="bg-white rounded-2xl border border-purple-100/50 p-6 flex flex-wrap items-center gap-5">
				<ProfileAvatar initial={initial} name={displayName} isNurse={isNurse} />
				<div className="min-w-0 flex-1">
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
				<AccountSettingsButton />
			</div>

			{/* スタッフ情報 */}
			<section className="bg-white rounded-2xl border border-slate-100 px-6">
				<h3 className="pt-5 text-sm font-bold text-slate-500">スタッフ情報</h3>
				<dl className="divide-y divide-slate-100">
					<InfoRow
						icon={<HiOutlineEnvelope />}
						label="メールアドレス"
						value={profile.email}
						badge={<EmailVerifiedBadge />}
						note="「アカウント情報を変更」から変更できます。反映まで少し時間がかかる場合があります"
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
						value={getGenderLabel(profile.gender)}
					/>
				</dl>
			</section>

			{/* 最終更新日時（DB の User.updatedAt） */}
			<p className="text-right text-xs text-slate-400">
				最終更新日時：{profile.updatedAt}
			</p>
		</div>
	);
}
