import "server-only";
import type { DeviceOperationAction, DeviceStatus } from "@prisma/client";
import type { Tx } from "./device-db";

// デバイス管理の操作の監査記録（詳細設計 03 の10章）
// - 業務データの更新と同じトランザクションで DeviceOperationLog に INSERT する
// - INSERT に失敗したら、トランザクション全体が取り消され、操作も行われない
// - 氏名・部屋番号・deviceName の値・トークンは記録しない

type DeviceSnapshot = {
	status: DeviceStatus;
	deviceCode: string;
};

type ChangedField = "deviceName" | "deviceCode";

export type DeviceOperationEntry = {
	actorId: string; // 操作したスタッフ（User.id）
	action: DeviceOperationAction;
	deviceId: string; // 故障交換では旧デバイス
	newDeviceId?: string; // 故障交換の新デバイス
	elderId?: string; // 付け替えでは変更後の高齢者
	previousElderId?: string; // 付け替えの変更前の高齢者
	endedAssignmentId?: string;
	createdAssignmentId?: string;
	before?: DeviceSnapshot;
	after?: DeviceSnapshot & { changedFields?: ChangedField[] };
};

// 許可した項目だけを取り出す（受け取ったオブジェクトをそのまま保存しない）
function pickSnapshot(snapshot: DeviceSnapshot | undefined) {
	if (snapshot === undefined) {
		return undefined;
	}
	return { status: snapshot.status, deviceCode: snapshot.deviceCode };
}

export async function recordDeviceOperation(
	tx: Tx,
	entry: DeviceOperationEntry,
) {
	const before = pickSnapshot(entry.before);
	let after: Record<string, unknown> | undefined;
	if (entry.after !== undefined) {
		after = { ...pickSnapshot(entry.after) };
		if (entry.after.changedFields !== undefined) {
			after.changedFields = entry.after.changedFields;
		}
	}

	return tx.deviceOperationLog.create({
		data: {
			actorId: entry.actorId,
			action: entry.action,
			deviceId: entry.deviceId,
			newDeviceId: entry.newDeviceId,
			elderId: entry.elderId,
			previousElderId: entry.previousElderId,
			endedAssignmentId: entry.endedAssignmentId,
			createdAssignmentId: entry.createdAssignmentId,
			// undefined の項目は NULL として保存される
			before,
			after: after as object | undefined,
		},
	});
}

type RecordedLog = Awaited<ReturnType<typeof recordDeviceOperation>>;

// 補助の標準出力ログ。開発中と障害調査の確認用で、監査記録ではない
// トランザクションの確定（commit）の後に呼ぶ。失敗しても操作は失敗にしない
export function printDeviceOperation(log: RecordedLog | null) {
	if (log === null) {
		return;
	}
	try {
		console.info(
			JSON.stringify({
				type: "device_op",
				at: log.occurredAt.toISOString(),
				logId: log.id,
				actorId: log.actorId,
				action: log.action,
				deviceId: log.deviceId,
				newDeviceId: log.newDeviceId,
				elderId: log.elderId,
				previousElderId: log.previousElderId,
				endedAssignmentId: log.endedAssignmentId,
				createdAssignmentId: log.createdAssignmentId,
				before: log.before,
				after: log.after,
			}),
		);
	} catch {
		// 標準出力の失敗は無視する（記録は DB にある）
	}
}
