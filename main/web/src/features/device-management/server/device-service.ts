import "server-only";
import type { Prisma } from "@prisma/client";
import { ApiError } from "@/shared/lib/api-error";
import { prisma } from "@/shared/lib/prisma";
import type {
	DeviceCreateInput,
	DeviceListQuery,
	DeviceUpdateInput,
} from "../schemas/device-input";
import type {
	DeviceDetail,
	DeviceListItem,
	DeviceListResponse,
	DeviceStatus,
} from "../types/device.types";
import { printDeviceOperation, recordDeviceOperation } from "./audit";
import {
	findActiveAssignmentOfDevice,
	invalidState,
	lockDevices,
	notFound,
	runDeviceTransaction,
} from "./device-db";

// デバイスの一覧・詳細・登録・編集・状態変更（詳細設計 03 の4章・5章）

const HISTORY_LIMIT = 50;

const elderSelect = {
	id: true,
	lastName: true,
	firstName: true,
	roomNumber: true,
} satisfies Prisma.ElderSelect;

// 一覧と詳細で共通に読む項目。現在の割当（unassignedAt が NULL）を1件だけ含める
const deviceSelect = {
	id: true,
	deviceCode: true,
	deviceName: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	assignments: {
		where: { unassignedAt: null },
		take: 1,
		select: { id: true, assignedAt: true, elder: { select: elderSelect } },
	},
} satisfies Prisma.DeviceSelect;

type DeviceRow = Prisma.DeviceGetPayload<{ select: typeof deviceSelect }>;

function toListItem(row: DeviceRow): DeviceListItem {
	const current = row.assignments[0];
	let currentAssignment: DeviceListItem["currentAssignment"] = null;
	if (current !== undefined) {
		currentAssignment = {
			id: current.id,
			assignedAt: current.assignedAt.toISOString(),
			elder: current.elder,
		};
	}
	return {
		id: row.id,
		deviceCode: row.deviceCode,
		deviceName: row.deviceName,
		status: row.status,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		currentAssignment,
	};
}

// ---- 一覧（GET /api/devices） ----

export async function listDevices(
	query: DeviceListQuery,
): Promise<DeviceListResponse> {
	const where: Prisma.DeviceWhereInput = {};
	if (query.status !== undefined) {
		where.status = query.status;
	}
	if (query.assigned === "true") {
		where.assignments = { some: { unassignedAt: null } };
	}
	if (query.assigned === "false") {
		where.assignments = { none: { unassignedAt: null } };
	}
	if (query.q !== undefined) {
		where.OR = [
			{ deviceName: { contains: query.q, mode: "insensitive" } },
			{ deviceCode: { contains: query.q, mode: "insensitive" } },
		];
	}

	const [rows, total, allTotal, assigned, unassigned, inactive] =
		await Promise.all([
			prisma.device.findMany({
				where,
				// ページを送っても順番が変わらないように、id でも並べる
				orderBy: [{ deviceCode: "asc" }, { id: "asc" }],
				skip: (query.page - 1) * query.limit,
				take: query.limit,
				select: deviceSelect,
			}),
			prisma.device.count({ where }),
			prisma.device.count(),
			prisma.device.count({
				where: { assignments: { some: { unassignedAt: null } } },
			}),
			prisma.device.count({
				where: {
					status: "ACTIVE",
					assignments: { none: { unassignedAt: null } },
				},
			}),
			prisma.device.count({ where: { status: "INACTIVE" } }),
		]);

	return {
		data: rows.map(toListItem),
		total,
		page: query.page,
		limit: query.limit,
		summary: { total: allTotal, assigned, unassigned, inactive },
	};
}

// ---- 存在の確認（/devices/[id] の画面で、なければ not-found を出すため） ----

export async function deviceExists(id: string): Promise<boolean> {
	const row = await prisma.device.findUnique({
		where: { id },
		select: { id: true },
	});
	return row !== null;
}

// ---- 詳細（GET /api/devices/[id]） ----

export async function getDeviceDetail(id: string): Promise<DeviceDetail> {
	const row = await prisma.device.findUnique({
		where: { id },
		select: deviceSelect,
	});
	if (row === null) {
		throw notFound("device", "デバイスが見つかりません");
	}

	const history = await prisma.deviceAssignment.findMany({
		where: { deviceId: id },
		orderBy: [{ assignedAt: "desc" }, { id: "desc" }],
		take: HISTORY_LIMIT,
		select: {
			id: true,
			assignedAt: true,
			unassignedAt: true,
			elder: { select: elderSelect },
		},
	});

	return {
		...toListItem(row),
		history: history.map((item) => ({
			id: item.id,
			assignedAt: item.assignedAt.toISOString(),
			unassignedAt: item.unassignedAt ? item.unassignedAt.toISOString() : null,
			elder: item.elder,
		})),
	};
}

// ---- 登録（POST /api/devices） ----

export async function createDevice(
	actorId: string,
	input: DeviceCreateInput,
): Promise<DeviceDetail> {
	const { device, log } = await runDeviceTransaction(async (tx) => {
		// 無効化済みの行も含めて、同じコードがないか確認する（コードは再利用しない）
		const existing = await tx.device.findUnique({
			where: { deviceCode: input.deviceCode },
			select: { id: true },
		});
		if (existing !== null) {
			throw new ApiError(
				409,
				"DUPLICATE",
				"このデバイスコードは既に使われています",
			);
		}

		// status は画面から受け取らず、必ず ACTIVE にする
		// 確認と作成の間に同じコードが登録された場合は、一意制約（P2002）で 409 DUPLICATE になる
		const created = await tx.device.create({
			data: {
				deviceName: input.deviceName,
				deviceCode: input.deviceCode,
				status: "ACTIVE",
			},
		});
		const recorded = await recordDeviceOperation(tx, {
			actorId,
			action: "CREATE",
			deviceId: created.id,
			after: { status: created.status, deviceCode: created.deviceCode },
		});
		return { device: created, log: recorded };
	});

	printDeviceOperation(log);
	return getDeviceDetail(device.id);
}

// ---- 編集（PATCH /api/devices/[id]） ----

export async function updateDevice(
	actorId: string,
	id: string,
	input: DeviceUpdateInput,
): Promise<DeviceDetail> {
	const log = await runDeviceTransaction(async (tx) => {
		const locked = await lockDevices(tx, [id]);
		if (!locked.has(id)) {
			throw notFound("device", "デバイスが見つかりません");
		}
		const device = await tx.device.findUniqueOrThrow({ where: { id } });

		// 楽観的ロック: 画面を開いた後に、別のスタッフが変更していないか
		const expected = new Date(input.expectedUpdatedAt);
		if (device.updatedAt.getTime() !== expected.getTime()) {
			throw invalidState(
				"DEVICE_CHANGED",
				"他のスタッフがこのデバイスを変更しました。最新の内容を確認してから、もう一度保存してください",
			);
		}

		// 現在の値と違う項目だけを変更する
		const changedFields: ("deviceName" | "deviceCode")[] = [];
		if (
			input.deviceName !== undefined &&
			input.deviceName !== device.deviceName
		) {
			changedFields.push("deviceName");
		}
		const codeChanged =
			input.deviceCode !== undefined && input.deviceCode !== device.deviceCode;
		if (codeChanged) {
			changedFields.push("deviceCode");
		}
		if (changedFields.length === 0) {
			// 何も変わらないため、更新も記録もしない
			return null;
		}

		// コードは、一度も割り当てたことがないデバイスだけ変更できる（登録時の入力誤りの修正）
		// 割当の作成も同じ Device 行をロックするため、確認と変更の間に割当は作られない
		if (codeChanged) {
			const historyCount = await tx.deviceAssignment.count({
				where: { deviceId: id },
			});
			if (historyCount > 0) {
				throw invalidState(
					"DEVICE_HAS_HISTORY",
					"割当の履歴があるため、デバイスコードは変更できません",
				);
			}
		}

		// コードの重複は一意制約（P2002）で 409 DUPLICATE になる
		const updated = await tx.device.update({
			where: { id },
			data: {
				deviceName: changedFields.includes("deviceName")
					? input.deviceName
					: undefined,
				deviceCode: codeChanged ? input.deviceCode : undefined,
			},
		});
		return recordDeviceOperation(tx, {
			actorId,
			action: "UPDATE",
			deviceId: id,
			before: { status: device.status, deviceCode: device.deviceCode },
			after: {
				status: updated.status,
				deviceCode: updated.deviceCode,
				changedFields,
			},
		});
	});

	printDeviceOperation(log);
	return getDeviceDetail(id);
}

// ---- 状態変更（PATCH /api/devices/[id]/status） ----
// 指定された状態にするだけの操作のため、updatedAt は比べない

export async function changeDeviceStatus(
	actorId: string,
	id: string,
	status: DeviceStatus,
): Promise<DeviceDetail> {
	const log = await runDeviceTransaction(async (tx) => {
		const locked = await lockDevices(tx, [id]);
		if (!locked.has(id)) {
			throw notFound("device", "デバイスが見つかりません");
		}
		const device = await tx.device.findUniqueOrThrow({ where: { id } });

		// 同じ状態なら何もしない（記録もしない）
		if (device.status === status) {
			return null;
		}

		// 有効な割当があるデバイスは INACTIVE にできない
		// （割当済みに見えるのに監視されない状態を作らないため）
		if (status === "INACTIVE") {
			const active = await findActiveAssignmentOfDevice(tx, id);
			if (active !== null) {
				throw invalidState(
					"DEVICE_HAS_ASSIGNMENT",
					"割当中のデバイスは停止できません。先に解除するか、故障交換を行ってください",
				);
			}
		}

		const updated = await tx.device.update({
			where: { id },
			data: { status },
		});
		return recordDeviceOperation(tx, {
			actorId,
			action: "CHANGE_STATUS",
			deviceId: id,
			before: { status: device.status, deviceCode: device.deviceCode },
			after: { status: updated.status, deviceCode: updated.deviceCode },
		});
	});

	printDeviceOperation(log);
	return getDeviceDetail(id);
}
