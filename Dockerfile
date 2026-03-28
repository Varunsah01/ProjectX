# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
COPY packages/landing/package.json packages/landing/package.json
COPY packages/mobile-app/package.json packages/mobile-app/package.json
COPY packages/web-app/package.json packages/web-app/package.json
COPY packages/web-app/prisma packages/web-app/prisma
RUN npm ci

FROM base AS builder
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY --from=deps /app/packages ./packages
COPY . .
RUN npx prisma generate --schema packages/web-app/prisma/schema.prisma
RUN npm run build -w packages/web-app

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/packages/web-app/public ./packages/web-app/public
COPY --from=builder /app/packages/web-app/.next/standalone ./
COPY --from=builder /app/packages/web-app/.next/static ./packages/web-app/.next/static
USER nextjs
EXPOSE 3001
CMD ["node", "packages/web-app/server.js"]
