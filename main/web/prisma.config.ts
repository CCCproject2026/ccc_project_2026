import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@prisma/config'
import { config } from 'dotenv'

config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env') })

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
})
