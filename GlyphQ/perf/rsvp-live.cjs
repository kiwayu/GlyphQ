/*
 * RSVP in the running web app, CPU throttled 4x: records the real frame clock
 * while the overlay plays, how long React takes to put each new word on
 * screen, and the speed actually delivered.
 *
 *   node perf/rsvp-live.cjs [label]      (needs the dev server on :8090)
 *
 * Writes perf/out/rsvp-live-<label>.json and perf/out/frames-<label>.json.
 * Feed the frames to the engine harness for drift under a real clock:
 *   node perf/rsvp-timing.cjs live --frames perf/out/frames-<label>.json
 */
const fs = require("fs");
const path = require("path");
const { chromium, devices } = require("@playwright/test");
const label = process.argv[2] || "run";
const BOOK = path.join(__dirname, "books", "small-alice.epub");
const SECONDS = 20;
const FRAME = 1000 / 60;
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const r1 = (x) => Math.round(x * 10) / 10;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["Pixel 5"] });
  const page = await ctx.newPage();
  await page.goto((process.env.APP_URL || "http://localhost:8090/"));
  await page.getByText("My Library").waitFor({ timeout: 240000 });
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByText("Add", { exact: true }).click()]);
  await chooser.setFiles(BOOK);
  await page.locator('[data-testid="reader-frame"]').waitFor();
  await page.waitForTimeout(6000); // let page numbers finish so nothing else is running
  const vp = page.viewportSize();
  for (let i = 0; i < 8; i++) { await page.mouse.click(vp.width - 30, vp.height / 2); await page.waitForTimeout(200); }
  await page.mouse.click(vp.width / 2, vp.height / 2);
  await page.getByRole("button", { name: "Speed read" }).click();
  await page.getByTestId("rsvp-focus").waitFor();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  const rows = [];
  let frames800 = null;
  // 300 is the default; reach 500 and 800 with the same controls a reader has.
  const plan = [[300, []], [500, ["450", "+", "+"]], [800, ["600", "+", "+", "+", "+", "+", "+", "+", "+"]]];
  for (const [wpm, presses] of plan) {
    for (const k of presses) {
      if (k === "+") await page.getByTestId("rsvp-wpm-inc").click();
      else await page.getByText(k, { exact: true }).click();
    }
    await page.getByText(`${wpm} WPM`, { exact: true }).waitFor();
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="rsvp-focus"]');
      const rec = (window.__rec = { frames: [], words: [], commit: [], last: 0, on: true });
      const tick = (t) => { if (!rec.on) return; rec.frames.push(t); rec.last = t; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      rec.mo = new MutationObserver(() => {
        const now = performance.now();
        rec.words.push([now, el.textContent]);
        rec.commit.push(now - rec.last); // time from the frame's start to the word being in the DOM
      });
      rec.mo.observe(el, { childList: true, characterData: true, subtree: true });
    });
    await page.getByTestId("rsvp-playpause").click();
    await page.waitForTimeout(SECONDS * 1000);
    await page.getByTestId("rsvp-playpause").click();
    const rec = await page.evaluate(() => { const r = window.__rec; r.on = false; r.mo.disconnect(); return { frames: r.frames, words: r.words, commit: r.commit }; });
    const gaps = rec.frames.slice(1).map((t, i) => t - rec.frames[i]);
    const distinct = rec.words.filter((w, i) => i === 0 || w[1] !== rec.words[i - 1][1]);
    const span = distinct.length > 1 ? distinct[distinct.length - 1][0] - distinct[0][0] : 0;
    rows.push({
      wpm,
      frames: rec.frames.length,
      frameGapP50: r1(q(gaps, 0.5)),
      frameGapP95: r1(q(gaps, 0.95)),
      frameGapMax: r1(Math.max(...gaps)),
      droppedFrames: gaps.filter((g) => g > FRAME * 1.5).length,
      droppedPct: r1((100 * gaps.filter((g) => g > FRAME * 1.5).length) / gaps.length),
      wordsShown: distinct.length,
      deliveredWpm: span ? Math.round(((distinct.length - 1) / span) * 60000) : null,
      commitMsP50: r1(q(rec.commit, 0.5)),
      commitMsP95: r1(q(rec.commit, 0.95)),
    });
    if (wpm === 800) frames800 = rec.frames.map((t) => t - rec.frames[0]);
  }
  await browser.close();
  fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "out", `rsvp-live-${label}.json`), JSON.stringify({ label, cpuThrottle: 4, seconds: SECONDS, rows }, null, 1));
  fs.writeFileSync(path.join(__dirname, "out", `frames-${label}.json`), JSON.stringify(frames800));
  console.table(rows);
})().catch((e) => { console.error(e); process.exit(1); });
