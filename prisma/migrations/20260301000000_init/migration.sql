-- CreateEnum
CREATE TYPE "CrawlJobStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "crawl_jobs" (
    "id" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "limit_count" INTEGER NOT NULL,
    "status" "CrawlJobStatus" NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crawl_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linkedin_profiles" (
    "id" BIGSERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "profile_url" TEXT,
    "profile_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linkedin_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_crawl_jobs_status" ON "crawl_jobs"("status");

-- CreateIndex
CREATE INDEX "idx_linkedin_profiles_job_id" ON "linkedin_profiles"("job_id");

-- AddForeignKey
ALTER TABLE "linkedin_profiles" ADD CONSTRAINT "linkedin_profiles_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "crawl_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
