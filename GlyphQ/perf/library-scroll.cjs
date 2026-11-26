/*
 * Library scroll: seeds a library of N books through Settings > Import library,
 * opens the Done tab (a grid of every finished book), scrolls it top to bottom
 * with the wheel under 4x CPU throttle, and reports frame gaps.
 *
 * The wheel keeps going until the list is at its end, so a longer list is
 * scrolled in full. Every 10 steps it checks whether any book is under three
 * points of the screen (a list that renders lazily can show blank space), and
 * at the end it checks that the last book in A-Z order is on screen.
 *
 *   node perf/library-scroll.cjs [label] [books=400]     (dev server on :8090)
 */
const fs = require("fs");
const path = require("path");
const { chromium, devices } = require("@playwright/test");
const label = process.argv[2] || "run";
const N = Number(process.argv[3] || 400);
const FRAME = 1000 / 60;
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const r1 = (x) => Math.round(x * 10) / 10;
// 1x1 grey PNG, so every card decodes an image like a real cover.
const COVER = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8du3afwAH0QMfAoxJ6AAAAABJRU5ErkJggg==";

const seed = {
  version: 1, exported_at: "2026-01-01T00:00:00.000Z",
  books: [], library_entries: [], reading_sessions: [], reading_progress: [],
  tags: [], book_tags: [], folders: [], folder_books: [], goals: [], book_notes: [], highlights: [], bookmarks: [],
};
for (let i = 1; i <= N; i++) {
  const letter = String.fromCharCode(65 + (i % 26));
  seed.books.push({ id: i, title: `${letter}${String(i).padStart(4, "0")} Sample Title`, authors: `Author ${i % 37}`, page_count: 200 + (i % 300), cover_url: COVER });
  seed.library_entries.push({ book_id: i, status: "finished", date_added: "2026-01-01T00:00:00.000Z", finished_at: "2026-01-02T00:00:00.000Z" });
}

(async () => {
  const out = path.join(__dirname, "out");
  fs.mkdirSync(out, { recursive: true });
  const seedFile = path.join(out, "seed-library.json");
  fs.writeFileSync(seedFile, JSON.stringify(seed));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["Pixel 5"] });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept().catch(() => {}));
  await page.goto((process.env.APP_URL || "http://localhost:8090/"));
  await page.getByText("My Library").waitFor({ timeout: 240000 });
  await page.getByRole("tab", { name: /Settings/ }).click();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByText("Import library", { exact: true }).click()]);
  await chooser.setFiles(seedFile);
  await page.getByRole("tab", { name: /Library/ }).click();
  await page.getByText(`${N} books`).waitFor({ timeout: 180000 });
  const t0 = Date.now();
  await page.getByText("Done", { exact: true }).click();
  await page.getByText("A0026 Sample Title").first().waitFor({ timeout: 60000 });
  const tabOpenMs = Date.now() - t0;
  const nodes = await page.evaluate(() => document.querySelectorAll("*").length);

  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const vp = page.viewportSize();
  // The tallest scrolling element is the library list. Frame times and blank
  // samples are recorded inside the page, so the wheel never pauses for them.
  await page.evaluate(({ w, h }) => {
    const els = [...document.querySelectorAll("*")].filter((e) => e.scrollHeight > e.clientHeight && /auto|scroll/.test(getComputedStyle(e).overflowY));
    window.__list = els.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0];
    window.__f = [];
    window.__blank = { samples: 0, blank: 0 };
    const tick = (t) => { if (window.__stop) return; window.__f.push(t); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const pts = [[w * 0.25, h * 0.3], [w * 0.25, h * 0.5], [w * 0.25, h * 0.7]];
    const sample = setInterval(() => {
      if (window.__stop) return clearInterval(sample);
      const book = pts.some(([x, y]) => /Sample Title/.test(document.elementFromPoint(x, y)?.closest('[tabindex="0"]')?.textContent ?? ""));
      window.__blank.samples++; if (!book) window.__blank.blank++;
    }, 200);
  }, { w: vp.width, h: vp.height });
  const stepsLeft = () => page.evaluate(() => { const s = window.__list; return Math.ceil((s.scrollHeight - s.clientHeight - s.scrollTop) / 240); });
  await page.mouse.move(vp.width / 2, vp.height / 2);
  let steps = 0, tEnd = Infinity;
  for (let left = await stepsLeft(); steps < 3000;) {
    if (left <= 0) {
      tEnd = await page.evaluate(() => performance.now());
      await page.waitForTimeout(300);
      left = await stepsLeft(); // a lazily measured list can grow once its end renders
      if (left <= 0) break;
    }
    for (let i = 0; i < left; i++, steps++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(16); }
    left = await stepsLeft();
  }
  await page.evaluate(() => { window.__stop = true; });
  const lastTitle = seed.books.map((b) => b.title).sort((a, b) => a.localeCompare(b)).pop();
  const lastBox = await page.getByText(lastTitle, { exact: true }).boundingBox().catch(() => null);
  const { frames, blank, scrolled, scrollMax, domNodesEnd, listTop, listBottom } = await page.evaluate((end) => {
    const r = window.__list.getBoundingClientRect();
    return {
      frames: window.__f.filter((t) => t <= end), blank: window.__blank, scrolled: window.__list.scrollTop,
      scrollMax: window.__list.scrollHeight - window.__list.clientHeight,
      domNodesEnd: document.querySelectorAll("*").length, listTop: r.top, listBottom: r.bottom,
    };
  }, tEnd);
  await browser.close();
  const gaps = frames.slice(1).map((t, i) => t - frames[i]);
  const span = frames[frames.length - 1] - frames[0];
  const row = {
    label, books: N, domNodes: nodes, domNodesEnd, tabOpenMs,
    scrolledPx: Math.round(scrolled), scrollMaxPx: Math.round(scrollMax), wheelSteps: steps,
    lastBook: lastTitle, lastBookOnScreen: !!lastBox && lastBox.y >= listTop && lastBox.y + lastBox.height <= listBottom,
    blankSamples: `${blank.blank}/${blank.samples}`,
    fps: r1((gaps.length / span) * 1000),
    frameGapP50: r1(q(gaps, 0.5)), frameGapP95: r1(q(gaps, 0.95)), frameGapMax: r1(Math.max(...gaps)),
    droppedPct: r1((100 * gaps.filter((g) => g > FRAME * 1.5).length) / gaps.length),
  };
  fs.writeFileSync(path.join(out, `library-scroll-${label}.json`), JSON.stringify(row, null, 1));
  console.table([row]);
})().catch((e) => { console.error(String(e).slice(0, 600)); process.exit(1); });
