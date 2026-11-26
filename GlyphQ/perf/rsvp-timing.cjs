/*
 * RSVP timing harness. Drives the real engine (features/reader/rsvp/engine.ts)
 * with a frame clock the way the overlay's playback loop does, and compares
 * when each word was shown with when the schedule says it should be.
 *
 *   node perf/rsvp-timing.cjs [label] [--frames perf/out/frames.json]
 *
 * Frame clocks:
 *   ideal60  one frame every 16.667 ms
 *   busy     SYNTHETIC: 85% on-time frames, 10% one dropped, 5% two dropped
 *            (seeded). It shows how the loop degrades, it is not a device.
 *   --frames a recorded list of frame timestamps (ms) from a real run
 *
 * Per word:
 *   onset lateness = time the word first appeared - time the schedule starts it
 *   duration error = time it stayed on screen - duration the engine intended
 * Effective wpm = words shown / minutes elapsed. It should equal the wpm set:
 * the engine scales every duration so the average word lasts 60000/wpm.
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

require.extensions[".ts"] = (mod, file) =>
  mod._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    file
  );
const engine = require("../features/reader/rsvp/engine.ts");

const PASSAGE = [
  "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, “and what is the use of a book,” thought Alice “without pictures or conversations?”",
  "So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.",
  "There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, “Oh dear! Oh dear! I shall be late!” But when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet.",
  "In another moment down went Alice after it, never once considering how in the world she was to get out again. The rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly down, so suddenly that Alice had not a moment to think about stopping herself.",
];
const paragraphs = [];
for (let i = 0; i < 6; i++) paragraphs.push(...PASSAGE); // ~1300 words
const tokens = engine.tokenizeParagraphs(paragraphs);

const FRAME = 1000 / 60;
function ideal60(totalMs) {
  const out = [];
  for (let t = FRAME; t <= totalMs + 200; t += FRAME) out.push(t);
  return out;
}
function busy(totalMs) {
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const out = [];
  for (let t = FRAME; t <= totalMs + 200; ) {
    out.push(t);
    const r = rnd();
    t += r < 0.85 ? FRAME : r < 0.95 ? 2 * FRAME : 3 * FRAME;
  }
  return out;
}

const q = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const r1 = (x) => Math.round(x * 10) / 10;

/** Same decision the overlay makes each frame: index = wordIndexAt(schedule, elapsed). */
function simulate(wpm, frames) {
  const sched = engine.schedule(tokens, wpm, 0);
  const total = engine.totalDuration(sched);
  const firstSeen = new Array(tokens.length).fill(null);
  firstSeen[0] = 0; // word 0 is on screen when play is pressed
  let end = null;
  for (const t of frames) {
    const now = Math.floor(t); // the overlay reads Date.now(), whole ms
    const idx = engine.wordIndexAt(sched, now);
    if (firstSeen[idx] === null) firstSeen[idx] = t;
    if (engine.isFinished(sched, now)) { end = t; break; }
  }
  const late = [];
  const durErr = [];
  let skipped = 0;
  for (let i = 1; i < tokens.length; i++) {
    if (firstSeen[i] === null) { skipped++; continue; }
    late.push(firstSeen[i] - sched.cumEnd[i - 1]);
  }
  for (let i = 0; i < tokens.length - 1; i++) {
    if (firstSeen[i] === null || firstSeen[i + 1] === null) continue;
    const intended = sched.cumEnd[i] - (i === 0 ? 0 : sched.cumEnd[i - 1]);
    durErr.push(Math.abs(firstSeen[i + 1] - firstSeen[i] - intended));
  }
  return {
    wpm,
    words: tokens.length,
    skippedWords: skipped,
    onsetLateMeanMs: r1(mean(late)),
    onsetLateP95Ms: r1(q(late, 0.95)),
    onsetLateMaxMs: r1(Math.max(...late)),
    durErrMeanAbsMs: r1(mean(durErr)),
    durErrP95AbsMs: r1(q(durErr, 0.95)),
    effectiveWpm: Math.round(tokens.length / ((end ?? total) / 60000)),
  };
}

const args = process.argv.slice(2);
const label = args[0] && !args[0].startsWith("--") ? args[0] : "run";
const fi = args.indexOf("--frames");
const recorded = fi !== -1 ? JSON.parse(fs.readFileSync(args[fi + 1], "utf8")) : null;

const rows = [];
for (const wpm of [300, 500, 800]) {
  const total = engine.totalDuration(engine.schedule(tokens, wpm, 0));
  const clocks = recorded ? { recorded } : { ideal60: ideal60(total), busy: busy(total) };
  for (const [name, frames] of Object.entries(clocks)) {
    rows.push({ frames: name, ...simulate(wpm, frames) });
  }
}
fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "out", `rsvp-timing-${label}.json`), JSON.stringify({ label, rows }, null, 1));
console.table(rows);
