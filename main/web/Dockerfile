# Pinned to current node:20-alpine index digest for reproducible builds.
ARG NODE_IMAGE=node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293
FROM ${NODE_IMAGE} AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Prisma CLI/マイグレーション専用ステージ（Next.js のフロントエンドビルドをスキップして高速化）
FROM deps AS prisma-cli
WORKDIR /app
COPY package.json tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm prisma generate --generator client

FROM prisma-cli AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY next.config.mjs postcss.config.js next-env.d.ts eslint.config.mjs biome.json ./
COPY public ./public
COPY src ./src
RUN --mount=type=cache,target=/app/.next/cache \
    pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
