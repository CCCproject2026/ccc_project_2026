import { ChevronLeft, User } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getElder } from "@/features/elder-management/server/elder-service";
import { residentAge } from "@/features/dashboard/lib/resident-profile";
import { requireStaffPage } from "@/shared/lib/auth";
import { formatJapaneseDate } from "@/shared/lib/date";

export async function ResidentDetailPage({ id }: { id: string }) {
	await requireStaffPage();
	const resident = await getElder(id);
	if (!resident) notFound();
	const residentDetail = {
		name: `${resident.lastName} ${resident.firstName}`.trim() || "氏名未登録",
		age: residentAge(resident.dateOfBirth),
		room: resident.roomNumber || "居室未登録",
		birthday: formatJapaneseDate(resident.dateOfBirth),
	};

	return (
		<>
			{/* Back link */}
			<div className="mb-4">
				<Link
					href="/dashboard"
					className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
				>
					<ChevronLeft className="w-4 h-4" />
					ダッシュボードに戻る
				</Link>
			</div>

			{/* 一覧と同じ DB の高齢者情報を表示する。 */}
			<div className="grid grid-cols-1 gap-6 mb-6">
				{/* 入所者情報 */}
				<article className="bg-white rounded-xl border border-gray-200 p-6">
					<h2 className="text-h3 font-semibold text-gray-800 mb-4 flex items-center gap-2">
						<User className="w-4 h-4 text-primary" />
						入所者情報
					</h2>
					<div className="flex items-center gap-3 mb-5">
						<div className="w-12 h-12 rounded-full bg-primary-bg flex items-center justify-center text-primary-dark font-bold text-lg shrink-0">
							{residentDetail.name.charAt(0)}
						</div>
						<div>
							<p className="text-xl font-bold text-gray-900">
								{residentDetail.name}
							</p>
							<p className="text-sm text-gray-400">{residentDetail.age}歳</p>
						</div>
					</div>
					<div className="text-sm space-y-3 border-t border-gray-100 pt-4 mb-5">
						<div className="flex justify-between">
							<span className="text-gray-500">居室番号</span>
							<span className="text-gray-800 font-medium">
								{residentDetail.room}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-500">生年月日</span>
							<span className="text-gray-800 font-medium">
								{residentDetail.birthday}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-500">年齢</span>
							<span className="text-gray-800 font-medium">
								{residentDetail.age}歳
							</span>
						</div>
					</div>
				</article>
			</div>
			{/* DB の入居者に無関係なモックの端末・対応履歴を紐づけない。別タスクで連携する。 */}
		</>
	);
}
