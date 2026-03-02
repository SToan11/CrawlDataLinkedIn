import { config } from "../config";
import { LinkedInProfileData } from "../types";
import { logger } from "../utils/logger";

function randomMs(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function crawlViaPlaywright(keyword: string, limit: number): Promise<LinkedInProfileData[]> {
  // Playwright is optional so app can still run in official_api mode without browser deps.
  const { chromium } = await import("playwright");

  const browser = await chromium.launch({
    headless: config.linkedIn.headless,
    proxy: config.linkedIn.proxyUrl ? { server: config.linkedIn.proxyUrl } : undefined
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    if (config.linkedIn.liAtCookie) {
      await context.addCookies([
        {
          name: "li_at",
          value: config.linkedIn.liAtCookie,
          domain: ".linkedin.com",
          path: "/",
          httpOnly: true,
          secure: true
        }
      ]);
    } else {
      if (!config.linkedIn.email || !config.linkedIn.password) {
        throw new Error("Provide LINKEDIN_COOKIE_LI_AT or LINKEDIN_EMAIL/LINKEDIN_PASSWORD for playwright strategy.");
      }

      await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded" });
      await page.fill("#username", config.linkedIn.email);
      await page.fill("#password", config.linkedIn.password);
      await page.click("button[type='submit']");
      await page.waitForLoadState("networkidle");
    }

    const url = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keyword)}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const profiles: LinkedInProfileData[] = [];

    // NOTE: Selectors may change over time and should be updated as LinkedIn UI evolves.
    while (profiles.length < limit) {
      const cards = page.locator("li.reusable-search__result-container");
      const count = await cards.count();

      for (let i = 0; i < count && profiles.length < limit; i += 1) {
        const card = cards.nth(i);
        const name = (await card.locator("span[aria-hidden='true']").first().textContent())?.trim();
        const headline = (await card.locator("div.t-14.t-black.t-normal").first().textContent())?.trim();
        const location = (await card.locator("div.t-14.t-normal").first().textContent())?.trim();
        const sourceUrl = await card.locator("a").first().getAttribute("href");

        profiles.push({
          sourceUrl: sourceUrl || undefined,
          name: name || undefined,
          headline: headline || undefined,
          location: location || undefined,
          experience: [],
          skills: [],
          posts: [],
          raw: { keyword }
        });

        await delay(randomMs(config.linkedIn.minDelayMs, config.linkedIn.maxDelayMs));
      }

      if (profiles.length >= limit) break;

      const nextButton = page.locator("button[aria-label='Next']");
      if ((await nextButton.count()) === 0) break;
      if (await nextButton.isDisabled()) break;

      await nextButton.click();
      await page.waitForLoadState("networkidle");
      await delay(randomMs(config.linkedIn.minDelayMs, config.linkedIn.maxDelayMs));
    }

    logger.info("Playwright crawl finished", { keyword, extracted: profiles.length });
    return profiles.slice(0, limit);
  } finally {
    await context.close();
    await browser.close();
  }
}