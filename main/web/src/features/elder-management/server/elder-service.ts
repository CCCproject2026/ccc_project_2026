import "server-only";
import { prisma } from "@/lib/prisma";
import type {
	CreateElderInput,
	UpdateElderInput,
	ElderStatus,
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

export async function updateElder(id: string, input: UpdateElderInput) {
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

	const elder = await prisma.elder.update({
		where: { id },
		data: updateData,
	});

	return elder;
}

export async function deactivateElder(id: string) {
	await prisma.elder.update({
		where: { id },
		data: { status: "INACTIVE" },
	});
}
