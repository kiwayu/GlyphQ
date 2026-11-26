/* CPU profile of steady-state page turns: node perf/reader-profile.cjs <book> [turns]
   Prints the functions with the most self time. Not a timing run: profiling slows the page. */
const fs = require("fs"), path = require("path"), ts = require("typescript");
const { chromium, devices } = require("@playwright/test");
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, f);
const { buildReaderHtml, DEFAULT_SETTINGS } = require("../features/reader/readerHtml.ts");
const book = process.argv[2] || "large-lesmis", TURNS = Number(process.argv[3] || 30), O = "http://bench.local";
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ ...devices["Pixel 5"] }), page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const html = buildReaderHtml(`${O}/books/${book}.epub`, null, DEFAULT_SETTINGS);
  await page.route(`${O}/**`, (r) => { const u = new URL(r.request().url()); return u.pathname === "/reader.html" ? r.fulfill({ contentType: "text/html", body: html }) : r.fulfill({ body: fs.readFileSync(path.join(__dirname, u.pathname)) }); });
  await page.addInitScript(() => { window.__m = []; window.ReactNativeWebView = { postMessage: (d) => { const m = JSON.parse(d); m.t = performance.now(); window.__m.push(m); } }; });
  await page.goto(`${O}/reader.html`);
  await page.waitForFunction(() => window.__m.find((m) => m.type === "locationsGenerated"), null, { timeout: 300000 });
  for (let i = 0; i < 5; i++) { await page.evaluate(() => window.readerApi.nextPage()); await page.waitForTimeout(300); }
  await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 200 }); await cdp.send("Profiler.start");
  for (let i = 0; i < TURNS; i++) {
    const t0 = await page.evaluate(() => { const t = performance.now(); window.readerApi.nextPage(); return t; });
    await page.waitForFunction((a) => window.__m.find((m) => m.type === "locationChanged" && m.t > a), t0);
    await page.waitForTimeout(100);
  }
  const { profile } = await cdp.send("Profiler.stop");
  const self = new Map(); const dt = profile.timeDeltas; const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  profile.samples.forEach((id, i) => { const n = byId.get(id), f = n.callFrame; const k = `${f.functionName || "(anon)"} ${f.url ? "L" + f.lineNumber + ":" + f.columnNumber : ""}`; self.set(k, (self.get(k) || 0) + dt[i] / 1000); });
  const total = [...self.values()].reduce((a, c) => a + c, 0);
  const rows = [...self.entries()].sort((a, c) => c[1] - a[1]).slice(0, 18).map(([k, v]) => ({ fn: k.slice(0, 60), ms: Math.round(v), perTurnMs: Math.round((v / TURNS) * 10) / 10, pct: Math.round((v / total) * 100) }));
  console.table(rows);
  await b.close();
})();
