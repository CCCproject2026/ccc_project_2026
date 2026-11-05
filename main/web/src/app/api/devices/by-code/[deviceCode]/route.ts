import { NextResponse } from "next/server";
import { lookupDeviceByCode } from "@/features/device-management/server/device-lookup";
import { requireDeviceToken } from "@/features/device-management/server/device-token";
import { errorResponse } from "@/shared/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
	request: Request,
	context: { params: Promise<{ deviceCode: string }> },
) {
	let response: NextResponse;
	try {
		requireDeviceToken(request);
		const { deviceCode } = await context.params;
		response = NextResponse.json(await lookupDeviceByCode(deviceCode));
	} catch (error) {
		response = errorResponse(error);
	}
	response.headers.set("Cache-Control", "no-store");
	if (response.status === 401) {
		response.headers.set("WWW-Authenticate", "Bearer");
	}
	return response;
}
