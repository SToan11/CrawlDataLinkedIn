import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { LinkedInProfileData, StoredLinkedInProfile } from "../types";

export async function insertProfile(jobId: number, profile: LinkedInProfileData): Promise<void> {
  await prisma.linkedInProfile.create({
    data: {
      jobId,
      profileUrl: profile.sourceUrl || null,
      profileJson: profile as unknown as Prisma.InputJsonValue
    }
  });
}

export async function getProfilesByJobId(jobId: number): Promise<StoredLinkedInProfile[]> {
  const rows = await prisma.linkedInProfile.findMany({
    where: { jobId },
    orderBy: { createdAt: "asc" }
  });

  return rows.map((row) => ({
    id: row.id.toString(),
    job_id: row.jobId,
    profile_url: row.profileUrl,
    profile_json: row.profileJson as LinkedInProfileData,
    created_at: row.createdAt
  }));
}
