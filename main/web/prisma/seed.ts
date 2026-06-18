import { PrismaClient, UserRole, UserStatus, ElderStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // ----------------------------------------------------------------
    // 1. ユーザー管理（スタッフ）データの作成 / 更新
    // ----------------------------------------------------------------
    const admin = await prisma.user.upsert({
        where: { id: "user_nurse_admin_001" },
        update: {
            email: "nurse.admin@example.com",
            firstName: "Hanako",
            lastName: "Yamada",
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE,
        },
        create: {
            id: "user_nurse_admin_001",
            clerkId: "clerk_id_admin_999", // Clerk連携用のダミーID
            email: "nurse.admin@example.com",
            firstName: "Hanako",
            lastName: "Yamada",
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE,
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
            clerkId: "clerk_id_caregiver_888",
            email: "caregiver.one@example.com",
            firstName: "Taro",
            lastName: "Sato",
            role: UserRole.CAREGIVER,
            status: UserStatus.ACTIVE,
        },
    });

    // ----------------------------------------------------------------
    // 2. 高齢者データの作成 / 更新（作成者としてadminのIDを紐付け）
    // ----------------------------------------------------------------
    const elderTaro = await prisma.elder.upsert({
        where: { id: "elderly_001" },
        update: { firstName: "Ichiro", lastName: "Tanaka", roomNumber: "301", status: ElderStatus.ACTIVE },
        create: {
            id: "elderly_001",
            firstName: "Ichiro",
            lastName: "Tanaka",
            roomNumber: "301",
            status: ElderStatus.ACTIVE,
            createdById: admin.id, // スキーマの「誰が登録したか」を満たす
        },
    });

    const elderMiyako = await prisma.elder.upsert({
        where: { id: "elderly_002" },
        update: { firstName: "Miyako", lastName: "Suzuki", roomNumber: "302", status: ElderStatus.ACTIVE },
        create: {
            id: "elderly_002",
            firstName: "Miyako",
            lastName: "Suzuki",
            roomNumber: "302",
            status: ElderStatus.ACTIVE,
            createdById: admin.id,
        },
    });

    const elderKenji = await prisma.elder.upsert({
        where: { id: "elderly_003" },
        update: { firstName: "Kenji", lastName: "Kobayashi", roomNumber: "305", status: ElderStatus.ACTIVE },
        create: {
            id: "elderly_003",
            firstName: "Kenji",
            lastName: "Kobayashi",
            roomNumber: "305",
            status: ElderStatus.ACTIVE,
            createdById: admin.id,
        },
    });

    await prisma.elder.upsert({
        where: { id: "elderly_004" },
        update: { firstName: "Keiko", lastName: "Watanabe", roomNumber: "308", status: ElderStatus.ACTIVE },
        create: {
            id: "elderly_004",
            firstName: "Keiko",
            lastName: "Watanabe",
            roomNumber: "308",
            status: ElderStatus.ACTIVE,
            createdById: admin.id,
        },
    });

    // ----------------------------------------------------------------
    // 3. IoTデバイスデータの作成 / 更新（シリアルコード等に対応）
    // ----------------------------------------------------------------
    const device1 = await prisma.device.upsert({
        where: { id: "device_001" },
        update: { deviceName: "センサーA-001", serialCode: "B8:27:EB:11:22:01" },
        create: { id: "device_001", deviceName: "センサーA-001", serialCode: "B8:27:EB:11:22:01" },
    });

    const device2 = await prisma.device.upsert({
        where: { id: "device_002" },
        update: { deviceName: "センサーA-002", serialCode: "B8:27:EB:11:22:02" },
        create: { id: "device_002", deviceName: "センサーA-002", serialCode: "B8:27:EB:11:22:02" },
    });

    const device3 = await prisma.device.upsert({
        where: { id: "device_003" },
        update: { deviceName: "センサーA-003", serialCode: "B8:27:EB:11:22:03" },
        create: { id: "device_003", deviceName: "センサーA-003", serialCode: "B8:27:EB:11:22:03" },
    });

    // ----------------------------------------------------------------
    // 4. 【重要】デバイス割当（DeviceAssignment）の作成
    // ----------------------------------------------------------------
    // デバイスと高齢者の紐付けは中間テーブルで行う論理設計に変更しました
    await prisma.deviceAssignment.upsert({
        where: { id: "assign_001" },
        update: { is_active: true },
        create: { id: "assign_001", elderId: elderTaro.id, deviceId: device1.id, is_active: true },
    });

    await prisma.deviceAssignment.upsert({
        where: { id: "assign_002" },
        update: { is_active: true },
        create: { id: "assign_002", elderId: elderMiyako.id, deviceId: device2.id, is_active: true },
    });

    await prisma.deviceAssignment.upsert({
        where: { id: "assign_003" },
        update: { is_active: true },
        create: { id: "assign_003", elderId: elderKenji.id, deviceId: device3.id, is_active: true },
    });

    // ----------------------------------------------------------------
    // 5. 転倒ログ（FallLog）データの作成 / 更新
    // ----------------------------------------------------------------
    // アラーム履歴は「本当に転倒したか (isActualFall: boolean)」で記録します
    
    // 例1: まだ誰も対応していないリアルタイムの警告
    await prisma.fallLog.upsert({
        where: { id: "alert_001" },
        update: { isActualFall: null, staffId: null },
        create: {
            id: "alert_001",
            elderId: elderMiyako.id,
            deviceId: device2.id,
            alarmTime: new Date("2026-06-18T08:15:00.000Z"),
            isActualFall: null, // 未記入状態
        },
    });

    // 例2: 看護師管理者(admin)が駆けつけ、本当に転倒していたケース
    await prisma.fallLog.upsert({
        where: { id: "alert_002" },
        update: { isActualFall: true, staffId: admin.id },
        create: {
            id: "alert_002",
            elderId: elderTaro.id,
            deviceId: device1.id,
            alarmTime: new Date("2026-06-17T21:40:00.000Z"),
            responseTime: new Date("2026-06-17T21:47:00.000Z"),
            isActualFall: true, // 本当に倒れていた
            staffId: admin.id,   // 対応したスタッフ
            notes: "ベッド横で転倒を確認。骨折の疑いがないためお声がけして復帰。",
        },
    });

    // 例3: 介護士(member)が確認し、誤検知（False Alarm）だったケース
    await prisma.fallLog.upsert({
        where: { id: "alert_003" },
        update: { isActualFall: false, staffId: member.id },
        create: {
            id: "alert_003",
            elderId: elderKenji.id,
            deviceId: device3.id,
            alarmTime: new Date("2026-06-17T14:05:00.000Z"),
            responseTime: new Date("2026-06-17T14:08:00.000Z"),
            isActualFall: false, // 誤検知だった！
            staffId: member.id,  // 対応したスタッフ
            notes: "センサーが寝返りの衝撃を誤検知。ご本人は安眠中。",
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