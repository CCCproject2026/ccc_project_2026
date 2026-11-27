import "server-only";
import {
	type ExpectedExitAssignment,
	endAssignmentForElderExit,
	lockForElderExit,
} from "@/features/device-management/server/assignment-service";
import { printDeviceOperation } from "@/features/device-management/server/audit";
import { runDeviceTransaction } from "@/features/device-management/server/device-db";
import { ApiError } from "@/shared/lib/api-error";
import { prisma } from "@/shared/lib/prisma";
import type {
	CreateElderInput,
	ElderStatus,
	UpdateElderInput,
} from "@/shared/validation/schemas";

interface ElderListQuery {
	page: number;
	limit: number;
	status: ElderStatus | null;
	q?: string;
}

export async function listElders({ page, limit, status, q }: ElderListQuery) {
	const where: Record<string, unknown> = {};
	if (status) where.status = status;
	if (q) {
		where.OR = [
			{ firstName: { contains: q, mode: "insensitive" } },
			{ lastName: { contains: q, mode: "insensitive" } },
			{ roomNumber: { contains: q, mode: "insensitive" } },
		];
	}

	const [elders, total, allTotal, byStatus] = await Promise.all([
		prisma.elder.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip: (page - 1) * limit,
			take: limit,
			select: {
				id: true,
				firstName: true,
				lastName: true,
				roomNumber: true,
				status: true,
				dateOfBirth: true,
				gender: true,
				createdAt: true,
				updatedAt: true,
				deviceAssignments: {
					where: { unassignedAt: null },
					select: { deviceId: true },
					take: 1,
				},
			},
		}),
		prisma.elder.count({ where }),
		prisma.elder.count(),
		prisma.elder.groupBy({
			by: ["status"],
			_count: { _all: true },
		}),
	]);

	const data = elders.map((e) => ({
		...e,
		currentDeviceId: e.deviceAssignments[0]?.deviceId ?? null,
		deviceAssignments: undefined,
	}));

	const summary = {
		total: allTotal,
		active: byStatus.find((s) => s.status === "ACTIVE")?._count._all ?? 0,
		inactive: byStatus.find((s) => s.status === "INACTIVE")?._count._all ?? 0,
	};

	return {
		data,
		total,
		page,
		limit,
		summary,
	};
}

export async function createElder(input: CreateElderInput) {
	const { firstName, lastName, roomNumber, dateOfBirth, gender } = input;

	const elder = await prisma.elder.create({
		data: {
			firstName,
			lastName,
			roomNumber,
			dateOfBirth: new Date(dateOfBirth),
			gender,
			status: "ACTIVE",
		},
	});

	return elder;
}

export async function getElder(id: string) {
	const elder = await prisma.elder.findUnique({
		where: { id },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			roomNumber: true,
			status: true,
			dateOfBirth: true,
			gender: true,
			createdAt: true,
			updatedAt: true,
			deviceAssignments: {
				where: { unassignedAt: null },
				select: { id: true, deviceId: true },
				take: 1,
			},
		},
	});

	if (!elder) {
		return null;
	}

	// デバイスの ID と割当の ID は、同じ問い合わせで読んだ同じ割当の値にする
	const currentAssignment = elder.deviceAssignments[0] ?? null;
	return {
		...elder,
		currentDeviceId: currentAssignment?.deviceId ?? null,
		// 退所の確定時に、確認した割当と同じかを照合するために使う
		currentAssignmentId: currentAssignment?.id ?? null,
		deviceAssignments: undefined,
	};
}

// 退所（INACTIVE への変更）では、status の更新と有効な割当の終了を
// 1つのトランザクションで行う（詳細設計 03 の4章・6章）。
// デバイス管理と同じ runDeviceTransaction を使うので、ロック待ちが長いときは
// 500 ではなく 503（「混み合っているため…」）になる
async function exitElder(
	id: string,
	data: Record<string, unknown>,
	actorId: string,
	expectedAssignmentId: ExpectedExitAssignment,
) {
	const { elder, log } = await runDeviceTransaction(async (tx) => {
		// 1. 割当中のデバイス → Elder 行の順にロックし、確認した割当と照合する
		//    違えば 409（まだ何も変更していない）。入所者がいなければ 404
		const active = await lockForElderExit(tx, id, expectedAssignmentId);
		// 2. 入所者の status を更新する
		const updated = await tx.elder.update({ where: { id }, data });
		// 3. 有効な割当を終了し、監査記録を残す
		const recorded = await endAssignmentForElderExit(tx, id, actorId, active);
		return { elder: updated, log: recorded };
	});
	printDeviceOperation(log);
	return elder;
}

export async function updateElder(
	id: string,
	input: UpdateElderInput,
	actorId: string,
	expectedAssignmentId?: ExpectedExitAssignment,
) {
	const { firstName, lastName, roomNumber, dateOfBirth, gender, status } =
		input;

	const updateData: Record<string, unknown> = {};
	if (firstName !== undefined) updateData.firstName = firstName;
	if (lastName !== undefined) updateData.lastName = lastName;
	if (roomNumber !== undefined) updateData.roomNumber = roomNumber;
	if (dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dateOfBirth);
	if (gender !== undefined) updateData.gender = gender;
	if (status !== undefined) updateData.status = status;

	if (Object.keys(updateData).length === 0) {
		return null;
	}

	// 退所を含む更新は、割当の終了と同じトランザクションで行う。
	// Route Handler が expectedAssignmentId を必須にするが、サービスを直接使う経路でも
	// 照合なしの退所に戻らないよう、ここでも拒否する。
	if (status === "INACTIVE") {
		if (expectedAssignmentId === undefined) {
			throw new ApiError(
				400,
				"INVALID_INPUT",
				"expectedAssignmentId は退所時に必須です",
			);
		}
		return exitElder(id, updateData, actorId, expectedAssignmentId);
	}

	const elder = await prisma.elder.update({
		where: { id },
		data: updateData,
	});

	return elder;
}

// 退所（DELETE /api/elders/[id]）
// expectedAssignmentId は、確認ダイアログで見せた割当（ExpectedExitAssignment を参照）
export async function deactivateElder(
	id: string,
	actorId: string,
	expectedAssignmentId: ExpectedExitAssignment,
) {
	await exitElder(id, { status: "INACTIVE" }, actorId, expectedAssignmentId);
}
