import { LinkedInProfileData } from "../types";
import { config } from "../config";
import { crawlViaOfficialApi } from "./officialApiCrawler";
import { crawlViaPlaywright } from "./playwrightCrawler";

export async function crawlLinkedIn(keyword: string, limit: number): Promise<LinkedInProfileData[]> {
  // Strategy switch lets you run API-only mode when you must stay inside official terms.
  if (config.linkedIn.strategy === "official_api") {
    return crawlViaOfficialApi(keyword, limit);
  }
  return crawlViaPlaywright(keyword, limit);
}