import { ResponseRecordForm } from "@/features/response/components/ResponseRecordForm";
import { requireStaffPage } from "@/shared/lib/auth";

export default async function ResponsePage() {
	// layout だけに頼らず、ページでも必ず確認する
	await requireStaffPage();

	// サイドバーとトップバーは (authenticated)/layout.tsx が表示する
	return <ResponseRecordForm />;
}
