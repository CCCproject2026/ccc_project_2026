import { z } from "zod";

// 対象者の特定（GET /api/devices/lookup）の入力と応答（詳細設計 03 の7章）
// サーバーは応答をこのスキーマで組み立て、ダッシュボードは受け取った応答をこのスキーマで検証する。
// 設計書の OpenAPI と同じ内容にし、変更するときは両方を同時に直す。

export const deviceLookupQuerySchema = z.strictObject({
	deviceCode: z.string().trim().min(1).max(64),
	at: z.iso.datetime({ offset: true }),
});

const statusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const deviceLookupResponseSchema = z.strictObject({
	result: z.enum(["ASSIGNED", "UNASSIGNED", "UNREGISTERED"]),
	at: z.iso.datetime(), // 検索に使った時刻（UTC、ミリ秒）
	device: z
		.strictObject({
			id: z.string(),
			deviceCode: z.string(),
			deviceName: z.string(),
			status: statusSchema,
		})
		.nullable(),
	elder: z
		.strictObject({
			id: z.string(),
			lastName: z.string(),
			firstName: z.string(),
			roomNumber: z.string(),
			status: statusSchema,
		})
		.nullable(),
	assignment: z
		.strictObject({
			id: z.string(),
			assignedAt: z.iso.datetime(),
			unassignedAt: z.iso.datetime().nullable(),
		})
		.nullable(),
});

export type DeviceLookupResponse = z.infer<typeof deviceLookupResponseSchema>;
