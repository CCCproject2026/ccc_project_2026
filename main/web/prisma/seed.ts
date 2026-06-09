import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.upsert({
    where: { id: 'user_nurse_admin_001' },
    update: {
      email: 'nurse.admin@example.com',
      name: 'Yamada Hanako',
      role: 'admin',
    },
    create: {
      id: 'user_nurse_admin_001',
      email: 'nurse.admin@example.com',
      name: 'Yamada Hanako',
      role: 'admin',
    },
  })

  const member = await prisma.user.upsert({
    where: { id: 'user_caregiver_001' },
    update: {
      email: 'caregiver.one@example.com',
      name: 'Sato Taro',
      role: 'member',
    },
    create: {
      id: 'user_caregiver_001',
      email: 'caregiver.one@example.com',
      name: 'Sato Taro',
      role: 'member',
    },
  })

  const elderlyTaro = await prisma.elderly.upsert({
    where: { id: 'elderly_001' },
    update: {
      name: 'Tanaka Ichiro',
      age: 82,
      roomNumber: '301',
    },
    create: {
      id: 'elderly_001',
      name: 'Tanaka Ichiro',
      age: 82,
      roomNumber: '301',
    },
  })

  const elderlyMiyako = await prisma.elderly.upsert({
    where: { id: 'elderly_002' },
    update: {
      name: 'Suzuki Miyako',
      age: 78,
      roomNumber: '302',
    },
    create: {
      id: 'elderly_002',
      name: 'Suzuki Miyako',
      age: 78,
      roomNumber: '302',
    },
  })

  const elderlyKenji = await prisma.elderly.upsert({
    where: { id: 'elderly_003' },
    update: {
      name: 'Kobayashi Kenji',
      age: 86,
      roomNumber: '305',
    },
    create: {
      id: 'elderly_003',
      name: 'Kobayashi Kenji',
      age: 86,
      roomNumber: '305',
    },
  })

  await prisma.elderly.upsert({
    where: { id: 'elderly_004' },
    update: {
      name: 'Watanabe Keiko',
      age: 91,
      roomNumber: '308',
    },
    create: {
      id: 'elderly_004',
      name: 'Watanabe Keiko',
      age: 91,
      roomNumber: '308',
    },
  })

  await prisma.device.upsert({
    where: { macAddress: 'B8:27:EB:11:22:01' },
    update: {
      status: 'active',
      battery: 86,
      elderlyId: elderlyTaro.id,
    },
    create: {
      macAddress: 'B8:27:EB:11:22:01',
      status: 'active',
      battery: 86,
      elderlyId: elderlyTaro.id,
    },
  })

  await prisma.device.upsert({
    where: { macAddress: 'B8:27:EB:11:22:02' },
    update: {
      status: 'active',
      battery: 42,
      elderlyId: elderlyMiyako.id,
    },
    create: {
      macAddress: 'B8:27:EB:11:22:02',
      status: 'active',
      battery: 42,
      elderlyId: elderlyMiyako.id,
    },
  })

  await prisma.device.upsert({
    where: { macAddress: 'B8:27:EB:11:22:03' },
    update: {
      status: 'maintenance',
      battery: 18,
      elderlyId: elderlyKenji.id,
    },
    create: {
      macAddress: 'B8:27:EB:11:22:03',
      status: 'maintenance',
      battery: 18,
      elderlyId: elderlyKenji.id,
    },
  })

  await prisma.device.upsert({
    where: { macAddress: 'B8:27:EB:11:22:99' },
    update: {
      status: 'inactive',
      battery: 100,
      elderlyId: null,
    },
    create: {
      macAddress: 'B8:27:EB:11:22:99',
      status: 'inactive',
      battery: 100,
    },
  })

  await prisma.alertHistory.upsert({
    where: { id: 'alert_001' },
    update: {
      status: 'fallen',
      createdAt: new Date('2026-06-04T08:15:00.000Z'),
      resolvedAt: null,
      elderlyId: elderlyMiyako.id,
      resolvedById: null,
    },
    create: {
      id: 'alert_001',
      status: 'fallen',
      createdAt: new Date('2026-06-04T08:15:00.000Z'),
      elderlyId: elderlyMiyako.id,
    },
  })

  await prisma.alertHistory.upsert({
    where: { id: 'alert_002' },
    update: {
      status: 'fallen',
      createdAt: new Date('2026-06-03T21:40:00.000Z'),
      resolvedAt: new Date('2026-06-03T21:47:00.000Z'),
      elderlyId: elderlyTaro.id,
      resolvedById: admin.id,
    },
    create: {
      id: 'alert_002',
      status: 'fallen',
      createdAt: new Date('2026-06-03T21:40:00.000Z'),
      resolvedAt: new Date('2026-06-03T21:47:00.000Z'),
      elderlyId: elderlyTaro.id,
      resolvedById: admin.id,
    },
  })

  await prisma.alertHistory.upsert({
    where: { id: 'alert_003' },
    update: {
      status: 'false_alarm',
      createdAt: new Date('2026-06-03T14:05:00.000Z'),
      resolvedAt: new Date('2026-06-03T14:08:00.000Z'),
      elderlyId: elderlyKenji.id,
      resolvedById: member.id,
    },
    create: {
      id: 'alert_003',
      status: 'false_alarm',
      createdAt: new Date('2026-06-03T14:05:00.000Z'),
      resolvedAt: new Date('2026-06-03T14:08:00.000Z'),
      elderlyId: elderlyKenji.id,
      resolvedById: member.id,
    },
  })

  console.log('Seed data created')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
