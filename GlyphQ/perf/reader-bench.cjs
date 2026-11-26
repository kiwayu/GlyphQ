/*
 * Reader benchmark: loads the real reader HTML (buildReaderHtml, the same
 * string the app hands its WebView) in Chromium with a phone viewport and CPU
 * throttling, then times book open and page turns.
 *
 *   node perf/reader-bench.cjs <label> [--runs 5] [--turns 30] [--throttle 4]
 *                              [--books small-alice,large-lesmis] [--theme light]
 *
 * Writes perf/out/reader-<label>.json and prints a summary.
 * Books come from perf/fetch-books.sh.
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const { chromium, devices } = require("@playwright/test");

require.extensions[".ts"] = (mod, file) =>
  mod._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    file
  );
/* --page <file> benchmarks another copy of the reader page (for example the
   pre-change one, checked out beside the current file). */
const PAGE_FILE = (() => {
  const i = process.argv.indexOf("--page");
  return i === -1 ? "../features/reader/readerHtml.ts" : require("path").resolve(process.argv[i + 1]);
})();
const { buildReaderHtml, DEFAULT_SETTINGS } = require(PAGE_FILE);

const args = process.argv.slice(2);
const label = args[0] || "run";
const opt = (name, dflt) => {
  const i = args.indexOf("--" + name);
  return i === -1 ? dflt : args[i + 1];
};
const RUNS = Number(opt("runs", 5));
const TURNS = Number(opt("turns", 30));
const THROTTLE = Number(opt("throttle", 4));
const THEME = opt("theme", "light");
const BOOKS = opt("books", "small-alice,large-lesmis").split(",");
/* Experiments: --css appends a rule to the reader page; --reopen opens each
   book a second time with the page numbers the first open produced. */
const EXTRA_CSS = opt("css", "");
const REOPEN = args.includes("--reopen");
/* --strip removes a piece of the reader page, to measure what that piece costs.
   --reuse-locations generates page numbers once per book and feeds them to
   later runs, so steady-state turns can be measured without the long wait. */
const STRIP = opt("strip", "");
const REUSE = args.includes("--reuse-locations");
const locationsFor = {};
const ORIGIN = "http://bench.local";
const FRAME = 1000 / 60;

const q = (xs, p) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

async function oneRun(browser, book, savedLocations = null) {
  const ctx = await browser.newContext({ ...devices["Pixel 5"] });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });

  const built = buildReaderHtml(
    `${ORIGIN}/books/${book}.epub`,
    null,
    { ...DEFAULT_SETTINGS, theme: THEME },
    savedLocations
  ).replace("</style>", EXTRA_CSS + "</style>");
  const html = STRIP ? built.split(STRIP).join("") : built;
  await page.route(`${ORIGIN}/**`, (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/reader.html") {
      return route.fulfill({ contentType: "text/html", body: html });
    }
    const file = path.join(__dirname, url.pathname);
    if (fs.existsSync(file)) {
      return route.fulfill({ contentType: "application/epub+zip", body: fs.readFileSync(file) });
    }
    return route.fulfill({ status: 404, body: "" });
  });
  await page.addInitScript(() => {
    window.__msgs = [];
    window.__frames = [];
    window.__errors = [];
    window.ReactNativeWebView = {
      postMessage: (d) => {
        const m = JSON.parse(d);
        m.t = performance.now();
        if (m.type === "error") window.__errors.push(m.message);
        window.__msgs.push(m);
      },
    };
    const tick = (t) => { window.__frames.push(t); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });

  await page.goto(`${ORIGIN}/reader.html`);
  const waitMsg = (type, after, timeout) =>
    page
      .waitForFunction(
        ([ty, af]) => window.__msgs.find((m) => m.type === ty && m.t > af) || window.__errors.length > 0,
        [type, after],
        { timeout }
      )
      .then((h) => h.jsonValue());

  const out = { book, turns: [], errors: [] };
  const ready = await waitMsg("ready", -1, 120000);
  if (!ready || ready === true) {
    out.errors = await page.evaluate(() => window.__errors);
    await ctx.close();
    return out;
  }
  out.openMs = ready.t; // performance.now() origin is navigation start

  const turn = async () => {
    const t0 = await page.evaluate(() => {
      const t = performance.now();
      window.readerApi.nextPage();
      return t;
    });
    const loc = await waitMsg("locationChanged", t0, 60000);
    await page.waitForTimeout(120); // let the frame after the turn land
    const gap = await page.evaluate(
      ([a, b]) => {
        const f = window.__frames.filter((t) => t >= a - 40 && t <= b + 100);
        let max = 0;
        for (let i = 1; i < f.length; i++) max = Math.max(max, f[i] - f[i - 1]);
        return max;
      },
      [t0, loc.t]
    );
    return { ms: loc.t - t0, maxFrameGap: gap, href: loc.href };
  };

  // Early turns: straight after open, while locations.generate() is still running.
  let lastHref = null;
  for (let i = 0; i < TURNS; i++) {
    const t = await turn();
    t.phase = "early";
    t.sectionChange = lastHref !== null && t.href !== lastHref;
    lastHref = t.href;
    out.turns.push(t);
  }
  const gen = await page
    .waitForFunction(() => window.__msgs.find((m) => m.type === "locationsGenerated"), null, { timeout: 300000 })
    .then((h) => h.jsonValue())
    .catch(() => null);
  out.locationsMs = gen ? gen.t : null;
  out.totalPages = gen ? gen.totalPages : null;
  out.locations = gen && typeof gen.locations === "string" ? gen.locations : null;
  for (let i = 0; i < TURNS; i++) {
    const t = await turn();
    t.phase = "steady";
    t.sectionChange = t.href !== lastHref;
    lastHref = t.href;
    out.turns.push(t);
  }
  out.errors = await page.evaluate(() => window.__errors);
  await ctx.close();
  return out;
}

(async () => {
  const browser = await chromium.launch();
  const results = [];
  for (let r = 0; r < RUNS; r++) {
    for (const book of BOOKS) {
      const res = await oneRun(browser, book, REUSE ? locationsFor[book] || null : null);
      res.run = r;
      if (REUSE && res.locations) locationsFor[book] = res.locations;
      if (REOPEN && res.locations) {
        const again = await oneRun(browser, book, res.locations);
        res.reopenOpenMs = again.openMs;
        res.reopenLocationsMs = again.locationsMs;
      }
      delete res.locations;
      results.push(res);
      process.stderr.write(`run ${r} ${book}: open ${r1(res.openMs)} ms, locations ${r1(res.locationsMs)} ms, errors ${res.errors.length}\n`);
    }
  }
  await browser.close();

  const summary = {};
  for (const book of BOOKS) {
    const rs = results.filter((x) => x.book === book);
    const opens = rs.map((x) => x.openMs).filter((x) => x != null);
    const locs = rs.map((x) => x.locationsMs).filter((x) => x != null);
    const pick = (phase, section) =>
      rs.flatMap((x) => x.turns.filter((t) => t.phase === phase && t.sectionChange === section));
    const stat = (ts) => ({
      n: ts.length,
      turnMsP50: r1(q(ts.map((t) => t.ms), 0.5)),
      turnMsP95: r1(q(ts.map((t) => t.ms), 0.95)),
      maxGapP50: r1(q(ts.map((t) => t.maxFrameGap), 0.5)),
      maxGapP95: r1(q(ts.map((t) => t.maxFrameGap), 0.95)),
      turnsWithDroppedFrame: ts.filter((t) => t.maxFrameGap > FRAME * 1.5).length,
    });
    summary[book] = {
      runs: rs.length,
      errors: rs.reduce((n, x) => n + x.errors.length, 0),
      openMs: { median: r1(q(opens, 0.5)), min: r1(Math.min(...opens)), max: r1(Math.max(...opens)) },
      locationsMs: { median: r1(q(locs, 0.5)), min: r1(Math.min(...locs)), max: r1(Math.max(...locs)) },
      totalPages: rs[0] && rs[0].totalPages,
      reopenLocationsMs: REOPEN ? r1(q(rs.map((x) => x.reopenLocationsMs).filter((x) => x != null), 0.5)) : undefined,
      reopenOpenMs: REOPEN ? r1(q(rs.map((x) => x.reopenOpenMs).filter((x) => x != null), 0.5)) : undefined,
      earlySamePage: stat(pick("early", false)),
      earlySectionChange: stat(pick("early", true)),
      steadySamePage: stat(pick("steady", false)),
      steadySectionChange: stat(pick("steady", true)),
    };
  }
  const meta = { label, runs: RUNS, turns: TURNS, cpuThrottle: THROTTLE, theme: THEME, css: EXTRA_CSS || undefined, strip: STRIP || undefined, reuseLocations: REUSE || undefined, device: "Pixel 5 emulation, headless Chromium" };
  fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "out", `reader-${label}.json`), JSON.stringify({ meta, summary, results }, null, 1));
  console.log(JSON.stringify({ meta, summary }, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
