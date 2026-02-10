FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=/data/tidyhouse.db
RUN mkdir -p /data && npm run build
RUN sed -i "s/__BUILD_HASH__/$(date +%s)/" public/sw.js

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=/data/tidyhouse.db

# Install build deps for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy migration script and install better-sqlite3 for runtime migrations
COPY --from=builder /app/src/db/migrate.cjs ./migrate.cjs
COPY --from=builder /app/scripts/start.sh ./start.sh
RUN chmod +x ./start.sh
RUN npm install better-sqlite3

RUN mkdir -p /data
VOLUME /data

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["./start.sh"]
