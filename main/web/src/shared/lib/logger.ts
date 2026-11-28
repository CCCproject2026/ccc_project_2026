import "server-only";

// 運用通知。送り先（Papertrail アラート / Slack など）が決まるまではログのみ
export function notifyOps(
	event: string,
	detail: { targetId?: string; reason: string },
) {
	console.warn(
		JSON.stringify({
			type: "ops_alert",
			at: new Date().toISOString(),
			event,
			...detail,
		}),
	);
}
