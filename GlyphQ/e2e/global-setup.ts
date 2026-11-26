/*
 * The dev server answers before its first bundle is built, and that build can
 * take a minute or more on a cold machine. Load the app once here so no test
 * spends its own timeout waiting for the bundler.
 */
import { chromium, type FullConfig } from "@playwright/test";

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:8090";
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(baseURL, { timeout: 240_000 });
  await page.getByText("My Library").waitFor({ timeout: 240_000 });
  await browser.close();
}
