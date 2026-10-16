import "dotenv/config"; // .env の DATABASE_URL を読み込む
import { Client } from "pg";
import { describe, expect, it } from "vitest";
import { STAFF_LOCK_KEY, withStaffLock } from "./staff-lock";

// DATABASE_URL がない環境（CI など）では、このテストをスキップする
const hasDatabase = Boolean(process.env.DATABASE_URL);

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe.skipIf(!hasDatabase)("withStaffLock（ローカルDBを使う）", () => {
	it("work の結果をそのまま返す", async () => {
		const result = await withStaffLock(async () => "done");
		expect(result).toBe("done");
	});

	it("同時に2つ実行しても、1つずつ順番に動く", async () => {
		const events: string[] = [];
		let second: Promise<void> | undefined;

		await withStaffLock(async () => {
			events.push("A 開始");

			// A がロックを持っている間に B を始める → B は A が終わるまで待つはず
			second = withStaffLock(async () => {
				events.push("B 開始");
				events.push("B 終了");
			});

			await sleep(300);
			events.push("A 終了");
		});
		await second;

		expect(events).toEqual(["A 開始", "A 終了", "B 開始", "B 終了"]);
	});

	it("work でエラーが起きても、ロックは解放される", async () => {
		await expect(
			withStaffLock(async () => {
				throw new Error("途中で失敗");
			}),
		).rejects.toThrow("途中で失敗");

		// ロックが残っていなければ、すぐに取れる
		const result = await withStaffLock(async () => "ok", { lockWaitMs: 500 });
		expect(result).toBe("ok");
	});

	it("待ち時間を過ぎてもロックが取れなければ 503", async () => {
		await withStaffLock(async () => {
			// 自分がロックを持ったまま、別の操作を「待ち時間 0.3 秒」で始める
			await expect(
				withStaffLock(async () => "取れないはず", { lockWaitMs: 300 }),
			).rejects.toMatchObject({ status: 503 });
		});
	});

	it("接続が切れたら ensureCanContinue が 503 を投げる", async () => {
		await expect(
			withStaffLock(async (lock) => {
				// 別の接続から、ロックを持っている接続を強制終了する
				const admin = new Client({
					connectionString: process.env.DATABASE_URL,
				});
				await admin.connect();
				await admin.query(
					"SELECT pg_terminate_backend(pid) FROM pg_locks WHERE locktype = 'advisory' AND objid = $1 AND granted",
					[STAFF_LOCK_KEY],
				);
				await admin.end();

				await sleep(300); // 切断が伝わるのを待つ
				lock.ensureCanContinue();
			}),
		).rejects.toMatchObject({ status: 503 });

		// 接続が切れた後でも、次の操作はロックを取れる
		const result = await withStaffLock(async () => "ok", { lockWaitMs: 1000 });
		expect(result).toBe("ok");
	});
});
