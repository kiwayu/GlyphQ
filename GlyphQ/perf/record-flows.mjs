// Records one video per core flow with a real book: node perf/record-flows.mjs   (dev server on :8090)
// Output: docs/refine/recordings/<flow>.webm
import { chromium, devices } from "@playwright/test";
import fs from "fs";
const OUT = "docs/refine/recordings";
const BOOK = "perf/books/small-alice.epub";
const URL = process.env.APP_URL || "http://localhost:8090/";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const wait = (page, ms) => page.waitForTimeout(ms);

async function flow(name, steps) {
  const ctx = await browser.newContext({ ...devices["Pixel 5"], recordVideo: { dir: OUT + "/tmp", size: { width: 393, height: 727 } } });
  const page = await ctx.newPage();
  const vp = page.viewportSize();
  const ui = {
    page,
    centre: () => page.mouse.click(vp.width / 2, vp.height / 2),
    next: () => page.mouse.click(vp.width - 30, vp.height / 2),
    prev: () => page.mouse.click(30, vp.height / 2),
    add: async () => {
      const [ch] = await Promise.all([page.waitForEvent("filechooser"), page.getByText("Add", { exact: true }).click()]);
      await ch.setFiles(BOOK);
      await page.locator('[data-testid="reader-frame"]').waitFor();
      await wait(page, 3500);
    },
  };
  await page.goto(URL);
  await page.getByText("My Library").waitFor({ timeout: 120000 });
  await wait(page, 800);
  await steps(ui);
  await wait(page, 800);
  await page.screenshot({ path: `${OUT}/${name}-end.png` }); // last frame, as a still
  const video = page.video();
  await ctx.close();
  fs.renameSync(await video.path(), `${OUT}/${name}.webm`);
  console.log(name, fs.statSync(`${OUT}/${name}.webm`).size);
}

await flow("1-add-and-read", async (u) => {
  await u.add();
  for (let i = 0; i < 5; i++) { await u.next(); await wait(u.page, 700); }
  await u.prev(); await wait(u.page, 700);
  await u.centre(); await wait(u.page, 1200);
  await u.page.getByRole("button", { name: "Back to library" }).click(); await wait(u.page, 1800);
  await u.page.getByText("Currently Reading").waitFor();
  await u.page.mouse.click(80, 350); await wait(u.page, 3000); // cover tap reopens at the same page
});

await flow("2-speed-read", async (u) => {
  await u.add();
  for (let i = 0; i < 6; i++) { await u.next(); await wait(u.page, 300); }
  await u.centre(); await wait(u.page, 700);
  await u.page.getByRole("button", { name: "Speed read" }).click(); await wait(u.page, 1500);
  await u.page.getByTestId("rsvp-playpause").click(); await wait(u.page, 4000);
  await u.page.getByTestId("rsvp-wpm-inc").click(); await wait(u.page, 500);
  await u.page.getByTestId("rsvp-wpm-inc").click(); await wait(u.page, 2500);
  await u.page.getByText("450", { exact: true }).click(); await wait(u.page, 3500);
  await u.page.getByTestId("rsvp-playpause").click(); await wait(u.page, 1800);
  await u.page.getByRole("button", { name: "Previous sentence" }).click(); await wait(u.page, 1500);
  await u.page.getByTestId("rsvp-playpause").click(); await wait(u.page, 2500);
  await u.page.getByTestId("rsvp-playpause").click(); await wait(u.page, 800);
  await u.page.getByTestId("rsvp-close").click(); await wait(u.page, 2600); // lands on the word, marked
});

await flow("3-appearance", async (u) => {
  await u.add();
  await u.next(); await wait(u.page, 500);
  await u.centre(); await wait(u.page, 700);
  await u.page.getByRole("button", { name: "Appearance" }).click(); await wait(u.page, 1000);
  for (const th of ["Sepia theme", "Dark theme", "Night theme", "App theme"]) { await u.page.getByRole("button", { name: th }).click(); await wait(u.page, 900); }
  await u.page.getByTestId("font-size-inc").click(); await wait(u.page, 700);
  await u.page.getByTestId("font-size-inc").click(); await wait(u.page, 900);
  await u.page.getByText("Palatino", { exact: true }).click(); await wait(u.page, 900);
  await u.page.mouse.click(196, 120); await wait(u.page, 1000);
});

await flow("4-contents-bookmark-return", async (u) => {
  await u.add();
  for (let i = 0; i < 4; i++) { await u.next(); await wait(u.page, 300); }
  await u.centre(); await wait(u.page, 700);
  await u.page.getByTestId("reader-bookmark").click(); await wait(u.page, 900);
  await u.page.getByRole("button", { name: "Contents" }).click(); await wait(u.page, 1200);
  await u.page.getByText(/CHAPTER VI\./).click(); await wait(u.page, 1800);
  await u.page.getByTestId("reader-return").click(); await wait(u.page, 1500);
  await u.centre(); await wait(u.page, 600);
  await u.page.getByRole("button", { name: "Contents" }).click(); await wait(u.page, 800);
  await u.page.getByRole("tab", { name: /Bookmarks/ }).click(); await wait(u.page, 1500);
});

await browser.close();
fs.rmSync(OUT + "/tmp", { recursive: true, force: true });
