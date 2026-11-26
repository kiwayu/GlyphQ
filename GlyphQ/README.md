# GlyphQ

The Expo app itself. Project overview, feature list, and design system live in
the [repo README](../README.md); this file covers running and testing the app.

## Run it

```bash
npm install
npm start
```

Then press `i` for the iOS simulator, `a` for an Android emulator, `w` for web,
or scan the QR code with Expo Go.

## Test it

```bash
npm test            # Jest
npm run test:e2e    # Playwright on the web build: smoke tests and the reading path
npm run lint
npx tsc --noEmit
```

The Playwright suite adds a book, reads it, speed reads, changes the theme and
reopens the app, on a phone-sized viewport. Its book is `e2e/fixtures/sample.epub`,
built by `e2e/fixtures/make-sample-epub.py`. `PW_VIDEO=1` records every test.

## Measure it

```bash
bash perf/fetch-books.sh                 # public-domain test books into perf/books/
node perf/reader-bench.cjs my-label      # book open and page-turn timings
node perf/rsvp-timing.cjs my-label       # speed-reading engine against a frame clock
node perf/rsvp-live.cjs my-label         # the real overlay in the web build
node perf/library-scroll.cjs my-label 400  # library scroll with 400 seeded books
```

The last two need the web build running first: `npx expo start --web --port 8090`.

These run the reader page and the web build in Chromium with a phone viewport
and the CPU throttled 4x. `docs/refine/REPORT.md` has the numbers from the last
pass and what they do and do not say about a phone.

Every shipped workstream has a TDD evidence report under `docs/testing/`,
recording the RED reproducer, the fix, and the test that now guards it.

## Where things are

| Path | What lives there |
|------|------------------|
| `app/` | Expo Router routes; `(tabs)/` holds library, reader, analytics, settings |
| `features/reader/` | EPUB reader: native shell, generated WebView HTML, vendored epub.js |
| `features/reader/rsvp/` | Speed reading: pure `engine.ts` (schedule, ORP, tokenizer) and `RsvpOverlay.tsx` |
| `features/library/` | Library grid, filtering, book detail sheet |
| `services/` | Import pipeline, EPUB metadata and cover extraction, settings |
| `db/` | SQLite schema, migrations, queries |
| `store/` | Zustand stores |
| `theme.ts` | Design tokens and the app-wide theme registry |

## Notes

- epub.js and JSZip are vendored into `features/reader/vendor/` and inlined into
  the generated WebView document. Do not reintroduce CDN script tags: the reader
  has to work offline, and a `readerHtml` test enforces it.
- Refresh the vendored copies with `node scripts/vendor-reader-libs.js`.
- Local EPUBs load through a `file://` HTML document rather than an HTML string,
  because iOS WKWebView cannot XHR `file://` from an HTML-string origin.
- On web there is no WebView and no file system. `components/ReaderWebView.web.tsx`
  puts the same reader page in an iframe, and `services/localEpub.web.ts` keeps
  imported books in IndexedDB. Metro picks the `.web` files by itself.
