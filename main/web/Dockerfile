# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install
COPY . .
RUN pnpm build

# Stage 2: Runtime
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copy only necessary files from the builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
