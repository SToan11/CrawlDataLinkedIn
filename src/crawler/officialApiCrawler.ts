import { config } from "../config";
import { LinkedInProfileData } from "../types";
import { logger } from "../utils/logger";

export async function crawlViaOfficialApi(keyword: string, limit: number): Promise<LinkedInProfileData[]> {
  if (!config.linkedIn.accessToken) {
    throw new Error("LINKEDIN_ACCESS_TOKEN is required for official_api strategy.");
  }

  // LinkedIn official APIs generally do not provide broad people-search/profile-scrape access.
  // This implementation fetches authenticated member profile as a compliance-safe example.
  const meRes = await fetch("https://api.linkedin.com/v2/me", {
    headers: {
      Authorization: `Bearer ${config.linkedIn.accessToken}`
    }
  });

  if (!meRes.ok) {
    const body = await meRes.text();
    throw new Error(`LinkedIn /v2/me failed: ${meRes.status} ${body}`);
  }

  const meJson = (await meRes.json()) as Record<string, unknown>;
  logger.warn("Official API mode does not support arbitrary user search in most apps.", {
    keyword,
    requestedLimit: limit
  });

  const profile: LinkedInProfileData = {
    sourceUrl: "https://api.linkedin.com/v2/me",
    name: [meJson["localizedFirstName"], meJson["localizedLastName"]].filter(Boolean).join(" "),
    raw: meJson
  };

  return [profile];
}