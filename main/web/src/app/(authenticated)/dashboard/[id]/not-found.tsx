import Link from "next/link";

export default function ResidentNotFound() {
	return (
		<div className="p-6 text-center">
			<p>指定された入所者が見つかりませんでした。</p>
			<Link href="/dashboard" className="mt-4 inline-block text-primary">ダッシュボードに戻る</Link>
		</div>
	);
}
