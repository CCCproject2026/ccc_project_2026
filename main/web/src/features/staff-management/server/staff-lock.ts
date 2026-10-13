import "server-only";
import { Client } from "pg";
import { ApiError } from "@/shared/lib/api-error";

// スタッフ管理の全操作で使う、ロックの番号（固定）
// CCC-223 / Issue #175 から取った数字。他のロックと重ならなければ何でもよい
export const STAFF_LOCK_KEY = 223175;

// ロックが取れるまで待つ最大時間（設計書 6節：最大5秒）
const LOCK_WAIT_MS = 5000;

// ロックが取れなかったとき、次に試すまでの間隔
const RETRY_INTERVAL_MS = 100;

// 処理全体の上限（Heroku は 30 秒で打ち切るので、少し短くする）
const TOTAL_LIMIT_MS = 25000;

// work の中で使う。DB 更新や Clerk 呼び出しの「前に」毎回呼ぶ
export type StaffLock = {
	ensureCanContinue: () => void;
};

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function unavailable(message: string): ApiError {
	return new ApiError(503, "TEMPORARILY_UNAVAILABLE", message);
}

// ロック専用の DB 接続を作る（Prisma の接続とは別）
function createLockClient(): Client {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error("DATABASE_URL が設定されていません");
	}

	// Heroku Postgres は SSL が必要。ローカルの PostgreSQL は SSL なし
	let ssl: false | { rejectUnauthorized: boolean } = false;
	if (process.env.NODE_ENV === "production") {
		ssl = { rejectUnauthorized: false };
	}

	return new Client({
		connectionString,
		ssl,
		connectionTimeoutMillis: LOCK_WAIT_MS,
	});
}

// ロックを取ってから work を実行し、最後に必ずロックを解放する
//
// 使い方:
//   await withStaffLock(async (lock) => {
//     lock.ensureCanContinue();
//     await prisma.user.update(...);
//     lock.ensureCanContinue();
//     await createStaffInvitation(...);
//   });
export async function withStaffLock<T>(
	work: (lock: StaffLock) => Promise<T>,
	options: { lockWaitMs?: number } = {},
): Promise<T> {
	const lockWaitMs = options.lockWaitMs ?? LOCK_WAIT_MS;
	const startedAt = Date.now();
	const client = createLockClient();

	// 接続が切れたら記録する
	// （"error" を受け取らないと、Node.js のプロセスごと落ちてしまう）
	let isConnectionLost = false;
	client.on("error", () => {
		isConnectionLost = true;
	});

	try {
		await client.connect();
	} catch {
		throw unavailable(
			"データベースに接続できません。しばらくしてから再度お試しください",
		);
	}

	let isLocked = false;

	try {
		// ===== 1. ロックが取れるまで待つ（最大 lockWaitMs） =====
		while (!isLocked) {
			try {
				const result = await client.query<{ locked: boolean }>(
					"SELECT pg_try_advisory_lock($1) AS locked",
					[STAFF_LOCK_KEY],
				);
				isLocked = result.rows[0].locked;
			} catch {
				throw unavailable(
					"データベースとの接続に失敗しました。しばらくしてから再度お試しください",
				);
			}

			if (!isLocked) {
				if (Date.now() - startedAt >= lockWaitMs) {
					throw unavailable(
						"他の操作を処理中です。しばらくしてから再度お試しください",
					);
				}
				await sleep(RETRY_INTERVAL_MS);
			}
		}

		// ===== 2. 処理を続けてよいか確認する関数 =====
		const lock: StaffLock = {
			ensureCanContinue() {
				if (isConnectionLost) {
					throw unavailable(
						"データベースとの接続が切れたため、処理を中止しました",
					);
				}
				if (Date.now() - startedAt > TOTAL_LIMIT_MS) {
					throw unavailable("処理に時間がかかりすぎたため、中止しました");
				}
			},
		};

		// ===== 3. 本来の処理を実行する =====
		return await work(lock);
	} finally {
		// ===== 4. ロックを解放して、接続を閉じる（エラーでも必ず実行される） =====
		if (isLocked && !isConnectionLost) {
			try {
				const result = await client.query<{ unlocked: boolean }>(
					"SELECT pg_advisory_unlock($1) AS unlocked",
					[STAFF_LOCK_KEY],
				);
				if (!result.rows[0].unlocked) {
					console.warn("[staff-lock] ロックの解放を確認できませんでした");
				}
			} catch {
				console.warn("[staff-lock] ロックの解放に失敗しました");
			}
		}

		// 接続を閉じる。接続が閉じれば、PostgreSQL がロックを必ず解放する
		// （解放の確認に失敗した場合も、ここで接続ごと捨てる）
		try {
			await client.end();
		} catch {
			// 既に切れている場合など。何もしない
		}
	}
}
