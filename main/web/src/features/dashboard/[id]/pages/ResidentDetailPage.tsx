import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeviceStatusPanel } from "@/features/dashboard/[id]/components/DeviceStatusPanel";
import { ResponseHistoryTable } from "@/features/dashboard/components/ResponseHistoryTable";
import { residentAge } from "@/features/dashboard/lib/resident-profile";
import {
	getDashboardResident,
	getResidentActivity,
} from "@/features/dashboard/server/dashboard-service";
import {
	formatDuration,
	formatJapaneseDate,
	formatSlashDateTime,
} from "@/shared/lib/date";

export async function ResidentDetailPage({ id }: { id: string }) {
	const resident = await getDashboardResident(id);
	if (!resident) notFound();
	const activity = await getResidentActivity(resident.id);

	const residentDetail = {
		name: `${resident.lastName} ${resident.firstName}`.trim() || "氏名未登録",
		age: residentAge(resident.dateOfBirth),
		room: resident.roomNumber || "居室未登録",
		birthday: formatJapaneseDate(resident.dateOfBirth),
	};

	// DB の対応記録を、表に出す文字列にする
	const history = activity.records.map((record) => ({
		id: record.id,
		startedAt: formatSlashDateTime(record.responseStartedAt),
		completedAt: formatSlashDateTime(record.completedAt),
		duration: formatDuration(record.responseStartedAt, record.completedAt),
		isActualFall: record.isActualFall,
		staff:
			`${record.staff.lastName} ${record.staff.firstName}`.trim() ||
			"氏名未登録",
		memo: record.content,
	}));
	const totalCount = activity.fallCount + activity.falseAlarmCount;

	return (
		<div className="flex flex-col gap-6">
			<div>
				<Link
					href="/dashboard"
					className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
				>
					<ArrowLeft aria-hidden="true" className="w-4 h-4" />
					一覧に戻る
				</Link>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* 入所者情報 */}
				<article className="bg-white rounded-xl border border-gray-200 p-6">
					<h2 className="text-h3 font-semibold text-gray-800 mb-4 flex items-center gap-2">
						<User aria-hidden="true" className="w-4 h-4 text-primary" />
						入所者情報
					</h2>
					<div className="flex items-center gap-4 mb-5">
						<div className="w-16 h-16 rounded-2xl bg-primary-bg flex items-center justify-center text-primary-dark font-bold text-2xl shrink-0">
							{residentDetail.name.charAt(0)}
						</div>
						<div>
							<p className="text-xl font-bold text-gray-900">
								{residentDetail.name}
							</p>
							<p className="text-sm text-gray-400">{residentDetail.age}歳</p>
						</div>
					</div>
					<dl className="text-sm space-y-3 mb-5">
						<div className="flex justify-between">
							<dt className="text-gray-500">居室番号</dt>
							<dd className="text-gray-800 font-semibold">
								{residentDetail.room}
							</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-gray-500">生年月日</dt>
							<dd className="text-gray-800 font-semibold">
								{residentDetail.birthday}
							</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-gray-500">年齢</dt>
							<dd className="text-gray-800 font-semibold">
								{residentDetail.age}歳
							</dd>
						</div>
					</dl>

					{/* 対応記録の件数（スタッフが記録した結果。AI の判定件数ではない） */}
					<dl className="grid grid-cols-3 divide-x divide-gray-200 rounded-xl bg-gray-50 py-4 text-center">
						<div>
							<dd className="text-2xl font-bold text-alarm">
								{activity.fallCount}
							</dd>
							<dt className="text-xs text-gray-500">転倒</dt>
						</div>
						<div>
							<dd className="text-2xl font-bold text-gray-500">
								{activity.falseAlarmCount}
							</dd>
							<dt className="text-xs text-gray-500">誤検知</dt>
						</div>
						<div>
							<dd className="text-2xl font-bold text-primary">{totalCount}</dd>
							<dt className="text-xs text-gray-500">合計</dt>
						</div>
					</dl>
				</article>

				<DeviceStatusPanel device={activity.device} />
			</div>

			<ResponseHistoryTable history={history} totalCount={totalCount} />
		</div>
	);
}
