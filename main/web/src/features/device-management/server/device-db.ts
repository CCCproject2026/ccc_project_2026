import "server-only";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/shared/lib/api-error";
import { prisma } from "@/shared/lib/prisma";
import type { DeviceErrorReason, NotFoundTarget } from "../types/device.types";

// デバイス管理のサーバー処理で共通に使う部品（詳細設計 03 の4章・6章）
// - トランザクションの実行と、DB エラーから API エラーへの変換
// - 行ロック（SELECT ... FOR UPDATE）
// - 割当の終了

export type Tx = Prisma.TransactionClient;

// ---- エラー ----

// 409 INVALID_STATE。理由は reason で返す（ErrorCode は増やさない）
export function invalidState(reason: DeviceErrorReason, message: string) {
	return new ApiError(409, "INVALID_STATE", message, { reason });
}

// 404 NOT_FOUND。どの行が見つからなかったかを target で返す
export function notFound(target: NotFoundTarget, message: string) {
	return new ApiError(404, "NOT_FOUND", message, { target });
}

// ---- トランザクション ----

// ロック待ち・デッドロックなどで、少し待てば成功する可能性がある PostgreSQL のエラー
// 40P01: デッドロック、55P03: ロックを取れなかった（lock_timeout）、40001: 直列化の失敗
const RETRYABLE_PG_CODES = new Set(["40P01", "55P03", "40001"]);

type TransactionOptions = {
	// 割当の処理では、部分一意インデックスの違反（P2002）を「他の操作と競合した」とみなす
	duplicateMeansAssignmentChanged?: boolean;
};

export async function runDeviceTransaction<T>(
	fn: (tx: Tx) => Promise<T>,
	options: TransactionOptions = {},
): Promise<T> {
	try {
		return await prisma.$transaction(
			async (tx) => {
				// ロック待ちが長引いたら、トランザクションの timeout より先に失敗させる
				await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
				return fn(tx);
			},
			// 自動の再試行はしない（詳細設計 03 の6章）
			{ maxWait: 5000, timeout: 10000 },
		);
	} catch (error) {
		throw convertTransactionError(error, options);
	}
}

function convertTransactionError(
	error: unknown,
	options: TransactionOptions,
): unknown {
	// サービスが投げた 404・409 などは、そのまま返す
	if (error instanceof ApiError) {
		return error;
	}
	if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
		return error;
	}

	if (error.code === "P2002" && options.duplicateMeansAssignmentChanged) {
		return invalidState(
			"ASSIGNMENT_CHANGED",
			"他の操作と重なったため、実行できませんでした。最新の状態を確認してください",
		);
	}

	// P2028: トランザクションの開始待ち・実行時間の超過
	// P2034: 書き込みの競合・デッドロック
	// P2010: 生の SQL（FOR UPDATE など）の失敗。PostgreSQL のエラーコードで判断する
	const pgCode = (error.meta as { code?: string } | undefined)?.code;
	const isRetryable =
		error.code === "P2028" ||
		error.code === "P2034" ||
		(error.code === "P2010" &&
			pgCode !== undefined &&
			RETRYABLE_PG_CODES.has(pgCode));
	if (isRetryable) {
		return new ApiError(
			503,
			"TEMPORARILY_UNAVAILABLE",
			"混み合っているため、実行できませんでした。しばらくしてからもう一度お試しください",
		);
	}

	// P2002（deviceCode の重複など）はそのまま返し、errorResponse() で 409 DUPLICATE にする
	return error;
}

// ---- 行ロック ----
// 2つの行を同時にロックするときは、1つの SQL で id の昇順にロックする（デッドロック防止）
// 必ず Device 行を先に、Elder 行を後にロックする

// ロックできた（存在した）行の id を返す
export async function lockDevices(tx: Tx, ids: string[]): Promise<Set<string>> {
	const unique = [...new Set(ids)];
	const rows = await tx.$queryRaw<{ id: string }[]>`
		SELECT id FROM "Device"
		WHERE id IN (${Prisma.join(unique)})
		ORDER BY id
		FOR UPDATE`;
	return new Set(rows.map((row) => row.id));
}

export async function lockElders(tx: Tx, ids: string[]): Promise<Set<string>> {
	const unique = [...new Set(ids)];
	const rows = await tx.$queryRaw<{ id: string }[]>`
		SELECT id FROM "Elder"
		WHERE id IN (${Prisma.join(unique)})
		ORDER BY id
		FOR UPDATE`;
	return new Set(rows.map((row) => row.id));
}

// ---- 割当 ----

// デバイスの有効な割当（unassignedAt が NULL の行）を読む。なければ null
export function findActiveAssignmentOfDevice(tx: Tx, deviceId: string) {
	return tx.deviceAssignment.findFirst({
		where: { deviceId, unassignedAt: null },
	});
}

// 高齢者の有効な割当を読む。なければ null
export function findActiveAssignmentOfElder(tx: Tx, elderId: string) {
	return tx.deviceAssignment.findFirst({
		where: { elderId, unassignedAt: null },
	});
}

// 割当の終了時刻
// assignedAt と同じ時刻だと DB の CHECK 制約（assignedAt < unassignedAt）に違反するため、
// 現在時刻と「assignedAt の1ミリ秒後」の遅いほうを使う（詳細設計 03 の6章）
export function endTimeFor(assignedAt: Date): Date {
	const now = new Date();
	const earliest = new Date(assignedAt.getTime() + 1);
	if (now > earliest) {
		return now;
	}
	return earliest;
}

// 有効な割当を終了する
// 既に終了していたら（更新件数が1件でなければ）409 にし、トランザクション全体を取り消す
export async function endAssignment(
	tx: Tx,
	assignmentId: string,
	endAt: Date,
): Promise<void> {
	const result = await tx.deviceAssignment.updateMany({
		where: { id: assignmentId, unassignedAt: null },
		data: { unassignedAt: endAt },
	});
	if (result.count !== 1) {
		throw invalidState(
			"ASSIGNMENT_CHANGED",
			"割当が変更されたため、実行できませんでした。最新の状態を確認してください",
		);
	}
}
