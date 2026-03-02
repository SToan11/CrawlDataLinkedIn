# LinkedIn Crawl Agent (Node.js + Prisma + PostgreSQL + Docker)

This project provides:
- An Express API with `POST /crawl`
- A PostgreSQL-backed job queue
- A worker process that runs crawls asynchronously
- A LinkedIn crawler module with 2 strategies:
  - `official_api` (uses LinkedIn API where allowed)
  - `playwright_scrape` (fallback browser automation)

> Important: LinkedIn Terms of Service and API policies may restrict data collection, automated access, and storage. Use only with proper authorization and legal review.

## Architecture

Program flow implemented in code comments:
1. User sends `POST /crawl { keyword, limit }`
2. API stores a `pending` job in PostgreSQL
3. Worker picks a job (`pending -> running`)
4. Worker crawls LinkedIn (API or Playwright strategy)
5. Worker stores each profile JSON in PostgreSQL
6. Worker marks job `completed` or `failed`

## Project Structure

```text
src/
  api/server.ts                # Express API (/crawl + /crawl/:id)
  crawler/
    linkedinCrawler.ts         # Strategy router
    officialApiCrawler.ts      # LinkedIn official API mode
    playwrightCrawler.ts       # Browser automation fallback mode
  db/
    prisma.ts                  # Prisma client singleton
    jobsRepo.ts                # queue/job lifecycle via Prisma
    profilesRepo.ts            # profile persistence
  queue/workerLoop.ts          # async job execution
  utils/logger.ts              # structured console logging
  config.ts                    # env loading + validation
  index.ts                     # API entry
  worker.ts                    # Worker entry
prisma/
  schema.prisma               # Prisma models
  migrations/                 # SQL migrations for PostgreSQL
```

## 1. LinkedIn Developer Setup (OAuth2)

### Step 1: Create a LinkedIn app
1. Go to https://www.linkedin.com/developers/
2. Sign in and open **My Apps**.
3. Click **Create app**.
4. Fill required fields (app name, company page, app logo, legal info).
5. Create the app.

### Step 2: Find Client ID and Client Secret
1. Open your app dashboard.
2. Go to **Auth**.
3. Copy:
   - `Client ID`
   - `Client Secret`
4. Put them in `.env` as:
   - `LINKEDIN_CLIENT_ID=...`
   - `LINKEDIN_CLIENT_SECRET=...`

### Step 3: Configure redirect URI
1. In **Auth**, add an authorized redirect URL, for example:
   - `http://localhost:3000/oauth/linkedin/callback`
2. Save changes.
3. Put the same URI in `.env`:
   - `LINKEDIN_REDIRECT_URI=http://localhost:3000/oauth/linkedin/callback`

### Step 4: Request products and permissions
In your app dashboard, request/enable needed LinkedIn products. Common scopes:
- `r_liteprofile` (basic profile)
- `r_emailaddress` (member email)
- `w_member_social` (post/share on behalf of member)

Depending on LinkedIn approval and app type, some scopes or APIs may be restricted.

### Step 5: Build authorization URL
Open this URL in browser (replace placeholders):

```text
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=URL_ENCODED_REDIRECT_URI&state=RANDOM_CSRF_STRING&scope=r_liteprofile%20r_emailaddress%20w_member_social
```

Example (line breaks for readability):
```text
https://www.linkedin.com/oauth/v2/authorization
?response_type=code
&client_id=YOUR_CLIENT_ID
&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Foauth%2Flinkedin%2Fcallback
&state=abc123secure
&scope=r_liteprofile%20r_emailaddress%20w_member_social
```

### Step 6: Capture the authorization code
After user consent, LinkedIn redirects to:

```text
http://localhost:3000/oauth/linkedin/callback?code=AUTH_CODE&state=abc123secure
```

Copy `code`.

### Step 7: Exchange code for access token
Use curl:

```bash
curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=AUTH_CODE" \
  -d "redirect_uri=http://localhost:3000/oauth/linkedin/callback" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

Response includes `access_token` and `expires_in`.

Put token in `.env`:

```env
LINKEDIN_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
CRAWL_STRATEGY=official_api
```

## 2. Platform Limitations and Fallback Scraping

LinkedIn official APIs usually do **not** allow broad people search and full profile extraction (skills, detailed experience, arbitrary posts) for general apps.

If your use case requires data outside official API access:
- Use `CRAWL_STRATEGY=playwright_scrape`
- Provide one auth mode:
  - `LINKEDIN_COOKIE_LI_AT` (preferred session cookie mode), or
  - `LINKEDIN_EMAIL` + `LINKEDIN_PASSWORD`

Best practices for scraping mode:
- Rotate proxies (`PROXY_URL` / proxy pool per run)
- Apply rate limits and random delays (`MIN_DELAY_MS`, `MAX_DELAY_MS`)
- Persist session cookies between runs (avoid repeated logins)
- Limit crawl volume per job and monitor failures
- Respect robots, ToS, and local law

Install browser binaries when using Playwright locally:

```bash
npx playwright install chromium
```

## 3. Environment Variables

Copy template:

```bash
cp .env.example .env
```

Set at least:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/linkedin_crawl
API_PORT=3000
POSTGRES_PORT=5432
WORKER_POLL_MS=5000
WORKER_BATCH_SIZE=1

LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_REDIRECT_URI=http://localhost:3000/oauth/linkedin/callback
LINKEDIN_ACCESS_TOKEN=...

CRAWL_STRATEGY=official_api
# OR
CRAWL_STRATEGY=playwright_scrape
LINKEDIN_COOKIE_LI_AT=...
DEBUG_ARTIFACTS_DIR=debug-artifacts
```

## 4. Run Locally (without Docker)

1. Install deps:

```bash
npm install
```

2. Start PostgreSQL (local or Docker), ensure `DATABASE_URL` works.

3. Generate Prisma client and apply migration:

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Start API:

```bash
npm run dev:api
```

5. Start worker (new terminal):

```bash
npm run dev:worker
```

6. Trigger crawl job:

```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{"keyword":"software engineer","limit":5}'
```

7. Check status:

```bash
curl http://localhost:3000/crawl/1
```

8. Get detailed crawled profiles for a job:

```bash
curl http://localhost:3000/crawl/1/profiles
```

## 5. Run with Docker

1. Prepare env:

```bash
cp .env.example .env
# edit .env values
```

2. Build and start:

```bash
docker compose up --build
```
First build takes longer because Chromium is installed for Playwright mode.

3. API available at:
- `http://localhost:${API_PORT}` (default `http://localhost:3000`)

4. Submit job:

```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{"keyword":"data scientist","limit":10}'
```

## 6. Example API Responses

Create job:

```json
{
  "jobId": 3,
  "status": "pending",
  "message": "Job queued"
}
```

Get status:

```json
{
  "id": 3,
  "keyword": "data scientist",
  "limit": 10,
  "status": "running",
  "error_message": null,
  "created_at": "2026-02-27T00:00:00.000Z",
  "updated_at": "2026-02-27T00:00:10.000Z"
}
```

## 7. Notes

- The crawler returns partial fields depending on strategy and page/API availability.
- Playwright selectors can break when LinkedIn changes UI; adjust selectors in `src/crawler/playwrightCrawler.ts`.
- When Playwright returns `0` profiles, debug artifacts are written to `${DEBUG_ARTIFACTS_DIR}`:
  - `linkedin-zero-*.png` screenshot
  - `linkedin-zero-*.html` DOM snapshot
  - `pageUrl` is logged in worker logs
- Ports:
  - API: `${API_PORT}` (default `3000`)
  - PostgreSQL host port: `${POSTGRES_PORT}` (default `5432`)
- Docker startup waits for PostgreSQL health before running Prisma migrations.
- For production scale, replace polling with a dedicated queue (e.g., BullMQ + Redis), add retry/backoff, and central logging.
