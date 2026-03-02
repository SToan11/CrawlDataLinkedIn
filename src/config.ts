import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function parseNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (Number.isNaN(n)) {
    throw new Error(`Invalid number for ${name}: ${raw}`);
  }
  return n;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  apiPort: parseNumber("API_PORT", 3000),
  postgresPort: parseNumber("POSTGRES_PORT", 5432),
  databaseUrl: required("DATABASE_URL"),
  workerPollMs: parseNumber("WORKER_POLL_MS", 5000),
  workerBatchSize: parseNumber("WORKER_BATCH_SIZE", 1),
  linkedIn: {
    clientId: process.env.LINKEDIN_CLIENT_ID || "",
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || "",
    accessToken: process.env.LINKEDIN_ACCESS_TOKEN || "",
    strategy: process.env.CRAWL_STRATEGY || "playwright_scrape",
    email: process.env.LINKEDIN_EMAIL || "",
    password: process.env.LINKEDIN_PASSWORD || "",
    liAtCookie: process.env.LINKEDIN_COOKIE_LI_AT || "",
    proxyUrl: process.env.PROXY_URL || "",
    debugArtifactsDir: process.env.DEBUG_ARTIFACTS_DIR || "debug-artifacts",
    headless: (process.env.PLAYWRIGHT_HEADLESS || "true") === "true",
    minDelayMs: parseNumber("MIN_DELAY_MS", 1200),
    maxDelayMs: parseNumber("MAX_DELAY_MS", 3500)
  }
};
