import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { LinkedInProfileData } from "../types";

export async function insertProfile(jobId: number, profile: LinkedInProfileData): Promise<void> {
  await prisma.linkedInProfile.create({
    data: {
      jobId,
      profileUrl: profile.sourceUrl || null,
      profileJson: profile as unknown as Prisma.InputJsonValue
    }
  });
}
