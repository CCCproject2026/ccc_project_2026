import "server-only";
import { ApiError } from "@/shared/lib/api-error";
import { prisma } from "@/shared/lib/prisma";

export async function lookupDeviceByCode(deviceCode: string) {
	if (!/^[A-Za-z0-9_-]{1,64}$/.test(deviceCode)) {
		throw new ApiError(404, "NOT_FOUND", "Device not found");
	}
	const device = await prisma.device.findUnique({
		where: { deviceCode },
		select: { deviceCode: true, status: true },
	});
	if (!device) {
		throw new ApiError(404, "NOT_FOUND", "Device not found");
	}
	return { device_code: device.deviceCode, status: device.status };
}
