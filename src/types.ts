export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface CrawlJob {
  id: number;
  keyword: string;
  limit: number;
  status: JobStatus;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface LinkedInProfileData {
  sourceUrl?: string;
  name?: string;
  headline?: string;
  location?: string;
  experience?: string[];
  skills?: string[];
  posts?: string[];
  raw?: Record<string, unknown>;
}