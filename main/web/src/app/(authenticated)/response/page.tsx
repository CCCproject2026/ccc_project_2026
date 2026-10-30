import { ResponseRecordForm } from "@/features/response/components/ResponseRecordForm";
import { Sidebar } from "@/shared/layout/sidebar/Sidebar";
import { TopBar } from "@/shared/layout/TopBar";
import { requireStaffPage } from "@/shared/lib/auth";

export default async function ResponsePage() {
	// このページは (authenticated) の外にあり layout のチェックを通らないので、必ずここで確認する
	const loginUser = await requireStaffPage();

	return (
		<div className="flex h-screen w-screen overflow-hidden bg-gray-50/60 pb-16 md:pb-0">
			<Sidebar
				role={loginUser.role}
				lastName={loginUser.lastName}
				firstName={loginUser.firstName}
			/>
			<div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
				<TopBar title="対応記録" />
				<main className="flex-1 p-4 md:p-6 overflow-y-auto min-w-0 bg-transparent">
					<ResponseRecordForm />
				</main>
			</div>
		</div>
	);
}
