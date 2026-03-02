import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { CrawlJob } from "../types";

function mapRow(row: {
  id: number;
  keyword: string;
  limit_count: number;
  status: string;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}): CrawlJob {
  return {
    id: row.id,
    keyword: row.keyword,
    limit: row.limit_count,
    status: row.status as CrawlJob["status"],
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function createJob(keyword: string, limit: number): Promise<CrawlJob> {
  const created = await prisma.crawlJob.create({
    data: {
      keyword,
      limitCount: limit,
      status: "pending"
    }
  });

  return {
    id: created.id,
    keyword: created.keyword,
    limit: created.limitCount,
    status: created.status,
    error_message: created.errorMessage,
    created_at: created.createdAt,
    updated_at: created.updatedAt
  };
}

export async function getJobById(id: number): Promise<CrawlJob | null> {
  const row = await prisma.crawlJob.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    keyword: row.keyword,
    limit: row.limitCount,
    status: row.status as CrawlJob["status"],
    error_message: row.errorMessage,
    created_at: row.createdAt,
    updated_at: row.updatedAt
  };
}

export async function claimNextPendingJob(): Promise<CrawlJob | null> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const selected = await tx.$queryRaw<
      Array<{
        id: number;
        keyword: string;
        limit_count: number;
        status: string;
        error_message: string | null;
        created_at: Date;
        updated_at: Date;
      }>
    >`
      SELECT id, keyword, limit_count, status::text, error_message, created_at, updated_at
      FROM crawl_jobs
      WHERE status = 'pending'::"CrawlJobStatus"
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `;

    if (selected.length === 0) {
      return null;
    }

    const picked = selected[0];
    const updated = await tx.crawlJob.update({
      where: { id: picked.id },
      data: {
        status: "running",
        errorMessage: null
      }
    });

    return {
      id: updated.id,
      keyword: updated.keyword,
      limit: updated.limitCount,
      status: updated.status as CrawlJob["status"],
      error_message: updated.errorMessage,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt
    };
  });
}

export async function updateJobStatus(
  id: number,
  status: CrawlJob["status"],
  errorMessage?: string
): Promise<void> {
  await prisma.crawlJob.update({
    where: { id },
    data: {
      status,
      errorMessage: errorMessage || null
    }
  });
}
