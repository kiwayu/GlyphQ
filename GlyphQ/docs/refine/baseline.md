# Baseline (before any fix)

## Target

Headless Chromium 1254 driven by Playwright, Pixel 5 viewport (393 × 851, DPR 2.75), CPU throttled 4× through the DevTools protocol, on a Ryzen 5 5500 desktop. Chromium is the engine behind Android System WebView, so the reader page runs the same code path it runs on a phone. It is not a phone: there is no GPU compositor, no React Native runtime and no native UI thread.

**Not measured, and why**

| Metric asked for | Why it is missing |
|---|---|
| Cold start | Needs the native app on a device. No device, no Android SDK, and Windows reports `HypervisorPresent: False`, so an emulator would need an admin feature install and a reboot. |
| UI-thread frame times | Same. Only the web main thread is observable here. |
| Library scroll FPS | Needs a seeded library in the running app. The web build could not import anything at baseline (see audit). Measured after the fixes instead. |
| RSVP drift in the real overlay | The overlay could not mount on web at baseline. The engine was driven with a frame clock instead (below). |

## Reader: book open and page turns

`node perf/reader-bench.cjs baseline-light --runs 5 --turns 30 --books small-alice,large-lesmis,images-huckfinn`
Reader code at commit `22f95e9`. 5 runs per book, 30 page turns straight after open ("early") and 30 after page numbers are ready ("steady"). A dropped frame is a gap over 25 ms between animation frames around the turn. Full data: `data/reader-baseline-light.json`, `data/reader-baseline-dark.json`.

| Book | Size | Open to first page, median (range) | Page numbers ready, median |
|---|---|---|---|
| Alice | 0.19 MB | 484 ms (382–707) | 2.4 s |
| Les Misérables | 10.1 MB | 988 ms (844–1172) | **50.4 s** |
| Huckleberry Finn, illustrated | 16.0 MB | 1148 ms (1108–1638) | 7.9 s |

| Book | Turn inside a chapter, steady: turns with a dropped frame | Worst frame gap p95 | Turn across a chapter boundary: turns with a dropped frame | Worst frame gap p95 |
|---|---|---|---|---|
| Alice | 0 of 135 | 16.8 ms | 15 of 15 | 133 ms |
| Les Misérables | **52 of 130** | 33.4 ms | 11 of 20 | 67 ms |
| Huckleberry Finn | 0 of 140 | 16.8 ms | 10 of 10 | 83 ms |

Dark theme (the CSS-filter path) on the same harness: Alice 0 of 135 dropped, Les Misérables 48 of 130, worst gap p95 50 ms. That is within run-to-run spread of light, so **the filter shows no measurable cost on this target**. Headless Chromium rasterises in software, so this says nothing about a phone GPU.

What limits each number (checked later with a CPU profile, see the report): open time is unzip plus parse of the first chapter; page-number time is one parse of every chapter in the book; the chapter-boundary gap is the parse and layout of the next chapter.

Checks on the measurement: every run reported 0 reader errors; each timed turn waited for a `locationChanged` message carrying a new position, so a turn that did nothing would have timed out rather than scored fast.

## RSVP engine timing

`node perf/rsvp-timing.cjs baseline`. The real engine driven the way the overlay drives it (one index lookup per animation frame), 1332 words of prose. `ideal60` is a perfect 60 Hz clock. `busy` is a synthetic clock with 15% late frames; it shows how the loop degrades and is not a device.

| wpm set | Clock | Word onset lateness mean / p95 | Duration error mean / p95 | Real average speed |
|---|---|---|---|---|
| 300 | ideal60 | 8.9 / 16.7 ms | 1.1 / 10.0 ms | **265 wpm** |
| 500 | ideal60 | 8.2 / 16.0 ms | 5.1 / 13.3 ms | **442 wpm** |
| 800 | ideal60 | 8.3 / 15.8 ms | 7.7 / 8.3 ms | **706 wpm** |
| 300 | busy | 12.0 / 33.3 ms | 6.3 / 33.3 ms | 265 wpm |
| 500 | busy | 11.2 / 32.0 ms | 9.1 / 30.0 ms | 442 wpm |
| 800 | busy | 11.9 / 31.7 ms | 11.6 / 25.0 ms | 706 wpm |

Two things follow. A loop that picks the word once per frame is late by up to one frame by construction, so p95 lateness sits at the 16.7 ms target on a perfect clock and cannot go below it without changing how frames are used. And the speed shown is about 12% higher than the speed delivered, because pauses are added on top of `60000 / wpm`.
