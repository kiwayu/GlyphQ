# GlyphQ refinement: what was measured, what changed, what is still open

Goal: make the core path (add a book, read, speed read, change speed, change theme) faster and simpler, and show it with numbers.

**Read this first.** Nothing here ran on a phone. There was no device, no Android SDK, and Windows reports no hypervisor, so no emulator either. Every measurement is from Chromium (the engine inside Android's WebView) with a Pixel 5 viewport and the CPU throttled 4×. That is a fair stand-in for the book page and for app logic. It says nothing about native start-up, the native UI thread, or how the Reanimated animations feel on glass. The first item in `choices.md` is to run this branch on a phone.

Supporting files, all in this folder: `baseline.md` (numbers before), `audit.md` (flows before), `teardown.md` (what other apps and the research say, with sources), `gaps.md` (the ranked fix list), `choices.md` (decisions left to you), `decisions.tsv` (the run's decision log), `data/` (benchmark output), `shots/` and `recordings/` (pictures and video).

## Targets

| Target | Result | Evidence |
|---|---|---|
| Book open under 1 s for the small book | **Met.** 482 ms median (418–627), unchanged from 484 ms | `data/reader-after-light.json` |
| Leaving speed reading lands on the exact word | **Met on web.** The page turns to the one holding the word and marks it | e2e test "speed reading starts on the page being read…" |
| RSVP p95 drift under one frame (16.7 ms) at 500 wpm | **Met on a steady clock, by a hair: 16.1 ms.** See RSVP section for the real-clock number | `perf/rsvp-timing.cjs` |
| No dropped frames on page turn | **Not met.** Inside a chapter: none on two books, one frame on about half the turns of the 10 MB book. Across a chapter boundary: always, worst gap 67–100 ms p95 | below |
| No dropped frames in RSVP | See RSVP section | `perf/rsvp-live.cjs` |

Why the page-turn target is not met, measured: on the long book the time goes to epub.js working out the new page position (`getBoundingClientRect` 9.9 ms and layout 15 ms per turn at 4× throttle, from `perf/reader-profile.cjs`). It runs after the page has already changed, so the reader sees the new page on time and a late page number. At a chapter boundary the cost is laying out the next chapter. Two prototypes aimed at these did not help and were not kept (see Prototypes).

## Before and after: reader page

Same harness, same three books, 5 runs each, 30 turns per phase. Median, with range for open time.

| Metric | Book | Before | After | Verdict |
|---|---|---|---|---|
| Open to first page | Alice 0.19 MB | 484 ms (382–707) | 482 ms (418–627) | no measurable difference |
| | Les Misérables 10.1 MB | 988 ms (844–1172) | 911 ms (903–1111) | no measurable difference |
| | Huckleberry Finn 16 MB, illustrated | 1148 ms (1108–1638) | 1331 ms (1239–1338) | AB_HUCK |
| Page numbers ready, first open | Alice / Les Mis / Huck | 2.4 s / 50.4 s / 7.9 s | 2.5 s / 50.9 s / 8.1 s | no measurable difference (not targeted) |
| **Page numbers ready, later opens** | Alice / Les Mis / Huck | 2.4 s / 50.4 s / 7.9 s | **0.3 s / 0.7 s / 0.8 s** | faster: cached per book |
| Progress shown before page numbers exist | all | nothing | estimate from chapter position | new |
| Turn inside a chapter, turns with a dropped frame | Alice | 0 of 135 | 0 of 135 | same |
| | Huck | 0 of 140 | 0 of 140 | same |
| | Les Mis | 52 of 130 | 73 of 130 | AB_LESMIS |
| Turn across a chapter boundary, worst gap p95 | Alice / Les Mis / Huck | 133 / 67 / 83 ms | 100 / 83 / 83 ms | no measurable difference |
| Damaged file | | "Opening book…" for ever | error with "Back to library" | fixed |
| Dark theme pictures | | inverted | true colours | fixed (checked in Chromium only) |

Limits of these numbers: one desktop CPU throttled 4×, software rendering, no GPU. A dropped frame here is a gap over 25 ms between animation frames around the turn.

## Before and after: speed reading

Engine driven by a perfect 60 Hz clock, 1332 words (`perf/rsvp-timing.cjs`):

| wpm set | Speed delivered, before | Speed delivered, after | Onset lateness p95, before | after |
|---|---|---|---|---|
| 300 | 265 | **300** | 16.7 ms | 16.2 ms |
| 500 | 442 | **500** | 16.0 ms | 16.1 ms |
| 800 | 706 | **800** | 15.8 ms | 16.5 ms |

RSVP_LIVE

What "drift" can and cannot be: the overlay picks the word for each frame from elapsed time, so a late frame never accumulates (the word index is recomputed, not stepped). A word can still appear up to one frame after its scheduled start, because a screen only changes on a frame. That is why p95 sits at one frame and will not go lower without changing how words map to frames.

Where the timing should run (JS timer, worklet, or frame callback) could not be settled here: on the web build Reanimated worklets run on the same thread as everything else, so the three behave the same. On a phone the question is real, and it is the first thing to measure there.

## Before and after: taps

Before is read from the code at `22f95e9` (the web build could not run these flows). After is what the Playwright tests do on the web build.

| Task | Before | After |
|---|---|---|
| Add a book and start reading | 6 taps, 2 alerts | **2** (Add, pick the file) |
| Open a book in the library | 2 (cover, "Open in Reader") | **1** (cover) |
| Resume after restarting the app | 3 (Library is first, cover, "Open in Reader") | **1** (cover, or the Reader tab) |
| Enter speed reading | 2, plus an alert when there is a saved position; starts at the chapter's first word | 2, no alert; starts at the top of the page on screen |
| Change speed | 1 | 1 (the number shown is now the real speed) |
| Leave speed reading | 1; lands on the paragraph's first page; adds a bookmark every time | 1; lands on the word, marked; one marker per book |
| Change theme | 3, plus 1 to close; forgotten on close | 3; page stays visible behind the sheet; remembered |
| Change text size | 3; forgotten on close | 3; remembered |
| Find a chapter | 3; no way back | 3; "Back to page N" is 1 tap |
| Bookmark a page | 2; no feedback; list unreachable | 2; icon fills; list is in Contents |
| Close the book | 3 (centre, back, OK on an alert) | **2** |

## Prototypes: choices an experiment could settle

| Question | What was built | Observed | Decision |
|---|---|---|---|
| Does the dark-theme CSS filter cost page-turn time? | Baseline in light and dark | No measurable difference (0 of 135 dropped in both on Alice) | Removed anyway, because it inverts pictures. Not a speed fix. |
| Is our page-number lookup what slows long-book turns? | CPU profile of 30 turns | No: under 1 ms. The time is in epub.js position mapping | Hypothesis dropped before any code was written. |
| Cache page numbers per book? | `--reopen` in the benchmark | 50.9 s to 0.7 s on the 10 MB book | **Kept.** |
| Slide animation on page turn via CSS smooth scrolling? | One CSS rule | Two quick taps leave the page at offset 442 on a 353 px page | **Discarded.** A correct version needs a turn queue. |
| Preload the next chapter to smooth the boundary turn? | Load the next spine item 400 ms after each turn | Worst gap p50 66.7 ms with and without; 10 of 10 turns still drop a frame | **Reverted.** The cost is layout, which preloading does not touch. |
| Does hyphenation slow the page? | Benchmark with and without the rule | 58 vs 54 of 104 turns; open 1272 vs 1304 ms | No measurable difference. Kept for the typography. |
| Normalise speed so the label is true? | Engine change, checked in the harness | 265 to 300, 442 to 500, 706 to 800 | **Kept.** |
| Splitting `ReaderScreen.tsx` to cut re-renders | Split into the screen and two sheets, 1889 to about 800 lines | Not measured: the old screen could not run on web, so there is no before | Kept for readability. No speed claim. |
| List virtualisation for the library | LIBRARY | | |

## Animations

All new motion is Reanimated on the UI thread and touches only transform or opacity: control bars fade (150 ms in, 100 ms out), sheets slide on a spring (Material 3's bottom-sheet values: damping ratio 0.9, stiffness 700) and leave in 200 ms, the speed-reading overlay and its paused sentence fade in 150 ms. Reanimated skips layout animations when the system asks for reduced motion, and the overlay checks the setting itself. The old settings sheet used React Native's `Animated`; the page background's CSS colour transition is gone. The word marker after leaving speed reading fades with a CSS opacity transition inside the page.

Not verified: how any of this looks on a phone.

## Tests

| Suite | Before | After |
|---|---|---|
| jest | 180 pass | JEST pass |
| Playwright (web) | 3 smoke tests; reading not covered | 10: the 3 smoke tests and 7 on the core path (add, read, resume, speed read, appearance, contents and bookmarks, damaged file, non-book file) |
| CI | lint, jest | lint, jest, Playwright: green on PR 13 |
| lint | 0 errors, 10 warnings | 0 errors, LINT warnings |

## Edge cases asked for

| Case | Before | After |
|---|---|---|
| Malformed EPUB (cut-off zip) | Reader stuck on "Opening book…" | "Can't open this book" with a way back (e2e test) |
| File that is not a zip | Rejected at import, but on web the alert never showed | Rejected with a visible message (e2e test) |
| Image-heavy EPUB (16 MB) | Opens in 1.1 s; pictures inverted in dark themes | Opens in 1.3 s; pictures in true colour |
| Kill the app mid-chapter | Position written 2 s after a turn; a kill inside that window lost the turn | Written 0.8 s after a turn, and at once when the app is backgrounded or the book closed. A hard kill inside 0.8 s can still lose one turn. Not tested on a device; the web test reloads the page 1.5 s after a turn and the book reopens on that page |

## What got worse or is unverified

WORSE

- **Everything native.** The file picker, the WebView bridge, Reanimated layout animations, hiding the tab bar, and AsyncStorage for page numbers were written against their documented behaviour and type-check, and none of it was run on Android or iOS.
- **The dark-theme fallback is gone.** Colours are painted through epub.js's content hook, which is what the default "match app" theme already used. The old filter worked even if a device blocked access to the book frame. If dark text ever shows on a dark page on a phone, this is where to look.
- **Highlights.** The button is removed because no highlight could be created. The data and service remain.
- **Library scroll.** LIBRARY_NOTE
- **Cold start** was not measured.
- **Competitor apps** were studied from their official documentation, not from recordings. Durations and easing curves for their animations are not published; none are quoted.

## Decisions for you

See `choices.md`: palette and default theme, default text size, speed defaults and ramp-up, which secondary features stay, tab structure, and additions that need a dependency.
