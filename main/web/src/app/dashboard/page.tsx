// src/app/dashboard/page.tsx

import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";

export default function DashboardRoute() {
	// 外枠は layout.tsx が担当するため、中身だけをシンプルにレンダリングします
	return <DashboardPage />;
}
