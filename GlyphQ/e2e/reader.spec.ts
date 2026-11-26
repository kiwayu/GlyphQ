/*
 * The core path on the web build, phone-sized: add a book, read it, speed
 * read, change how it looks, come back to it.
 *
 * The fixture (e2e/fixtures/sample.epub, built by make-sample-epub.py) is three
 * chapters of numbered words such as "c1p2w37": chapter 1, paragraph 2, word
 * 37. That lets a test say exactly which word is on screen.
 */
import { test, expect, devices, type Page, type Frame } from "@playwright/test";
import fs from "fs";
import path from "path";

/* A phone: viewport, touch and user agent. The browser type stays the
   project's (it cannot change per file). */
const { defaultBrowserType: _browser, ...phone } = devices["Pixel 5"];
const viewport = phone.viewport;
test.use(phone);

const SAMPLE = path.join(__dirname, "fixtures", "sample.epub");

async function addBook(page: Page, file: string | { name: string; mimeType: string; buffer: Buffer }) {
  await page.goto("/");
  await expect(page.getByText("My Library")).toBeVisible();
  /* The dev server can hot-reload the page once just after it compiles, which
     swallows a click made in that moment. Press again if no picker opened. */
  await expect(async () => {
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 4000 }),
      page.getByText("Add", { exact: true }).click(),
    ]);
    await chooser.setFiles(file);
  }).toPass({ timeout: 25_000 });
}

/** The reader page (our HTML) and the chapter document epub.js renders inside it. */
async function frames(page: Page): Promise<{ reader: Frame; book: Frame }> {
  const outer = await page.locator('[data-testid="reader-frame"]').elementHandle();
  const reader = (await outer!.contentFrame())!;
  await reader.waitForSelector("#viewer iframe");
  const inner = await reader.$("#viewer iframe");
  return { reader, book: (await inner!.contentFrame())! };
}

async function openSample(page: Page) {
  await addBook(page, SAMPLE);
  const f = await frames(page);
  await expect(f.book.getByText("c1p1w1 ", { exact: false }).first()).toBeVisible();
  return f;
}

/** First numbered word whose box is inside the page currently on screen. */
async function firstWordOnScreen(page: Page): Promise<string> {
  const { reader } = await frames(page);
  return reader.evaluate(() => {
    const frame = document.querySelector("#viewer iframe") as HTMLIFrameElement;
    const doc = frame.contentDocument!;
    const box = frame.getBoundingClientRect();
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const re = /c\d+p\d+w\d+/g;
      for (let m = re.exec(node.nodeValue ?? ""); m; m = re.exec(node.nodeValue ?? "")) {
        const range = doc.createRange();
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].length);
        const r = range.getBoundingClientRect();
        const x = r.left + box.left;
        if (x >= 0 && x < window.innerWidth && r.width > 0) return m[0];
      }
    }
    return "";
  });
}

const tapCentre = (page: Page) => page.mouse.click(viewport.width / 2, viewport.height / 2);
const tapRight = (page: Page) => page.mouse.click(viewport.width - 30, viewport.height / 2);
const focusWord = async (page: Page) =>
  ((await page.getByTestId("rsvp-focus").innerText()) ?? "").replace(/[.,]/g, "");

test("add a book and it opens for reading, with the tab bar out of the way", async ({ page }) => {
  await openSample(page);
  await expect(page.getByRole("tab", { name: /Library/ })).toBeHidden();
  expect(await firstWordOnScreen(page)).toBe("c1p1w1");
});

test("a page turn moves on, and the book reopens where it was left", async ({ page }) => {
  await openSample(page);
  await tapRight(page);
  await expect.poll(() => firstWordOnScreen(page)).not.toBe("c1p1w1");
  const left = await firstWordOnScreen(page);

  await page.waitForTimeout(1500); // position is written 0.8 s after the turn
  await page.reload(); // still on the reader route: the last book reopens by itself
  await expect.poll(() => firstWordOnScreen(page), { timeout: 20_000 }).toBe(left);
});

test("speed reading starts on the page being read, changes speed, and exits on the word it stopped at", async ({ page }) => {
  await openSample(page);
  await tapRight(page);
  await expect.poll(() => firstWordOnScreen(page)).not.toBe("c1p1w1");
  const pageStart = await firstWordOnScreen(page);

  await tapCentre(page);
  await page.getByRole("button", { name: "Speed read" }).click();
  // Starts at the top of the page on screen, not the top of the chapter.
  await expect.poll(() => focusWord(page)).toBe(pageStart);

  await page.getByTestId("rsvp-wpm-inc").click();
  await expect(page.getByText("325 WPM", { exact: true })).toBeVisible();

  // Play far enough to leave that page, then stop.
  await page.getByText("600", { exact: true }).click();
  await page.getByTestId("rsvp-playpause").click();
  const startN = Number(pageStart.split("w")[1]);
  await expect
    .poll(async () => Number((await focusWord(page)).split("w")[1] ?? 0), { timeout: 30_000 })
    .toBeGreaterThan(startN + 90);
  await page.getByTestId("rsvp-playpause").click();
  const stopped = await focusWord(page);
  await page.getByTestId("rsvp-close").click();

  // The page is now the one holding that word, and the word is marked.
  const { book } = await frames(page);
  await expect(book.locator("#bb-flash")).toHaveAttribute("data-word", new RegExp(`^${stopped}[.,]?$`));
  const onScreen = Number((await firstWordOnScreen(page)).split("w")[1]);
  const stoppedN = Number(stopped.split("w")[1]);
  expect(onScreen).toBeLessThanOrEqual(stoppedN);
  expect(stoppedN - onScreen).toBeLessThan(90); // same page, not just same chapter

  // Going back in resumes on that word, with no question asked first.
  await tapCentre(page);
  await page.getByRole("button", { name: "Speed read" }).click();
  await expect.poll(() => focusWord(page)).toBe(stopped);
});

test("theme and text size change from the page and are still there next time", async ({ page }) => {
  await openSample(page);
  await tapCentre(page);
  await page.getByRole("button", { name: "Appearance" }).click();
  await page.getByRole("button", { name: "Dark theme" }).click();
  await page.getByTestId("font-size-inc").click();
  await expect(page.getByTestId("font-size-value")).toHaveText("18");

  const look = async () => {
    const { book } = await frames(page);
    return book.evaluate(() => {
      const cs = getComputedStyle(document.body);
      return { bg: cs.backgroundColor, size: cs.fontSize };
    });
  };
  await expect.poll(look).toEqual({ bg: "rgb(28, 28, 28)", size: "18px" });

  await page.waitForTimeout(500);
  await page.reload(); // still on the reader route: the last book reopens by itself
  await expect.poll(look, { timeout: 20_000 }).toEqual({ bg: "rgb(28, 28, 28)", size: "18px" });
});

test("contents jumps to a chapter and one tap comes back; a bookmark is listed and reachable", async ({ page }) => {
  await openSample(page);
  await tapCentre(page);
  await page.getByTestId("reader-bookmark").click();
  await expect(page.getByRole("button", { name: "Remove bookmark" })).toBeVisible();

  await page.getByRole("button", { name: "Contents" }).click();
  await page.getByText("Chapter 2", { exact: true }).click();
  await expect.poll(() => firstWordOnScreen(page)).toBe("c2p1w1");

  await page.getByTestId("reader-return").click();
  await expect.poll(() => firstWordOnScreen(page)).toBe("c1p1w1");

  await tapCentre(page);
  await page.getByRole("button", { name: "Contents" }).click();
  await page.getByRole("tab", { name: /Bookmarks · 1/ }).click();
  await expect(page.getByText("Remove", { exact: true })).toBeVisible();
});

test("a damaged file says so and offers the way back", async ({ page }) => {
  const cut = fs.readFileSync(SAMPLE).subarray(0, 3000);
  await addBook(page, { name: "damaged.epub", mimeType: "application/epub+zip", buffer: cut });
  await expect(page.getByText("Can't open this book")).toBeVisible({ timeout: 20_000 });
  await page.getByText("Back to library").click();
  await expect(page.getByText("My Library")).toBeVisible();
});

test("a file that is not a book is refused at the door", async ({ page }) => {
  await addBook(page, { name: "notes.epub", mimeType: "application/epub+zip", buffer: Buffer.from("not a zip") });
  await expect(page.getByText(/doesn't look like a valid EPUB/)).toBeVisible();
});
