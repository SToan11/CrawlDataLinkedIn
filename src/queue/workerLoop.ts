import { crawlLinkedIn } from "../crawler/linkedinCrawler";
import { claimNextPendingJob, updateJobStatus } from "../db/jobsRepo";
import { insertProfile } from "../db/profilesRepo";
import { logger } from "../utils/logger";

export async function runOneWorkerIteration(): Promise<void> {
  // Program flow step 2:
  // Worker picks the oldest pending job and marks it running with row-level lock.
  const job = await claimNextPendingJob();
  if (!job) return;

  logger.info("Worker started job", { jobId: job.id, keyword: job.keyword, limit: job.limit });

  try {
    // Program flow step 3-4:
    // Search LinkedIn via selected strategy and extract profile data.
    const profiles = await crawlLinkedIn(job.keyword, job.limit);

    // Mark as failed when nothing is extracted so config/auth issues are visible.
    if (profiles.length === 0) {
      const emptyResultMessage =
        "Crawl returned 0 profiles. Check LinkedIn auth/session, strategy configuration, selectors, proxy, and rate limits.";
      await updateJobStatus(job.id, "failed", emptyResultMessage);
      logger.warn("Worker marked job as failed due to empty crawl result", {
        jobId: job.id,
        keyword: job.keyword,
        limit: job.limit
      });
      return;
    }

    // Program flow step 5:
    // Store each profile JSON payload in PostgreSQL.
    for (const profile of profiles) {
      await insertProfile(job.id, profile);
    }

    // Program flow step 6:
    // Mark successful completion.
    await updateJobStatus(job.id, "completed");
    logger.info("Worker completed job", { jobId: job.id, profilesSaved: profiles.length });
  } catch (err) {
    const message = (err as Error).message;
    await updateJobStatus(job.id, "failed", message);
    logger.error("Worker failed job", { jobId: job.id, error: message });
  }
}
