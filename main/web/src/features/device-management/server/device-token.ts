import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { ApiError } from "@/shared/lib/api-error";
import { serverEnv } from "@/shared/lib/env";

export function requireDeviceToken(request: Request): void {
	const expected = serverEnv().DEVICE_API_TOKEN;
	const header = request.headers.get("authorization") ?? "";
	const match = /^Bearer ([A-Za-z0-9+/_=-]{32,})$/i.exec(header);
	if (!match) {
		throw new ApiError(401, "UNAUTHENTICATED", "Unauthorized");
	}
	const digest = (value: string) => createHash("sha256").update(value).digest();
	if (!timingSafeEqual(digest(match[1]), digest(expected))) {
		throw new ApiError(401, "UNAUTHENTICATED", "Unauthorized");
	}
}
