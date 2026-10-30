import { cookies } from "next/headers";
import { getMockAlarmData } from "@/features/dashboard/constants/mockDashboardData";
import { Sidebar } from "@/shared/layout/sidebar/Sidebar";
import { SidebarProvider } from "@/shared/layout/sidebar/SidebarContext";
import { SIDEBAR_COLLAPSED_COOKIE } from "@/shared/layout/sidebar/sidebarCookie";
import { TopBarClient } from "@/shared/layout/TopBarClient";
import { requireStaffPage } from "@/shared/lib/auth";

export default async function AuthenticatedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// ACTIVE なスタッフ以外は、ここで案内ページへ移動する
	// （各ページでも同じチェックをする。layout だけに頼らない）
	const loginUser = await requireStaffPage();

	const count = getMockAlarmData().count ?? 0;

	// サーバーの時点で開閉状態を決めて、再読み込みしたときに表示がちらつかないようにする
	const cookieStore = await cookies();
	const initialCollapsed =
		cookieStore.get(SIDEBAR_COLLAPSED_COOKIE)?.value === "true";

	return (
		<SidebarProvider initialCollapsed={initialCollapsed}>
			{/* h-dvh: スマホのアドレスバーの分を除いた高さに合わせる */}
			<div className="flex h-dvh w-screen overflow-hidden bg-gray-50/60">
				<Sidebar
					role={loginUser.role}
					lastName={loginUser.lastName}
					firstName={loginUser.firstName}
					alarmCount={count}
				/>

				<div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
					<TopBarClient count={count} />

					<main className="flex-1 p-4 md:p-6 overflow-y-auto min-w-0 bg-transparent flex flex-col gap-4 md:gap-5">
						{children}
					</main>
				</div>
			</div>
		</SidebarProvider>
	);
}
