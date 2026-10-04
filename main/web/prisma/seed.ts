import {
	PrismaClient,
	UserRole,
	UserStatus,
	ElderStatus,
	DeviceStatus,
	ServerLogLevel,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
	// ----------------------------------------------------------------
	// 1. ユーザー管理（スタッフ）
	//    Clerk を認証情報の正、User をロール・利用状態の正とする。
	//    招待中スタッフは clerkUserId が NULL を許可する。
	// ----------------------------------------------------------------
	const nurse = await prisma.user.upsert({
		where: { id: "user_nurse_001" },
		update: {
			email: "nurse.one@example.com",
			firstName: "Hanako",
			lastName: "Yamada",
			role: UserRole.NURSE,
			status: UserStatus.ACTIVE,
		},
		create: {
			id: "user_nurse_001",
			clerkUserId: "clerk_id_nurse_111", // Clerk連携用のダミーID
			email: "nurse.one@example.com",
			firstName: "Hanako",
			lastName: "Yamada",
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
			email: "caregiver.one@example.com",
			firstName: "Taro",
			lastName: "Sato",
			role: UserRole.CAREGIVER,
			status: UserStatus.ACTIVE,
		},
		create: {
			id: "user_caregiver_001",
			clerkUserId: "clerk_id_caregiver_888",
			email: "caregiver.one@example.com",
			firstName: "Taro",
			lastName: "Sato",
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
	await prisma.user.upsert({
		where: { id: "user_nurse_pending_001" },
		update: { status: UserStatus.PENDING },
		create: {
			id: "user_nurse_pending_001",
			clerkUserId: null,
			email: "nurse.invited@example.com",
			firstName: "Yuki",
			lastName: "Yamamoto",
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
	// ----------------------------------------------------------------
	const elderTaro = await prisma.elder.upsert({
		where: { id: "elderly_001" },
		update: {
			firstName: "Ichiro",
			lastName: "Tanaka",
			roomNumber: "301",
			status: ElderStatus.ACTIVE,
		},
		create: {
			id: "elderly_001",
			firstName: "Ichiro",
			lastName: "Tanaka",
			roomNumber: "301",
			status: ElderStatus.ACTIVE,
			dateOfBirth: new Date("1940-03-15T00:00:00.000Z"),
			gender: "MALE",
		},
	});

	const elderMiyako = await prisma.elder.upsert({
		where: { id: "elderly_002" },
		update: {
			firstName: "Miyako",
			lastName: "Suzuki",
			roomNumber: "302",
			status: ElderStatus.ACTIVE,
		},
		create: {
			id: "elderly_002",
			firstName: "Miyako",
			lastName: "Suzuki",
			roomNumber: "302",
			status: ElderStatus.ACTIVE,
			dateOfBirth: new Date("1943-09-08T00:00:00.000Z"),
			gender: "FEMALE",
		},
	});

	const elderKenji = await prisma.elder.upsert({
		where: { id: "elderly_003" },
		update: {
			firstName: "Kenji",
			lastName: "Kobayashi",
			roomNumber: "305",
			status: ElderStatus.ACTIVE,
		},
		create: {
			id: "elderly_003",
			firstName: "Kenji",
			lastName: "Kobayashi",
			roomNumber: "305",
			status: ElderStatus.ACTIVE,
			dateOfBirth: new Date("1938-12-01T00:00:00.000Z"),
			gender: "MALE",
		},
	});

	// 退所済み。過去データは保持し status のみ変更する。
	await prisma.elder.upsert({
		where: { id: "elderly_004" },
		update: { status: ElderStatus.INACTIVE },
		create: {
			id: "elderly_004",
			firstName: "Keiko",
			lastName: "Watanabe",
			roomNumber: "308",
			status: ElderStatus.INACTIVE,
			dateOfBirth: new Date("1941-05-22T00:00:00.000Z"),
			gender: "FEMALE",
		},
	});

	// ----------------------------------------------------------------
	// 3. IoTデバイス
	//    deviceCode は一意。AI の ONLINE/OFFLINE とは別の概念で、
	//    ここでは「利用中か、故障したか」のみを持つ。
	// ----------------------------------------------------------------
	const device1 = await prisma.device.upsert({
		where: { id: "device_001" },
		update: {
			deviceName: "センサーA-001",
			deviceCode: "B8:27:EB:11:22:01",
			status: DeviceStatus.ACTIVE,
		},
		create: {
			id: "device_001",
			deviceName: "センサーA-001",
			deviceCode: "B8:27:EB:11:22:01",
			status: DeviceStatus.ACTIVE,
		},
	});

	const device2 = await prisma.device.upsert({
		where: { id: "device_002" },
		update: {
			deviceName: "センサーA-002",
			deviceCode: "B8:27:EB:11:22:02",
			status: DeviceStatus.ACTIVE,
		},
		create: {
			id: "device_002",
			deviceName: "センサーA-002",
			deviceCode: "B8:27:EB:11:22:02",
			status: DeviceStatus.ACTIVE,
		},
	});

	const device3 = await prisma.device.upsert({
		where: { id: "device_003" },
		update: {
			deviceName: "センサーA-003",
			deviceCode: "B8:27:EB:11:22:03",
			status: DeviceStatus.ACTIVE,
		},
		create: {
			id: "device_003",
			deviceName: "センサーA-003",
			deviceCode: "B8:27:EB:11:22:03",
			status: DeviceStatus.ACTIVE,
		},
	});

	// 故障したデバイス。物理削除せず INACTIVE で管理する。
	await prisma.device.upsert({
		where: { id: "device_004" },
		update: { status: DeviceStatus.INACTIVE },
		create: {
			id: "device_004",
			deviceName: "センサーA-004",
			deviceCode: "B8:27:EB:11:22:04",
			status: DeviceStatus.INACTIVE,
		},
	});

	// ----------------------------------------------------------------
	// 4. デバイス割当（DeviceAssignment）
	//    現在有効な割当は unassignedAt が NULL のレコード。
	//    解除済みの割当も削除せず履歴として残す。
	//    （同一 Elder/Device への有効な割当が重複しないこと）
	// ----------------------------------------------------------------
	await prisma.deviceAssignment.upsert({
		where: { id: "assign_001" },
		update: { unassignedAt: null },
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
		update: { unassignedAt: null },
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
		update: { unassignedAt: null },
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
			payload: { deviceId: "esp32-unknown-99", topic: "fall/esp32-unknown-99/data" },
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
