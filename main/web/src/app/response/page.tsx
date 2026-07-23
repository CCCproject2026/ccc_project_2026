import { ResponseRecordForm } from "@/features/response/components/ResponseRecordForm";
import { Sidebar } from "@/shared/layout/sidebar/Sidebar";
import { TopBar } from "@/shared/layout/TopBar";

export default function ResponsePage() {
	return (
		<div className="flex h-screen w-screen overflow-hidden bg-gray-50/60 pb-16 md:pb-0">
			<Sidebar />
			<div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
				<TopBar title="対応記録" breadcrumb="ダッシュボード" />
				<main className="flex-1 p-4 md:p-6 overflow-y-auto min-w-0 bg-transparent">
					<ResponseRecordForm />
				</main>
			</div>
		</div>
	);
}
