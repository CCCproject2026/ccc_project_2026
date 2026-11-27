import Link from "next/link";

export default function DeviceNotFound() {
	return (
		<div className="p-6 text-center">
			<p>指定されたデバイスが見つかりませんでした。</p>
			<Link
				href="/devices"
				className="mt-4 inline-block text-violet-600 hover:underline"
			>
				デバイス一覧に戻る
			</Link>
		</div>
	);
}
