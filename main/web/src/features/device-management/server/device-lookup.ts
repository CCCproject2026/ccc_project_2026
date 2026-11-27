import "server-only";
import { ApiError } from "@/shared/lib/api-error";
import { prisma } from "@/shared/lib/prisma";
import { DEVICE_CODE_PATTERN } from "../schemas/device-input";

// AI Server 用（GET /api/devices/by-code/[deviceCode]）
// 新形式（ESP32-001 など）以外のコードは、DB を見ずに未登録（404）として扱う（詳細設計 03 の7章）
export async function lookupDeviceByCode(deviceCode: string) {
	if (!DEVICE_CODE_PATTERN.test(deviceCode)) {
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
