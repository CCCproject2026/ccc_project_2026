FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --no-frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "pnpm install --no-frozen-lockfile && pnpm dev"]