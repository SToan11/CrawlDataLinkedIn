import { config } from "../config";
import { LinkedInProfileData } from "../types";
import { logger } from "../utils/logger";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function randomMs(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function safePart(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 48);
}

function nonEmpty(value: string | null | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
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
    await page
      .waitForSelector("[data-view-name='people-search-result']", { timeout: 15000 })
      .catch(() => undefined);

    const profiles: LinkedInProfileData[] = [];

    // NOTE: Selectors may change over time and should be updated as LinkedIn UI evolves.
    while (profiles.length < limit) {
      const cards = page.locator("[data-view-name='people-search-result']");
      const count = await cards.count();

      for (let i = 0; i < count && profiles.length < limit; i += 1) {
        const card = cards.nth(i);
        const firstTextOrUndefined = async (selector: string): Promise<string | undefined> => {
          const locator = card.locator(selector).first();
          if ((await locator.count()) === 0) return undefined;
          return nonEmpty(await locator.textContent({ timeout: 1000 }).catch(() => null));
        };

        const profileLink = card.locator("a[href*='/in/']").first();
        const sourceUrl = await profileLink.getAttribute("href");
        const cardTextLines = (await card.innerText())
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        // Use robust, attribute-driven selectors first; fallback to text lines when UI classes change.
        const name =
          nonEmpty(await profileLink.textContent({ timeout: 1000 }).catch(() => null)) ||
          (await firstTextOrUndefined("[data-test-app-aware-link]")) ||
          cardTextLines[0];
        const headline =
          (await firstTextOrUndefined("[data-test-search-result-primary-subtitle]")) ||
          cardTextLines[1];
        const location =
          (await firstTextOrUndefined("[data-test-search-result-secondary-subtitle]")) ||
          cardTextLines[2];

        if (!sourceUrl && !name) {
          continue;
        }

        profiles.push({
          sourceUrl: sourceUrl || undefined,
          name,
          headline,
          location,
          experience: [],
          skills: [],
          posts: [],
          raw: {
            keyword,
            cardTextLines
          }
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

    if (profiles.length === 0) {
      const dir = path.resolve(config.linkedIn.debugArtifactsDir);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const base = `linkedin-zero-${safePart(keyword)}-${stamp}`;
      const screenshotPath = path.join(dir, `${base}.png`);
      const htmlPath = path.join(dir, `${base}.html`);

      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await writeFile(htmlPath, await page.content(), "utf8");

      logger.warn("Playwright crawl returned 0 profiles", {
        keyword,
        pageUrl: page.url(),
        screenshotPath,
        htmlPath
      });
    }

    logger.info("Playwright crawl finished", { keyword, extracted: profiles.length });
    return profiles.slice(0, limit);
  } finally {
    await context.close();
    await browser.close();
  }
}
