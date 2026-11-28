import { z } from "zod";

// 画面とサーバーで同じスキーマを使う（詳細設計 03 の5章「入力ルール」）
// このファイルは画面からも import するため、server-only を付けない

// deviceCode の形式（詳細設計 03 の2章）。例: ESP32-001
// 機種名（英大文字で始まり、英大文字と数字で2〜16文字）+ "-" + 3桁の連番
export const DEVICE_CODE_PATTERN = /^[A-Z][A-Z0-9]{1,15}-[0-9]{3}$/;

export const deviceStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

// 小文字は大文字に自動変換しない（入力した値と保存される値を同じにするため）
export const deviceCodeSchema = z
	.string()
	.trim()
	.regex(
		DEVICE_CODE_PATTERN,
		"デバイスコードは「ESP32-001」の形式（英大文字・数字、ハイフン、3桁の番号）で入力してください",
	);

export const deviceNameSchema = z
	.string()
	.trim()
	.min(1, "デバイス名を入力してください")
	.max(50, "デバイス名は50文字以内で入力してください");

// ID は必須の文字列。存在と状態はサーバーで確認する
const idSchema = z.string().trim().min(1, "IDを指定してください");

// ---- 登録（POST /api/devices） ----
// status は受け取らない（登録時は必ず ACTIVE）
export const deviceCreateSchema = z.strictObject({
	deviceName: deviceNameSchema,
	deviceCode: deviceCodeSchema,
});
export type DeviceCreateInput = z.infer<typeof deviceCreateSchema>;

// ---- 編集（PATCH /api/devices/[id]） ----
// expectedUpdatedAt は、画面が詳細を取得したときの updatedAt（楽観的ロック）
// 変えない項目は送らない（旧形式のコードのデバイスでも名前だけを直せるようにするため）
export const deviceUpdateSchema = z
	.strictObject({
		expectedUpdatedAt: z.iso.datetime({ offset: true }),
		deviceName: deviceNameSchema.optional(),
		deviceCode: deviceCodeSchema.optional(),
	})
	.refine(
		(value) => value.deviceName !== undefined || value.deviceCode !== undefined,
		{ message: "変更する項目を指定してください" },
	);
export type DeviceUpdateInput = z.infer<typeof deviceUpdateSchema>;

// ---- 状態変更（PATCH /api/devices/[id]/status） ----
export const deviceStatusChangeSchema = z.strictObject({
	status: deviceStatusSchema,
});

// ---- 割当（POST /api/devices/[id]/assignment） ----
export const assignSchema = z.strictObject({
	elderId: idSchema,
});

// ---- 付け替え（PUT /api/devices/[id]/assignment） ----
export const transferSchema = z.strictObject({
	elderId: idSchema,
	expectedAssignmentId: idSchema,
});

// ---- 解除（DELETE /api/devices/[id]/assignment?assignmentId=...） ----
export const unassignQuerySchema = z.strictObject({
	assignmentId: idSchema,
});

// ---- 故障交換（POST /api/devices/[id]/replacement） ----
export const replaceSchema = z.strictObject({
	newDeviceId: idSchema,
	expectedAssignmentId: idSchema,
});

// ---- 一覧（GET /api/devices） ----
// クエリ文字列は文字列で届くため、page・limit は数値に変換する
export const deviceListQuerySchema = z.strictObject({
	status: deviceStatusSchema.optional(),
	assigned: z.enum(["true", "false"]).optional(),
	q: z.string().trim().min(1).max(50).optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type DeviceListQuery = z.infer<typeof deviceListQuerySchema>;

// ---- 割当先候補（GET /api/devices/assignable-elders） ----
// 範囲外の値は丸めずに 400 にする（詳細設計 03 の5章）
export const assignableEldersQuerySchema = z.strictObject({
	q: z.string().trim().min(1).max(50).optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type AssignableEldersQuery = z.infer<typeof assignableEldersQuerySchema>;
