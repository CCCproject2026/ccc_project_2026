import "server-only";
import type { DeviceAssignment, Prisma } from "@prisma/client";
import { ApiError } from "@/shared/lib/api-error";
import { notifyOps } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import {
	type AssignableEldersQuery,
	DEVICE_CODE_PATTERN,
} from "../schemas/device-input";
import {
	type DeviceLookupResponse,
	deviceLookupResponseSchema,
} from "../schemas/device-lookup";
import type {
	AssignableEldersResponse,
	DeviceDetail,
} from "../types/device.types";
import { printDeviceOperation, recordDeviceOperation } from "./audit";
import {
	endAssignment,
	endTimeFor,
	findActiveAssignmentOfDevice,
	findActiveAssignmentOfElder,
	invalidState,
	lockDevices,
	lockElders,
	notFound,
	runDeviceTransaction,
	type Tx,
} from "./device-db";
import { getDeviceDetail } from "./device-service";

// 割当・解除・付け替え・故障交換・割当先候補・対象者の特定（詳細設計 03 の4章・5章・7章）
//
// ロックの順番（デッドロック防止）
//  1. Device 行を先、Elder 行を後にロックする
//  2. 同じ種類の行を2つロックするときは、1つの SQL で id の昇順にロックする
// 退所（lockForElderExit）も同じ順番で、割当中のデバイス → Elder 行の順にロックし、
// ロックした後に有効な割当をもう一度読む（ロック後の読み直し）

const ASSIGNMENT_CHANGED_MESSAGE =
	"割当が変更されたため、実行できませんでした。最新の状態を確認してください";

// ---- 割当（POST /api/devices/[id]/assignment） ----
// 既存の割当は自動で終了しない（古い画面から、別の入所者の監視を止めないため）

export async function assignDevice(
	actorId: string,
	deviceId: string,
	elderId: string,
): Promise<DeviceDetail> {
	const log = await runDeviceTransaction(
		async (tx) => {
			if (!(await lockDevices(tx, [deviceId])).has(deviceId)) {
				throw notFound("device", "デバイスが見つかりません");
			}
			if (!(await lockElders(tx, [elderId])).has(elderId)) {
				throw notFound("elder", "入所者が見つかりません");
			}

			const device = await tx.device.findUniqueOrThrow({
				where: { id: deviceId },
			});
			const elder = await tx.elder.findUniqueOrThrow({
				where: { id: elderId },
			});
			if (device.status !== "ACTIVE") {
				throw invalidState(
					"DEVICE_NOT_ACTIVE",
					"停止中のデバイスは割り当てられません",
				);
			}
			if (elder.status !== "ACTIVE") {
				throw invalidState(
					"ELDER_NOT_ACTIVE",
					"退所済みの入所者には割り当てられません",
				);
			}
			if ((await findActiveAssignmentOfDevice(tx, deviceId)) !== null) {
				throw invalidState(
					"DEVICE_ALREADY_ASSIGNED",
					"このデバイスは既に割り当てられています",
				);
			}
			if ((await findActiveAssignmentOfElder(tx, elderId)) !== null) {
				throw invalidState(
					"ELDER_ALREADY_ASSIGNED",
					"この入所者には既にデバイスが割り当てられています",
				);
			}

			const created = await tx.deviceAssignment.create({
				data: { deviceId, elderId, assignedAt: new Date(), unassignedAt: null },
			});
			return recordDeviceOperation(tx, {
				actorId,
				action: "ASSIGN",
				deviceId,
				elderId,
				createdAssignmentId: created.id,
			});
		},
		{ duplicateMeansAssignmentChanged: true },
	);

	printDeviceOperation(log);
	return getDeviceDetail(deviceId);
}

// ---- 解除（DELETE /api/devices/[id]/assignment?assignmentId=...） ----

export async function unassignDevice(
	actorId: string,
	deviceId: string,
	assignmentId: string,
): Promise<DeviceDetail> {
	const log = await runDeviceTransaction(async (tx) => {
		if (!(await lockDevices(tx, [deviceId])).has(deviceId)) {
			throw notFound("device", "デバイスが見つかりません");
		}
		const first = await findActiveAssignmentOfDevice(tx, deviceId);
		if (first === null) {
			throw await assignmentMismatch(tx, deviceId, assignmentId);
		}

		// 割当先の Elder 行をロックしてから、有効な割当を読み直す（退所との競合に備える）
		await lockElders(tx, [first.elderId]);
		const current = await findActiveAssignmentOfDevice(tx, deviceId);
		if (current === null || current.id !== assignmentId) {
			throw await assignmentMismatch(tx, deviceId, assignmentId);
		}

		await endAssignment(tx, current.id, endTimeFor(current.assignedAt));
		return recordDeviceOperation(tx, {
			actorId,
			action: "UNASSIGN",
			deviceId,
			elderId: current.elderId,
			endedAssignmentId: current.id,
		});
	});

	printDeviceOperation(log);
	return getDeviceDetail(deviceId);
}

// 指定された割当が現在の割当と一致しないときのエラー
// このデバイスの割当として存在しない ID なら 404、過去の割当なら 409
async function assignmentMismatch(
	tx: Tx,
	deviceId: string,
	assignmentId: string,
): Promise<ApiError> {
	const exists = await tx.deviceAssignment.findFirst({
		where: { id: assignmentId, deviceId },
		select: { id: true },
	});
	if (exists === null) {
		return notFound("assignment", "割当が見つかりません");
	}
	return invalidState("ASSIGNMENT_CHANGED", ASSIGNMENT_CHANGED_MESSAGE);
}

// ---- 付け替え（PUT /api/devices/[id]/assignment） ----
// 同じデバイスを別の高齢者へ移す。旧割当を終了する前に、新しい割当先の前提をすべて確認する

export async function transferDevice(
	actorId: string,
	deviceId: string,
	newElderId: string,
	expectedAssignmentId: string,
): Promise<DeviceDetail> {
	const log = await runDeviceTransaction(
		async (tx) => {
			// 1. Device 行をロックする
			if (!(await lockDevices(tx, [deviceId])).has(deviceId)) {
				throw notFound("device", "デバイスが見つかりません");
			}
			// 2. 有効な割当から、変更前の高齢者を得る
			const first = await findActiveAssignmentOfDevice(tx, deviceId);
			if (first === null) {
				throw invalidState("ASSIGNMENT_CHANGED", ASSIGNMENT_CHANGED_MESSAGE);
			}
			// 3. 変更前と同じ高齢者は指定できない
			if (first.elderId === newElderId) {
				throw invalidState(
					"SAME_TARGET",
					"現在の割当先と同じ入所者は指定できません",
				);
			}
			// 4. 変更前・変更後の Elder 行を id の昇順にロックする
			const lockedElders = await lockElders(tx, [first.elderId, newElderId]);
			if (!lockedElders.has(newElderId)) {
				throw notFound("elder", "入所者が見つかりません");
			}
			// 5. 有効な割当を読み直し、画面が見ていた割当と同じか確認する
			const current = await findActiveAssignmentOfDevice(tx, deviceId);
			if (current === null || current.id !== expectedAssignmentId) {
				throw invalidState("ASSIGNMENT_CHANGED", ASSIGNMENT_CHANGED_MESSAGE);
			}
			// 読み直しの間に、割当先が変わっていた場合も競合として扱う
			if (current.elderId !== first.elderId) {
				throw invalidState("ASSIGNMENT_CHANGED", ASSIGNMENT_CHANGED_MESSAGE);
			}

			// 6. 新しい割当先の前提をすべて確認する
			const device = await tx.device.findUniqueOrThrow({
				where: { id: deviceId },
			});
			if (device.status !== "ACTIVE") {
				throw invalidState(
					"DEVICE_NOT_ACTIVE",
					"停止中のデバイスは付け替えられません",
				);
			}
			const newElder = await tx.elder.findUniqueOrThrow({
				where: { id: newElderId },
			});
			if (newElder.status !== "ACTIVE") {
				throw invalidState(
					"ELDER_NOT_ACTIVE",
					"退所済みの入所者には割り当てられません",
				);
			}
			if ((await findActiveAssignmentOfElder(tx, newElderId)) !== null) {
				throw invalidState(
					"ELDER_ALREADY_ASSIGNED",
					"変更後の入所者には既にデバイスが割り当てられています",
				);
			}

			// 7. 旧割当を終了してから、新しい割当を作る（逆にすると部分一意インデックスに違反する）
			const switchAt = endTimeFor(current.assignedAt);
			await endAssignment(tx, current.id, switchAt);
			const created = await tx.deviceAssignment.create({
				data: { deviceId, elderId: newElderId, assignedAt: switchAt },
			});
			return recordDeviceOperation(tx, {
				actorId,
				action: "TRANSFER",
				deviceId,
				elderId: newElderId,
				previousElderId: current.elderId,
				endedAssignmentId: current.id,
				createdAssignmentId: created.id,
			});
		},
		{ duplicateMeansAssignmentChanged: true },
	);

	printDeviceOperation(log);
	return getDeviceDetail(deviceId);
}

// ---- 故障交換（POST /api/devices/[id]/replacement） ----
// 高齢者が使うデバイスを予備へ交換する。旧デバイスは必ず INACTIVE になる

export async function replaceDevice(
	actorId: string,
	oldDeviceId: string,
	newDeviceId: string,
	expectedAssignmentId: string,
): Promise<DeviceDetail> {
	// 1. 旧と新が同じなら、ロックを取らずに 409
	if (oldDeviceId === newDeviceId) {
		throw invalidState(
			"SAME_TARGET",
			"交換先に、交換するデバイス自身は指定できません",
		);
	}

	const log = await runDeviceTransaction(
		async (tx) => {
			// 2. 旧・新の Device 行を id の昇順にロックする
			const lockedDevices = await lockDevices(tx, [oldDeviceId, newDeviceId]);
			if (!lockedDevices.has(oldDeviceId)) {
				throw notFound("device", "デバイスが見つかりません");
			}
			if (!lockedDevices.has(newDeviceId)) {
				throw notFound("newDevice", "交換先のデバイスが見つかりません");
			}
			// 3. 旧デバイスの有効な割当から、高齢者を得る
			const first = await findActiveAssignmentOfDevice(tx, oldDeviceId);
			if (first === null) {
				throw invalidState("ASSIGNMENT_CHANGED", ASSIGNMENT_CHANGED_MESSAGE);
			}
			// 4. その Elder 行をロックする
			await lockElders(tx, [first.elderId]);
			// 5. 有効な割当を読み直し、画面が見ていた割当と同じか確認する
			const current = await findActiveAssignmentOfDevice(tx, oldDeviceId);
			if (
				current === null ||
				current.id !== expectedAssignmentId ||
				current.elderId !== first.elderId
			) {
				throw invalidState("ASSIGNMENT_CHANGED", ASSIGNMENT_CHANGED_MESSAGE);
			}

			// 6. 新しい割当先の前提をすべて確認する
			const newDevice = await tx.device.findUniqueOrThrow({
				where: { id: newDeviceId },
			});
			if (newDevice.status !== "ACTIVE") {
				throw invalidState(
					"NEW_DEVICE_NOT_ACTIVE",
					"交換先のデバイスが停止中です",
				);
			}
			if ((await findActiveAssignmentOfDevice(tx, newDeviceId)) !== null) {
				throw invalidState(
					"NEW_DEVICE_ALREADY_ASSIGNED",
					"交換先のデバイスは既に割り当てられています",
				);
			}
			const elder = await tx.elder.findUniqueOrThrow({
				where: { id: current.elderId },
			});
			if (elder.status !== "ACTIVE") {
				throw invalidState(
					"ELDER_NOT_ACTIVE",
					"退所済みの入所者には割り当てられません",
				);
			}

			// 7. 旧割当の終了 → 旧デバイスを INACTIVE → 新しい割当の作成
			// deviceCode は旧・新どちらも変更しない
			const oldDevice = await tx.device.findUniqueOrThrow({
				where: { id: oldDeviceId },
			});
			const switchAt = endTimeFor(current.assignedAt);
			await endAssignment(tx, current.id, switchAt);
			const deactivated = await tx.device.update({
				where: { id: oldDeviceId },
				data: { status: "INACTIVE" },
			});
			const created = await tx.deviceAssignment.create({
				data: {
					deviceId: newDeviceId,
					elderId: current.elderId,
					assignedAt: switchAt,
				},
			});
			return recordDeviceOperation(tx, {
				actorId,
				action: "REPLACE",
				deviceId: oldDeviceId,
				newDeviceId,
				elderId: current.elderId,
				endedAssignmentId: current.id,
				createdAssignmentId: created.id,
				before: { status: oldDevice.status, deviceCode: oldDevice.deviceCode },
				after: {
					status: deactivated.status,
					deviceCode: deactivated.deviceCode,
				},
			});
		},
		{ duplicateMeansAssignmentChanged: true },
	);

	printDeviceOperation(log);
	return getDeviceDetail(oldDeviceId);
}

// ---- 退所による割当の終了 ----
// 高齢者管理の退所処理から、runDeviceTransaction の中で次の順に呼ぶ。
//  1. lockForElderExit         : ロックと照合（入所者の status を更新する前に呼ぶ）
//  2. （高齢者管理）入所者の status を INACTIVE にする
//  3. endAssignmentForElderExit : 割当の終了と監査記録

// 退所の確定時に照合する「確認ダイアログで見せた割当」
// - string    : その ID の割当が、今も有効な割当であること
// - null      : 今も有効な割当がないこと
export type ExpectedExitAssignment = string | null;

// ロック後に読み直した割当が、退所を確認した時点の値と一致することを保証する。
// この判定は Elder / DeviceAssignment / 監査記録を書き換える前に呼ぶ。
export function assertExpectedExitAssignment(
	expectedAssignmentId: ExpectedExitAssignment,
	currentAssignmentId: string | null,
) {
	if (currentAssignmentId !== expectedAssignmentId) {
		throw invalidState("ASSIGNMENT_CHANGED", ASSIGNMENT_CHANGED_MESSAGE);
	}
}

// 退所のためのロックと照合。今の有効な割当を返す（なければ null）
//
// ロックの順番は、デバイス側の操作と同じ「Device → Elder」にそろえる。
// 監査記録の INSERT は、外部キーを確かめるために Device 行にも暗黙のロック（FOR KEY SHARE）を取る。
// もし Elder 行を先にロックすると、「Device 行をロックしてから Elder 行を待つ」操作
// （解除・付け替え・故障交換）とお互いを待ち合い、デッドロックになる
export async function lockForElderExit(
	tx: Tx,
	elderId: string,
	expectedAssignmentId: ExpectedExitAssignment,
): Promise<DeviceAssignment | null> {
	// 1. ロックせずに今の割当を読み、そのデバイスを先にロックする
	const beforeLock = await findActiveAssignmentOfElder(tx, elderId);
	if (beforeLock !== null) {
		await lockDevices(tx, [beforeLock.deviceId]);
	}

	// 2. Elder 行をロックする。割当を変える操作（割当・解除・付け替え・故障交換）は
	//    どれも Elder 行をロックするので、これ以降は確定まで割当が変わらない
	const lockedElders = await lockElders(tx, [elderId]);
	if (!lockedElders.has(elderId)) {
		// 高齢者 API の 404 と同じ本文（{ error: "Not found" }）になる
		throw new ApiError(404, "NOT_FOUND", "Not found");
	}

	// 3. ロックした後に、割当を読み直す
	const active = await findActiveAssignmentOfElder(tx, elderId);

	// 1 と 2 の間に割当が変わると、ロックしたデバイスと別のデバイスの割当になっている。
	// ロックしていないデバイスに触るとデッドロックになり得るため、競合として 409 にする
	const lockedDeviceId = beforeLock?.deviceId ?? null;
	const activeDeviceId = active?.deviceId ?? null;
	if (activeDeviceId !== lockedDeviceId) {
		throw invalidState("ASSIGNMENT_CHANGED", ASSIGNMENT_CHANGED_MESSAGE);
	}

	// 4. 確認した後に、別のスタッフが割当を変えていたら 409 にする
	const currentAssignmentId = active?.id ?? null;
	assertExpectedExitAssignment(expectedAssignmentId, currentAssignmentId);

	return active;
}

// 退所による割当の終了。active は lockForElderExit が返した割当
// 割当がなければ何もせず、監査記録も残さない
export async function endAssignmentForElderExit(
	tx: Tx,
	elderId: string,
	actorId: string,
	active: DeviceAssignment | null,
) {
	if (active === null) {
		return null;
	}
	await endAssignment(tx, active.id, endTimeFor(active.assignedAt));
	return recordDeviceOperation(tx, {
		actorId,
		action: "END_BY_ELDER_EXIT",
		deviceId: active.deviceId,
		elderId,
		endedAssignmentId: active.id,
	});
}

// ---- 割当先候補（GET /api/devices/assignable-elders） ----
// ACTIVE で、有効な割当がない入所者。絞り込みは DB で行う（全件を画面へ送らない）

export async function listAssignableElders(
	query: AssignableEldersQuery,
): Promise<AssignableEldersResponse> {
	const where: Prisma.ElderWhereInput = {
		status: "ACTIVE",
		deviceAssignments: { none: { unassignedAt: null } },
	};
	if (query.q !== undefined) {
		where.OR = [
			{ lastName: { contains: query.q, mode: "insensitive" } },
			{ firstName: { contains: query.q, mode: "insensitive" } },
			{ roomNumber: { contains: query.q, mode: "insensitive" } },
		];
	}

	const [rows, total] = await Promise.all([
		prisma.elder.findMany({
			where,
			// ページを送っても順番が変わらないように、id でも並べる
			orderBy: [{ roomNumber: "asc" }, { id: "asc" }],
			skip: (query.page - 1) * query.limit,
			take: query.limit,
			// 選択に必要な項目だけを返す（生年月日などは返さない）
			select: { id: true, lastName: true, firstName: true, roomNumber: true },
		}),
		prisma.elder.count({ where }),
	]);

	return { data: rows, total, page: query.page, limit: query.limit };
}

// ---- 対象者の特定（GET /api/devices/lookup） ----

const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export async function lookupAssignmentAt(
	deviceCode: string,
	atText: string,
): Promise<DeviceLookupResponse> {
	// Date はミリ秒までしか持たないため、それより細かい値はここで切り捨てられる
	const at = new Date(atText);
	if (at.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
		throw new ApiError(400, "INVALID_INPUT", "検知時刻が未来になっています", {
			field: "at",
		});
	}
	const atIso = at.toISOString();

	// 形式違反のコードも「未登録のデバイス」として扱う（MQTT で届いた値をそのまま渡すため）
	if (!DEVICE_CODE_PATTERN.test(deviceCode)) {
		return unregistered(atIso);
	}

	// INACTIVE のデバイスも対象にする（検知の後に無効化された場合も、当時の高齢者を特定するため）
	const device = await prisma.device.findUnique({
		where: { deviceCode },
		select: { id: true, deviceCode: true, deviceName: true, status: true },
	});
	if (device === null) {
		return unregistered(atIso);
	}

	// 割当期間は assignedAt を含み、unassignedAt を含まない
	const assignments = await prisma.deviceAssignment.findMany({
		where: {
			deviceId: device.id,
			assignedAt: { lte: at },
			OR: [{ unassignedAt: null }, { unassignedAt: { gt: at } }],
		},
		take: 2,
		select: {
			id: true,
			assignedAt: true,
			unassignedAt: true,
			elder: {
				select: {
					id: true,
					lastName: true,
					firstName: true,
					roomNumber: true,
					status: true,
				},
			},
		},
	});

	if (assignments.length > 1) {
		// 割当期間の決まりにより起きないはずの状態。データの不整合として運用通知を出す
		notifyOps("DEVICE_ASSIGNMENT_OVERLAP", {
			targetId: device.id,
			reason: "lookup found multiple assignments at the same time",
		});
		throw new ApiError(500, "INTERNAL", "サーバーエラーが発生しました");
	}

	const found = assignments[0];
	if (found === undefined) {
		return deviceLookupResponseSchema.parse({
			result: "UNASSIGNED",
			at: atIso,
			device,
			elder: null,
			assignment: null,
		});
	}
	return deviceLookupResponseSchema.parse({
		result: "ASSIGNED",
		at: atIso,
		device,
		elder: found.elder,
		assignment: {
			id: found.id,
			assignedAt: found.assignedAt.toISOString(),
			unassignedAt: found.unassignedAt
				? found.unassignedAt.toISOString()
				: null,
		},
	});
}

function unregistered(atIso: string): DeviceLookupResponse {
	return deviceLookupResponseSchema.parse({
		result: "UNREGISTERED",
		at: atIso,
		device: null,
		elder: null,
		assignment: null,
	});
}
