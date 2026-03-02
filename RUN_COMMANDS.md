# Run Commands Cheat Sheet

File này dành cho trường hợp bạn đã cài đủ dependency (`npm install`) và chỉ muốn chạy nhanh bằng lệnh.

## 1) Local Development

```bash
# Generate Prisma client
npm run prisma:generate

# Apply migrations (dev)
npm run prisma:migrate

# Start API (terminal 1)
npm run dev:api

# Start worker (terminal 2)
npm run dev:worker
```

## 2) Prisma Utilities

```bash
# Open Prisma Studio
npx prisma studio

# Check migration status
npx prisma migrate status

# Mark migration as applied (when needed)
npx prisma migrate resolve --applied 20260301000000_init
```

## 3) API Quick Test

```bash
# Health check
curl http://localhost:3000/health

# Create crawl job
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{"keyword":".Net","limit":1}'

# Get job status
curl http://localhost:3000/crawl/1

# Get detailed profiles by job
curl http://localhost:3000/crawl/1/profiles
```

## 4) Docker

```bash
# Build and run all services
docker compose up -d --build

# Recreate API only
docker compose up -d --build --force-recreate api

# Recreate worker only
docker compose up -d --build --force-recreate worker

# View worker logs
docker compose logs -f worker

# Check containers
docker compose ps
```

## 5) Playwright Browser (local, non-docker)

```bash
# Install Chromium for Playwright
npx playwright install chromium
```

## 6) Build

```bash
npm run build
```

