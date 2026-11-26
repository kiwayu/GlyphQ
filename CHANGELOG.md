# Changelog

All notable changes to this project are documented here.

## [Unreleased]

A pass over the core path (add a book, read, speed read, change speed, change
theme) that started from measurements. Numbers, method and open questions are
in `GlyphQ/docs/refine/REPORT.md`. Nothing in this section has run on a phone
yet; it was measured and tested in Chromium.

### Added
- **The web build can read books.** The reader runs in the browser, imported
  books are kept in browser storage, and app themes and library import work
  there.
- **One tap back after a jump.** Going to a chapter, a bookmark or a point on
  the progress bar leaves a "Back to page N" button for the next few pages.
- **A bookmark list.** Contents and Bookmarks share one sheet. Bookmarks could
  be added before but never seen. The bookmark icon shows when a page is marked.
- **Speed reading shows the sentence you are in while paused**, and « and » step
  by sentence instead of five words.
- **End-to-end tests for the reading path**, run in CI.

### Changed
- **Add opens the file picker, then the book.** Importing and starting to read
  took six taps and two alerts; it takes two taps. A tap on a cover opens the
  book; long-press shows its details.
- **Speed reading starts on the page you are reading** and no longer asks
  "Resume or start over" first.
- **Leaving speed reading lands on the word you stopped at**, marked for a
  moment, instead of the first page of that paragraph.
- **The speed shown is the speed you get.** Pauses used to be added on top, so
  "300" delivered about 265 words a minute.
- **Reading controls stay until you dismiss them.** They used to hide after 3.5
  seconds. The tab bar hides while a book is open.
- **Dark and Night keep pictures in their own colours.** They used to invert the
  whole page.
- **Page numbers are remembered per book.** On a long book they took 50 seconds
  to compute on every open; later opens have them in under a second.

### Fixed
- Text size, font, spacing, margins and theme chosen while reading are now
  saved. Every book used to open at the defaults, and the Reader section of
  Settings had no effect.
- A damaged EPUB showed "Opening book" for ever. It now says it cannot be opened.
- The last page turn was lost if the app closed within two seconds of it.
- Speed reading read a quoted or listed paragraph twice.
- An imported book kept its file name as its title.
- The first import could fail with "no such table" because the database was
  used before its setup finished.
- Settings offered fonts the reader does not have; choosing one silently gave
  Georgia.

### Removed
- The session summary alert on closing a book.
- The highlights button. No highlight could be created, because the page's tap
  layer covers the text. The stored data is untouched.

## [1.2.0] - 2026-07-30

The release that turns the reader from "it opens EPUBs" into something you can
actually read a book in: chapters flow into each other while speed reading,
every surface follows one theme, and your library shows real covers.

### Added
- **Speed reading flows across chapters.** Finishing a chapter moves the book to
  the next one, holds its title in the word slot for a beat, and picks up again
  on its own, so a session is no longer capped at one chapter. Tap during the
  handoff to stay put. The pause scales with your speed rather than sitting at a
  fixed two seconds, and the progress bar drains as the countdown so the resume
  never feels random. Sections with no prose (covers, nav pages) are skipped, so
  you never land on a blank screen.
- **Finishing a book is an actual moment.** Reaching the end offers Done or a
  way back to the last chapter, instead of an alert with a restart button that
  replayed the chapter you just finished.
- **Speed reading is measured.** Sessions record words read, mode, and the speed
  you ended on, kept separate from page-reading sessions.
- **Accessibility for the chapter handoff.** With a screen reader or reduce
  motion enabled, the handoff never resumes on a timer and waits for you; the
  chapter title is announced; the streaming word is hidden from assistive tech
  while playing, where it changed five times a second.
- **Closing the speed reader leaves the page where you stopped.** Chapter
  advance moves the book itself, and closing seeks to the paragraph you reached,
  so going back to normal reading picks up from the right place instead of
  wherever you opened the overlay.
- **Start speed reading from any word.** Long-press and drag in the book to
  place a caret, then hit ⚡ to stream from exactly there.
- **Reading themes.** Light, sepia, dark, and night for book pages, plus a
  "Match app" option that paints the page in the exact app palette. Changes
  apply live, without reopening the book.
- **App-wide theme registry** with a picker in Settings and a themed navigation
  bar, so the library, reader, and speed reader agree on one look.
- **Real book covers.** Covers are pulled out of the EPUB on import and on
  first open, and the library shows them in a bookstore-style grid.
- **Edit book details.** Fix a title, author, or other metadata from the book
  detail sheet; missing authors are filled in from the EPUB's own metadata.
- **Always-on progress footer** with page number and pages left in the chapter,
  plus a page-jump slider for moving anywhere in the book by drag.
- **Dimmed previous and next words** flanking the speed reader's focus word,
  so you keep a sense of context without breaking the fixed eye position.
- **Android Play build config** — application ID, version code, and EAS build
  profiles.

### Changed
- Tap zones are handled natively (left third back, right third forward, middle
  for the menu) instead of inside the EPUB iframe, which never fired on Android.
- The reader remounts per book, so the table of contents and cover refresh when
  you switch titles.
- Speed reading offers Resume or Start over when you reopen a chapter you were
  part way through.

### Fixed
- `readerApi.getCurrentCfi` was called in two places but never defined, so the
  ⚡ speed-reading marker bookmark had always silently failed to save.
- "ePub is not defined" on an offline or flaky network: epub.js and JSZip are
  vendored into the bundle instead of loaded from a CDN at runtime.
- Chapters nested under parts were dropped from the table of contents; the
  navigation tree is now flattened recursively.
- The speed reader's focus word is scaled to fit instead of being truncated or
  ellipsised, so long words stay readable.
- Reading theme changes now apply live rather than needing the book reopened,
  and the Reading theme picker always shows.
- Importing a file whose name collides with an existing book no longer
  overwrites it; imports are atomic and clean up after themselves.
- The library's swipe actions crashed without a `GestureHandlerRootView` at the
  root; the reader page also sat under the status and navigation bars.

### Fixed (post-review)
- Closing the speed reader used to wipe the "resume where you left off" pointer,
  because the seek it performs counted as normal reading. It now survives.
- Closing while the reader was still finding the next chapter could drop you a
  chapter ahead of where you actually stopped.
- Finishing twice in quick succession could start two chapter searches at once
  and skip a chapter.
- A book whose remaining sections are all blank no longer leaves you parked on
  one, and a chapter that fails to render is retried past rather than treated as
  empty.
- Chapters nested under parts show their real title during speed reading instead
  of a blank.

### Tests
- 158 tests across 16 suites, including a Playwright web smoke suite and TDD
  evidence reports under `GlyphQ/docs/testing/`.
- The reader's injected WebView script is now executed under jsdom rather than
  checked with string matching, which is what let the close/advance race ship.

## [1.1.0] - 2026-06-24

### Added
- **Speed reading (RSVP)** in the EPUB reader. A ⚡ button in the reader
  streams the current chapter one word at a time with the Optimal
  Recognition Point letter pinned, so your eyes stay fixed.
  - `RsvpOverlay` drives the existing RSVP engine with a
    requestAnimationFrame loop that indexes by elapsed time, so dropped
    frames self-correct instead of drifting.
  - Play/pause (tap the word or the button), WPM stepper + presets
    (250/350/450/600), ±5-word seek, and restart.
  - Mid-stream WPM changes rebase from the current word — the speed
    changes without skipping words.
  - Chosen WPM persists across sessions; a per-book resume pointer
    (`rsvp_word_index`) remembers where you stopped and is cleared once
    you return to normal page reading.
- `splitOrp` engine helper and `readerApi.getChapterText()` bridge for
  extracting chapter paragraphs from the epub.js view.

### Tests
- 11 new tests: 5 unit tests for `splitOrp`, 6 integration tests that
  drive `RsvpOverlay` through a real play loop with a controlled clock.
  Full suite: 78 passing.

### Fixed
- Escaped unescaped quotes in `BookDetailSheet` highlight text (lint).
