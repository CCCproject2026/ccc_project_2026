import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// 開発中のホットリロードで接続が増えないようにする
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
