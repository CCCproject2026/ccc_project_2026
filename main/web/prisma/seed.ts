import {
	PrismaClient,
	UserRole,
	UserStatus,
	ElderStatus,
	DeviceStatus,
	ServerLogLevel,
} from "@prisma/client";

const prisma = new PrismaClient();

type SeedDevice = {
	id: string;
	deviceName: string;
	deviceCode: string;
	status: DeviceStatus; // 新しく作るときだけ使う（既存の行の status は変えない）
};

// seed のデバイスを作る、または名前とコードを更新する。
//
// deviceCode は一意。既存のDBでは、seed 以外の行がすでに同じコードを
// 使っていることがある（例: 画面から ESP32-001 を登録した）。
// そのまま書き換えると一意制約で seed が失敗し、docker compose の
// migrate サービスが失敗して web-app も起動しなくなる。
// そのため、コードがほかの行に使われているときは、コードの書き換えだけを飛ばす。
async function upsertSeedDevice(device: SeedDevice) {
	// このコードを今使っている行（なければ null）
	const codeOwner = await prisma.device.findUnique({
		where: { deviceCode: device.deviceCode },
		select: { id: true },
	});
	let codeUsedByOther = false;
	if (codeOwner !== null && codeOwner.id !== device.id) {
		codeUsedByOther = true;
	}

	const existing = await prisma.device.findUnique({
		where: { id: device.id },
		select: { id: true },
	});

	// まだ行がない: 新しく作る
	if (existing === null) {
		if (codeUsedByOther) {
			// コードなしでは作れない。割当などもこの行を使うので、ここで止める
			throw new Error(
				`${device.id} を作れません。deviceCode ${device.deviceCode} は別のデバイスが使っています。` +
					"DBを作り直してください（pnpm prisma migrate reset）。",
			);
		}
		return prisma.device.create({
			data: {
				id: device.id,
				deviceName: device.deviceName,
				deviceCode: device.deviceCode,
				status: device.status,
			},
		});
	}

	// 行がある: コードがほかの行に使われていれば、名前だけを更新する
	if (codeUsedByOther) {
		console.warn(
			`[seed] ${device.id} の deviceCode を ${device.deviceCode} に変更しませんでした。` +
				"別のデバイスが使っています。",
		);
		return prisma.device.update({
			where: { id: device.id },
			data: { deviceName: device.deviceName },
		});
	}

	return prisma.device.update({
		where: { id: device.id },
		data: {
			deviceName: device.deviceName,
			deviceCode: device.deviceCode,
		},
	});
}

async function main() {
	// ----------------------------------------------------------------
	// 1. ユーザー管理（スタッフ）
	//    Clerk を認証情報の正、User をロール・利用状態の正とする。
	//    招待中スタッフは clerkUserId が NULL を許可する。
	// ----------------------------------------------------------------
	// テスト用 Clerk アカウントを有効な看護師として紐付ける。
	const nurse = await prisma.user.upsert({
		where: { id: "user_nurse_001" },
		update: {
			clerkUserId: "user_3KrisCDb429DjaVmsHgaD0A5wJh",
			email: "c250324@ccg.ac.jp",
			firstName: "testing",
			lastName: "nurse",
			role: UserRole.NURSE,
			status: UserStatus.ACTIVE,
		},
		create: {
			id: "user_nurse_001",
			clerkUserId: "user_3KrisCDb429DjaVmsHgaD0A5wJh",
			email: "c250324@ccg.ac.jp",
			firstName: "testing",
			lastName: "nurse",
			role: UserRole.NURSE,
			status: UserStatus.ACTIVE,
			startDate: new Date("2024-04-01T00:00:00.000Z"),
			endDate: null,
			dateOfBirth: new Date("1985-06-12T00:00:00.000Z"),
			nationality: "日本",
			gender: "FEMALE",
		},
	});

	const member = await prisma.user.upsert({
		where: { id: "user_caregiver_001" },
		update: {
			clerkUserId: "user_3Jcr3TjmrjKmm8nAR6GlHEoyZ3z",
			email: "c250321@ccg.ac.jp",
			firstName: "testing",
			lastName: "caregiver",
			role: UserRole.CAREGIVER,
			status: UserStatus.ACTIVE,
		},
		create: {
			id: "user_caregiver_001",
			clerkUserId: "user_3Jcr3TjmrjKmm8nAR6GlHEoyZ3z",
			email: "c250321@ccg.ac.jp",
			firstName: "testing",
			lastName: "caregiver",
			role: UserRole.CAREGIVER,
			status: UserStatus.ACTIVE,
			startDate: new Date("2025-09-01T00:00:00.000Z"),
			endDate: null,
			dateOfBirth: new Date("1992-11-03T00:00:00.000Z"),
			nationality: "日本",
			gender: "MALE",
		},
	});

	// 招待中スタッフ: Clerk登録前のため clerkUserId は NULL
	// （clerkUserId を入れてしまうと「登録待ち かつ 紐付き」になり、
	//   照合も取消も有効化もできない状態になってしまうため）
	await prisma.user.upsert({
		where: { id: "user_nurse_pending_001" },
		update: {
			// create と同じ値にする（再実行で別人の名前に変わらないように）
			firstName: "win htut",
			lastName: "oo",
			role: UserRole.NURSE,
			status: UserStatus.PENDING,
			clerkUserId: null,
		},
		create: {
			id: "user_nurse_pending_001",
			clerkUserId: null,
			email: "c250447@ccg.ac.jp",
			firstName: "win htut",
			lastName: "oo",
			role: UserRole.NURSE,
			status: UserStatus.PENDING,
			startDate: new Date("2026-10-01T00:00:00.000Z"),
			endDate: null,
			dateOfBirth: new Date("1990-02-20T00:00:00.000Z"),
			nationality: "日本",
			gender: "FEMALE",
		},
	});

	// ----------------------------------------------------------------
	// 2. 高齢者データ
	//    age は保存せず dateOfBirth から表示時に算出する。
	//    status は update に入れない。再実行したときに、画面で退所・在籍に
	//    戻した状態を上書きして、割当と矛盾させないため
	//    （例: 退所済みなのに有効な割当がある）。
	// ----------------------------------------------------------------
	const elderTaro = await prisma.elder.upsert({
		where: { id: "elderly_001" },
		update: {
			firstName: "一郎",
			lastName: "田中",
			roomNumber: "301",
		},
		create: {
			id: "elderly_001",
			firstName: "一郎",
			lastName: "田中",
			roomNumber: "301",
			status: ElderStatus.ACTIVE,
			dateOfBirth: new Date("1940-03-15T00:00:00.000Z"),
			gender: "MALE",
		},
	});

	const elderMiyako = await prisma.elder.upsert({
		where: { id: "elderly_002" },
		update: {
			firstName: "美咲",
			lastName: "鈴木",
			roomNumber: "302",
		},
		create: {
			id: "elderly_002",
			firstName: "美咲",
			lastName: "鈴木",
			roomNumber: "302",
			status: ElderStatus.ACTIVE,
			dateOfBirth: new Date("1943-09-08T00:00:00.000Z"),
			gender: "FEMALE",
		},
	});

	const elderKenji = await prisma.elder.upsert({
		where: { id: "elderly_003" },
		update: {
			firstName: "健二",
			lastName: "小林",
			roomNumber: "305",
		},
		create: {
			id: "elderly_003",
			firstName: "健二",
			lastName: "小林",
			roomNumber: "305",
			status: ElderStatus.ACTIVE,
			dateOfBirth: new Date("1938-12-01T00:00:00.000Z"),
			gender: "MALE",
		},
	});

	// 退所済み。過去データは保持し status のみ変更する。
	await prisma.elder.upsert({
		where: { id: "elderly_004" },
		update: {
			firstName: "恵子",
			lastName: "渡辺",
			roomNumber: "308",
		},
		create: {
			id: "elderly_004",
			firstName: "恵子",
			lastName: "渡辺",
			roomNumber: "308",
			status: ElderStatus.INACTIVE,
			dateOfBirth: new Date("1941-05-22T00:00:00.000Z"),
			gender: "FEMALE",
		},
	});

	// 在籍中で、デバイスが未割当の入所者。
	// デバイス管理の「割当」で候補（assignable-elders）に出ることを確認するため
	await prisma.elder.upsert({
		where: { id: "elderly_005" },
		update: {
			firstName: "和子",
			lastName: "佐藤",
			roomNumber: "310",
		},
		create: {
			id: "elderly_005",
			firstName: "和子",
			lastName: "佐藤",
			roomNumber: "310",
			status: ElderStatus.ACTIVE,
			dateOfBirth: new Date("1945-07-30T00:00:00.000Z"),
			gender: "FEMALE",
		},
	});

	// ----------------------------------------------------------------
	// 3. IoTデバイス
	//    deviceCode は一意。AI の ONLINE/OFFLINE とは別の概念で、
	//    ここでは「利用中か、故障したか」のみを持つ。
	//    deviceCode は「ESP32-001」の形式にする（DEVICE_CODE_PATTERN）。
	//    この形式でないと、画面の編集で入力エラーになり、
	//    AI Server の照会（by-code）でも未登録（404）として扱われる。
	//    status は update に入れない（理由は高齢者と同じ。
	//    例: 割当中のデバイスを INACTIVE に戻してしまう）。
	// ----------------------------------------------------------------
	const device1 = await upsertSeedDevice({
		id: "device_001",
		deviceName: "センサーA-001",
		deviceCode: "ESP32-001",
		status: DeviceStatus.ACTIVE,
	});

	const device2 = await upsertSeedDevice({
		id: "device_002",
		deviceName: "センサーA-002",
		deviceCode: "ESP32-002",
		status: DeviceStatus.ACTIVE,
	});

	const device3 = await upsertSeedDevice({
		id: "device_003",
		deviceName: "センサーA-003",
		deviceCode: "ESP32-003",
		status: DeviceStatus.ACTIVE,
	});

	// 故障したデバイス。物理削除せず INACTIVE で管理する。
	await upsertSeedDevice({
		id: "device_004",
		deviceName: "センサーA-004",
		deviceCode: "ESP32-004",
		status: DeviceStatus.INACTIVE,
	});

	// 予備のデバイス（ACTIVE で未割当）。
	// デバイス管理の「割当」と「故障交換」で、交換先に選べることを確認するため
	await upsertSeedDevice({
		id: "device_005",
		deviceName: "センサーA-005",
		deviceCode: "ESP32-005",
		status: DeviceStatus.ACTIVE,
	});

	// ----------------------------------------------------------------
	// 4. デバイス割当（DeviceAssignment）
	//    現在有効な割当は unassignedAt が NULL のレコード。
	//    解除済みの割当も削除せず履歴として残す。
	//    （同一 Elder/Device への有効な割当が重複しないこと）
	//
	//    update は空にする。画面で解除・付け替え・故障交換・退所をした後に
	//    再実行しても、終わった割当を有効に戻さないため。
	//    戻すと、同じデバイス・高齢者の有効な割当が2件になり、
	//    DB の一意制約（device_assignment_active_*_idx）でシードが失敗する。
	//
	//    DeviceOperationLog（監査記録）はシードで作らない。
	//    実際の操作の記録だけを残す表で、UPDATE・DELETE もトリガーで拒否される。
	// ----------------------------------------------------------------
	await prisma.deviceAssignment.upsert({
		where: { id: "assign_001" },
		update: {},
		create: {
			id: "assign_001",
			elderId: elderTaro.id,
			deviceId: device1.id,
			assignedAt: new Date("2026-04-01T00:00:00.000Z"),
			unassignedAt: null, // 現在有効
		},
	});

	await prisma.deviceAssignment.upsert({
		where: { id: "assign_002" },
		update: {},
		create: {
			id: "assign_002",
			elderId: elderMiyako.id,
			deviceId: device2.id,
			assignedAt: new Date("2026-04-01T00:00:00.000Z"),
			unassignedAt: null, // 現在有効
		},
	});

	await prisma.deviceAssignment.upsert({
		where: { id: "assign_003" },
		update: {},
		create: {
			id: "assign_003",
			elderId: elderKenji.id,
			deviceId: device3.id,
			assignedAt: new Date("2026-04-01T00:00:00.000Z"),
			unassignedAt: null, // 現在有効
		},
	});

	// 解除済みの割当（履歴として保持）
	await prisma.deviceAssignment.upsert({
		where: { id: "assign_004" },
		update: {},
		create: {
			id: "assign_004",
			elderId: elderKenji.id,
			deviceId: device1.id,
			assignedAt: new Date("2026-01-10T00:00:00.000Z"),
			unassignedAt: new Date("2026-03-31T00:00:00.000Z"),
		},
	});

	// ----------------------------------------------------------------
	// 5. 対応記録（ResponseRecord）
	//    スタッフが対応完了後に作成する記録。
	//    AI判定のMQTT受信だけでは作成しない。
	//    deviceId は保持しない。
	// ----------------------------------------------------------------

	// 例1: 看護師が駆けつけ、本当に転倒していたケース
	await prisma.responseRecord.upsert({
		where: { id: "record_001" },
		update: { isActualFall: true, staffId: nurse.id },
		create: {
			id: "record_001",
			elderId: elderTaro.id,
			staffId: nurse.id, // 対応したスタッフ
			content:
				"ベッド横で転倒を確認。骨折の疑いがないためお声がけして復帰。",
			isActualFall: true, // 本当に倒れていた
			responseStartedAt: new Date("2026-06-17T21:40:00.000Z"),
			completedAt: new Date("2026-06-17T21:47:00.000Z"),
		},
	});

	// 例2: 介護士が確認し、誤検知だったケース（isActualFall が false）
	await prisma.responseRecord.upsert({
		where: { id: "record_002" },
		update: { isActualFall: false, staffId: member.id },
		create: {
			id: "record_002",
			elderId: elderKenji.id,
			staffId: member.id, // 対応したスタッフ
			content: "センサーが寝返りの衝撃を誤検知。ご本人は安眠中。",
			isActualFall: false, // 誤検知
			responseStartedAt: new Date("2026-06-17T14:05:00.000Z"),
			completedAt: new Date("2026-06-17T14:08:00.000Z"),
		},
	});

	// ----------------------------------------------------------------
	// 6. サーバーログ（ServerLog）
	//    AI Server / Log Worker の運用ログ。業務データとは無関係。
	// ----------------------------------------------------------------
	await prisma.serverLog.upsert({
		where: { id: "log_001" },
		update: {},
		create: {
			id: "log_001",
			level: ServerLogLevel.INFO,
			source: "ai-server",
			message: "転倒検知モデル cnn-v1 のロードが完了しました。",
			occurredAt: new Date("2026-06-18T08:00:00.000Z"),
			receivedAt: new Date("2026-06-18T08:00:01.000Z"),
			payload: { modelVersion: "cnn-v1", loadMs: 842 },
		},
	});

	await prisma.serverLog.upsert({
		where: { id: "log_002" },
		update: {},
		create: {
			id: "log_002",
			level: ServerLogLevel.ERROR,
			source: "log-worker",
			message: "未登録デバイスからのメッセージを受信しました。",
			occurredAt: new Date("2026-06-18T09:12:00.000Z"),
			receivedAt: new Date("2026-06-18T09:12:00.500Z"),
			// 形式は正しいが、Device に登録されていないコード
			payload: { deviceCode: "ESP32-999", topic: "fall/ESP32-999/data" },
		},
	});

	console.log("Seed data created successfully with the new robust schema!");
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
