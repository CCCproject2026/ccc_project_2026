import "server-only";
import { endAssignmentForElderExit } from "@/features/device-management/server/assignment-service";
import { printDeviceOperation } from "@/features/device-management/server/audit";
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
				select: { deviceId: true },
				take: 1,
			},
		},
	});

	if (!elder) {
		return null;
	}

	return {
		...elder,
		currentDeviceId: elder.deviceAssignments[0]?.deviceId ?? null,
		deviceAssignments: undefined,
	};
}

// 退所（INACTIVE への変更）では、Elder 行をロックし、status の更新と有効な割当の終了を
// 1つのトランザクションで行う（詳細設計 03 の4章・6章）。
// Elder 行だけをロックする（Device 行はロックしない）。デバイス側の操作は Elder 行のロック後に
// 割当を読み直すため、ここで終了した割当を二重に終了することはない。
async function exitElder(
	id: string,
	data: Record<string, unknown>,
	actorId: string,
) {
	const { elder, log } = await prisma.$transaction(
		async (tx) => {
			await tx.$queryRaw`SELECT id FROM "Elder" WHERE id = ${id} FOR UPDATE`;
			// 行がなければ P2025 になり、呼び出し元の API が 404 を返す
			const updated = await tx.elder.update({ where: { id }, data });
			const recorded = await endAssignmentForElderExit(tx, id, actorId);
			return { elder: updated, log: recorded };
		},
		{ maxWait: 5000, timeout: 10000 },
	);
	printDeviceOperation(log);
	return elder;
}

export async function updateElder(
	id: string,
	input: UpdateElderInput,
	actorId: string,
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

	// 退所を含む更新は、割当の終了と同じトランザクションで行う
	if (status === "INACTIVE") {
		return exitElder(id, updateData, actorId);
	}

	const elder = await prisma.elder.update({
		where: { id },
		data: updateData,
	});

	return elder;
}

// 退所（DELETE /api/elders/[id]）
export async function deactivateElder(id: string, actorId: string) {
	await exitElder(id, { status: "INACTIVE" }, actorId);
}
