# Ranked fix list

Ranked by how often a reader meets the problem on the default path (import, read, speed read, adjust speed, adjust theme), then by cost. "Source" says where the problem was found: **B** baseline, **A** flow audit, **T** teardown. A pattern is borrowed only where it fixes a row here.

| # | Problem (measured cost or friction) | Source | Change | Borrowed from | Expected gain | Status |
|---|---|---|---|---|---|---|
| 1 | Web build cannot add or open a book: Add is a no-op, reader has no WebView | A | iframe reader and IndexedDB storage on web; Add opens the picker | | Core path works on the one target testable here | done |
| 2 | First import on web fails: `no such table: book_files` (database handle handed out before setup finished) | found while fixing 1 | Publish the handle after schema setup | | Import works first time | done |
| 3 | Import to reading takes 6 taps and 2 alerts | A | Add, pick file: the book opens. Cover tap opens a book that has a file | Readwise: "+" then Upload a file. Apple Books, Kobo: a tap opens the book | 6 taps to 2; open 2 taps to 1 | done |
| 4 | Appearance is never saved; Settings "Reader" defaults are ignored | A | Save every change to the settings rows; read them on open | Apple Books, Kobo, Readwise: one appearance sheet whose choices persist | Theme and size survive closing the book | done |
| 5 | A damaged file shows "Opening book…" for ever | A | Listen for epub.js `openFailed`; show an error with a way back | | No dead end | done |
| 6 | Speed reading starts at the top of the chapter, not the page being read | A | Reader page reports the first word on screen; overlay starts there | Reedy: RSVP is a mode of the reader, entered from the text | Enter RSVP where you are | done |
| 7 | Speed shown is not speed delivered: 265 wpm at "300" | B | Scale durations so the average word lasts 60000/wpm | Spritz patent US 8,903,174 | Shown speed equals real speed | done |
| 8 | Leaving speed reading lands on the paragraph's first page, not the word; adds a bookmark each time | A | Turn to the page holding the word and mark it; keep one marker, replaced each time | no product documents this (teardown "Could not verify") | Exact word; no bookmark pile-up | done |
| 9 | Resume asks "Resume / Start over" in an alert before speed reading | A | Resume without asking; stepping back is one tap | Reedy: sentence navigation | One fewer tap, no modal | done |
| 10 | « and » move 5 words, which lands mid-sentence | A, T | Step by sentence | Reedy; Schotter et al. 2014 (blocking re-reading hurts comprehension) | Re-read a sentence in one tap | done |
| 11 | Nothing shows where you are in the text while paused | T | Show the current sentence under the word while paused | Reedy: full-text preview during a pause | Context without leaving RSVP | done |
| 12 | Focus letter counts punctuation, so `“Hello,”` focuses the wrong letter | T | Count letters only | Spritz patent table | Focus letter matches the published rule | done |
| 13 | Bookmarks can be added but never listed; the icon gives no feedback | A | Contents and Bookmarks in one sheet; icon fills when the page is bookmarked | Apple Books: bookmarks under Contents | Bookmarks become usable | done |
| 14 | Highlights button opens a list that can never have entries | A | Remove the button (the tap layer blocks text selection) | | One less dead control | done; restoring highlighting is a choice for you |
| 15 | No way back after a jump from contents or the scrubber | A | "Back to page N" pill for the next 3 page turns | Apple Books Undo Page Skip, Kobo back arrow, Readwise "Return to X%" | One tap back | done |
| 16 | Controls hide themselves after 3.5 s, mid-choice | A | No timer: centre tap shows and hides; a page turn hides | No app in the teardown documents an auto-hide | Controls stay while in use | done |
| 17 | Closing a book shows a "Session Summary" alert | A | Remove it; Analytics already has the data | | One fewer tap on every close | done |
| 18 | Resume after restart needs Library, cover, "Open in Reader" | A | Restore the last book into the Reader tab on launch | Apple Books, Kobo: place saved automatically | 1 tap | done |
| 19 | Five-tab bar stays on screen under the book | A | Hide the tab bar while a book is open | Apple Books, Kobo: chrome hidden while reading | Whole screen for the page | done |
| 20 | Dark and Night invert pictures | A | Paint theme colours into the page; drop the filter | | Pictures keep their colours | done; no speed gain, see baseline |
| 21 | Page numbers take 50 s on a 10 MB book, on every open | B | Cache the result per book; estimate progress from the spine meanwhile | | Second open has numbers at once | done; measured in the report |
| 22 | Last page turn is lost if the app is closed within 2 s | A | Write on background and on close; debounce 0.8 s | | No lost page | done |
| 23 | A quoted or listed paragraph is read twice in speed reading | found in code | Read leaf blocks only | | No repeated text | done |
| 24 | Imported book keeps its file name as title | found in screenshots | Use the book's own title when the title is still the file name | | Real titles in the library | done |
| 25 | Chapter-boundary page turn drops frames (worst gap p95 67–133 ms) | B | Prototype: load the next chapter ahead of time | | Smaller gap at chapter ends | prototype, see report |
| 26 | Page turn has no animation | T | Prototype: compositor smooth scroll, off under reduced motion | Apple Books, Kobo, Moon+: page animation is a user choice | Continuity between pages | prototype, see report |
| 27 | Long-chapter page turns drop a frame (52 of 130 on Les Misérables) | B | None found in app code: the time is inside epub.js position mapping | | | not fixed, cause documented |

## Left out on purpose

- **Ramp-up after resume.** Spritz and Reedy both do it; neither publishes numbers and no study tests it. Any duration would be a guess. Listed as a choice.
- **Word-frequency timing.** Well supported by reading research, but it needs a frequency list in the app. That is a new dependency, so it is a choice.
- **Pinch to resize text** (Kobo, Reedy). The audit found no friction that the A−/A+ buttons leave unsolved.
- **Volume keys for speed** (Reedy). Needs a native module.
