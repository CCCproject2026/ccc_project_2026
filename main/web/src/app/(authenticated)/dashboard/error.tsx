"use client";

export default function DashboardError({ reset }: { reset: () => void }) {
	return (
		<div role="alert" className="rounded-xl border border-red-200 bg-white p-6">
			<p>情報を取得できませんでした。時間をおいて再度お試しください。</p>
			<button type="button" onClick={reset} className="mt-4 rounded-lg bg-primary px-4 py-2 text-white">
				再試行
			</button>
		</div>
	);
}
