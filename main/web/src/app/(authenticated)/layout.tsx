import { Sidebar } from "@/shared/layout/sidebar/Sidebar";
import { TopBarClient } from "@/shared/layout/TopBarClient";
import { requireStaffPage } from "@/shared/lib/auth";

export default async function AuthenticatedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// ACTIVE なスタッフ以外は、ここで案内ページへ移動する
	// （ページやデータ取得処理でも認可し、layout だけに頼らない）
	const loginUser = await requireStaffPage();

	return (
		<div className="flex h-screen w-screen overflow-hidden bg-gray-50/60 pb-16 md:pb-0">
			<Sidebar
				role={loginUser.role}
				lastName={loginUser.lastName}
				firstName={loginUser.firstName}
			/>

			<div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
				{/* 通知の実データ連携までは、架空の通知バッジを表示しない。 */}
				<TopBarClient count={0} />

				<main className="flex-1 p-4 md:p-6 overflow-y-auto min-w-0 bg-transparent flex flex-col gap-4 md:gap-5">
					{children}
				</main>
			</div>
		</div>
	);
}
