/*
 * A long library on a phone. The Done tab holds a few hundred books, and only
 * the rows near the screen exist at any time, so a book far down must still
 * be reachable: by scrolling, and by the alphabet index on the side.
 *
 * The library is seeded the way perf/library-scroll.cjs seeds it: Settings,
 * "Import library", a JSON export.
 */
import { test, expect, devices, type Page } from "@playwright/test";
import fs from "fs";

const { defaultBrowserType: _browser, ...phone } = devices["Pixel 5"];
test.use(phone);

const BOOKS = 300;
// 1x1 grey PNG, so every card decodes an image like a real cover.
const COVER = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8du3afwAH0QMfAoxJ6AAAAABJRU5ErkJggg==";
/** Book i is titled by letter i % 26, so each letter holds about 12 books: "A0026 Sample Title". */
const titleOf = (i: number) => `${String.fromCharCode(65 + (i % 26))}${String(i).padStart(4, "0")} Sample Title`;

function writeLibrary(file: string) {
  const ids = Array.from({ length: BOOKS }, (_, k) => k + 1);
  fs.writeFileSync(file, JSON.stringify({
    version: 1, exported_at: "2026-01-01T00:00:00.000Z",
    books: ids.map((i) => ({ id: i, title: titleOf(i), authors: `Author ${i % 37}`, page_count: 200 + i, cover_url: COVER })),
    library_entries: ids.map((i) => ({
      book_id: i, status: "finished", date_added: "2026-01-01T00:00:00.000Z", finished_at: "2026-01-02T00:00:00.000Z",
    })),
    reading_sessions: [], reading_progress: [], tags: [], book_tags: [], folders: [], folder_books: [],
    goals: [], book_notes: [], highlights: [], bookmarks: [],
  }));
}

async function importLibrary(page: Page, file: string) {
  page.on("dialog", (d) => d.accept().catch(() => {}));
  await page.goto("/");
  await expect(page.getByText("My Library")).toBeVisible();
  await page.getByRole("tab", { name: /Settings/ }).click();
  /* The dev server can hot-reload the page once just after it compiles, which
     swallows a click made in that moment. Press again if no picker opened. */
  await expect(async () => {
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 4000 }),
      page.getByText("Import library", { exact: true }).click(),
    ]);
    await chooser.setFiles(file);
  }).toPass({ timeout: 25_000 });
  await page.getByRole("tab", { name: /Library/ }).click();
  await expect(page.getByText(`${BOOKS} books`)).toBeVisible({ timeout: 60_000 });
}

test("a book far down a long Done tab is reachable by scrolling and by the alphabet index", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const file = testInfo.outputPath("library.json");
  writeLibrary(file);
  await importLibrary(page, file);

  await page.getByText("Done", { exact: true }).click();
  await expect(page.getByText(titleOf(26), { exact: true })).toBeInViewport();

  // The last book in A-Z order is the highest-numbered Z: Z0285.
  const last = page.getByText(titleOf(285), { exact: true });
  const { width, height } = page.viewportSize()!;
  await page.mouse.move(width / 2, height / 2);
  await expect(async () => {
    await page.mouse.wheel(0, 2000);
    await expect(last).toBeInViewport({ timeout: 1000 });
  }).toPass({ timeout: 60_000 });

  // A book with no file opens its details when tapped.
  await last.click();
  await expect(page.getByText("Remove from Library")).toBeVisible();

  // Back at the top of the tab, a late letter in the index brings its first book on screen.
  await page.reload();
  await page.getByText("Done", { exact: true }).click();
  await expect(page.getByText(titleOf(26), { exact: true })).toBeInViewport();
  const firstY = page.getByText(titleOf(24), { exact: true }); // Y0024
  await expect(firstY).not.toBeInViewport();
  await page.getByText("Y", { exact: true }).last().click();
  await expect(firstY).toBeInViewport();
});
