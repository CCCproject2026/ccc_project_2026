import "server-only";
import { Pool, type PoolClient } from "pg";
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

// ロック専用の接続プールの大きさ
// ロックは1つなので、同時にロックを持てるのは1接続だけ。待っている操作の分だけ少し余裕を持たせる
// （Heroku Postgres は接続数の上限が小さいので、大きくしない）
const POOL_MAX = 3;

// 使っていない接続を閉じるまでの時間
const POOL_IDLE_TIMEOUT_MS = 30000;

// ロック専用の接続プール（Prisma の接続とは別）。最初に使うときに作る
// 操作のたびに接続（Heroku では SSL の手続きも）を作り直さないように、接続を使い回す
let pool: Pool | undefined;

function getLockPool(): Pool {
	if (pool !== undefined) {
		return pool;
	}

	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		// 他の「DB に接続できない」場合と同じく 503 にする（ログには原因を残す）
		console.error("[staff-lock] DATABASE_URL が設定されていません");
		throw unavailable(
			"データベースに接続できません。しばらくしてから再度お試しください",
		);
	}

	// Heroku Postgres は SSL が必要。ローカルの PostgreSQL は SSL なし
	let ssl: false | { rejectUnauthorized: boolean } = false;
	if (process.env.NODE_ENV === "production") {
		ssl = { rejectUnauthorized: false };
	}

	pool = new Pool({
		connectionString,
		ssl,
		max: POOL_MAX,
		idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
		connectionTimeoutMillis: LOCK_WAIT_MS,
		// スクリプト（scripts/）が、使っていない接続のせいで終了できなくならないようにする
		allowExitOnIdle: true,
	});

	// 使っていない接続が切れたときのエラー
	// （"error" を受け取らないと、Node.js のプロセスごと落ちてしまう。壊れた接続はプールが捨てる）
	pool.on("error", () => {
		console.warn("[staff-lock] 待機中の DB 接続が切れました");
	});
	return pool;
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
	const lockPool = getLockPool();

	let client: PoolClient;
	try {
		client = await lockPool.connect();
	} catch {
		throw unavailable(
			"データベースに接続できません。しばらくしてから再度お試しください",
		);
	}

	// 使っている間に接続が切れたら記録する
	// （"error" を受け取らないと、Node.js のプロセスごと落ちてしまう）
	let isConnectionLost = false;
	const onError = () => {
		isConnectionLost = true;
	};
	client.on("error", onError);

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
		// ===== 4. ロックを解放して、接続をプールに返す（エラーでも必ず実行される） =====
		// ロックの解放を確認できたときだけ、接続を使い回す
		// 確認できなければ接続ごと捨てる（接続が閉じれば、PostgreSQL がロックを必ず解放する）
		let canReuse = !isConnectionLost;
		if (isLocked && !isConnectionLost) {
			try {
				const result = await client.query<{ unlocked: boolean }>(
					"SELECT pg_advisory_unlock($1) AS unlocked",
					[STAFF_LOCK_KEY],
				);
				if (!result.rows[0].unlocked) {
					console.warn("[staff-lock] ロックの解放を確認できませんでした");
					canReuse = false;
				}
			} catch {
				console.warn("[staff-lock] ロックの解放に失敗しました");
				canReuse = false;
			}
		}

		client.removeListener("error", onError);
		// release(true) を渡すと、プールに返さずに接続を閉じる
		client.release(!canReuse);
	}
}
