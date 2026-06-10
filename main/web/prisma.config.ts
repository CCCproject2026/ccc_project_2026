import { config } from 'dotenv'
import { defineConfig } from '@prisma/config'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env') })

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || '',
  },
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
})
