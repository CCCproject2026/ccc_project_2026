import { notFound } from "next/navigation";
import { getResidentDetailById } from "@/features/dashboard/constants/mockDashboardData";
import { ResidentDetailPage } from "@/features/dashboard/pages/ResidentDetailPage";

interface PageProps {
	params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
	const resolvedParams = await params;

	// ヘルパー関数を使ってURLのID（例: yamada-taro）に一致するモックデータを取得
	const residentData = getResidentDetailById(resolvedParams.id);

	// もしデータが存在しないIDだった場合は自動で404画面へ
	if (!residentData) {
		notFound();
	}

	// 詳細画面のUIシェルコンポーネントに取得したデータを渡してレンダリング
	return <ResidentDetailPage initialData={residentData} />;
}
