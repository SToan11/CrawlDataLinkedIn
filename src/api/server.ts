import express from "express";
import { createJob, getJobById } from "../db/jobsRepo";
import { logger, serializeError } from "../utils/logger";

export function buildServer(): express.Express {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Helper endpoint for OAuth setup. After LinkedIn redirect, copy `code`
  // and exchange it for an access token as documented in README.
  app.get("/oauth/linkedin/callback", (req, res) => {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    if (!code) {
      return res.status(400).json({ error: "Missing authorization code" });
    }
    return res.json({ code, state });
  });

  // Program flow step 1:
  // User sends POST /crawl { keyword, limit }
  // API validates input and stores a pending job in PostgreSQL.
  app.post("/crawl", async (req, res) => {
    try {
      const keyword = String(req.body?.keyword || "").trim();
      const limit = Number(req.body?.limit || 10);

      if (!keyword) {
        return res.status(400).json({ error: "keyword is required" });
      }
      if (Number.isNaN(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({ error: "limit must be an integer between 1 and 100" });
      }

      const job = await createJob(keyword, limit);
      logger.info("Created crawl job", { jobId: job.id, keyword, limit });
      return res.status(202).json({
        jobId: job.id,
        status: job.status,
        message: "Job queued"
      });
    } catch (err) {
      logger.error("POST /crawl failed", { error: serializeError(err) });
      return res.status(500).json({ error: "Failed to queue crawl job" });
    }
  });

  // Status endpoint so clients can track pending -> running -> completed/failed.
  app.get("/crawl/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: "invalid id" });

      const job = await getJobById(id);
      if (!job) return res.status(404).json({ error: "job not found" });

      return res.json(job);
    } catch (err) {
      logger.error("GET /crawl/:id failed", { error: serializeError(err) });
      return res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  return app;
}
