import "server-only";

type StateSnapshot = { status: string; role: string };

type StaffOperationLog = {
	actorId: string | null; // null = Webhook・定期処理
	targetId: string;
	action: string; // "INVITE" | "SYNC" | "CANCEL" | "REINVITE" | "ACTIVATE" | "DEACTIVATE" | "CHANGE_ROLE" | "CLERK_USER_DELETED"
	before?: StateSnapshot;
	after?: StateSnapshot;
	externalResult?: "SUCCESS" | "FAILED" | "UNKNOWN" | "SKIPPED";
};

// 許可した項目だけを出力する（プロフィール・トークン・emailは出さない）
export function logStaffOperation(log: StaffOperationLog) {
	const { actorId, targetId, action, before, after, externalResult } = log;
	console.info(
		JSON.stringify({
			type: "staff_op",
			at: new Date().toISOString(),
			actorId,
			targetId,
			action,
			before: before && { status: before.status, role: before.role },
			after: after && { status: after.status, role: after.role },
			externalResult,
		}),
	);
}
