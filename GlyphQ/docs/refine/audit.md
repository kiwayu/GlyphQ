# Flow audit (before any fix)

Target: no phone or emulator was available. Tap counts below are read from the code paths at commit `22f95e9` and labelled **inferred**. Where the web build could run a flow, it was run in Chromium and labelled **observed**.

## Web build at `22f95e9` (observed)

| Step | Result |
|---|---|
| Open app | Library renders. |
| Tap **Add** | Nothing happens. The button calls `Alert.alert` with three options and `react-native-web` implements `Alert.alert` as a no-op. |
| Open a book | Not possible. `react-native-webview` has no web implementation, so the reader cannot mount. |

Every flow below is therefore blocked on web at the first step. The web build is a declared target (`app.json` has a PWA `web` block), so this is a defect, not a missing platform.

## Native flows (inferred from code)

| Task | Taps today | Path | Friction |
|---|---|---|---|
| Import a book | 4 | Add, "Import from Device" in an alert, pick file, OK on "Book added" alert | Two alerts. The book lands in Want to Read and is not opened. |
| Open it | 2 | Tap cover (opens detail sheet), "Open in Reader" | A cover tap never opens the book. Tap and long-press do the same thing. |
| Import and start reading | 6 | The two rows above | |
| Resume after restart | 2 | Library, cover, "Open in Reader" | `currentBook` lives only in memory, so the Reader tab says "No book selected" after every restart. Position inside the book is restored. |
| Enter RSVP | 2, or 3 with a saved position | Centre tap, bolt, then an alert "Resume / Start over" | The alert blocks entry. Play needs one more tap. |
| Change RSVP speed | 1 | − / + or a preset | Works. Number shown is not the real speed (see baseline: 265 at "300"). |
| Exit RSVP | 1 | ✕ | Lands on the page where the paragraph starts, not on the word. Adds a "⚡ Speed reading" bookmark on every exit. |
| Change theme | 3, plus 1 to close | Centre tap, Aa, swatch, ✕ | Choice is not saved. Next open reverts. |
| Change font size | 3 per step | Centre tap, Aa, A+ | Not saved. Every book opens at 17 px. The Settings screen has "Default font size", font, line height and margin, and the reader reads none of them. |
| Find a chapter | 3 | Centre tap, ☰, chapter | Fine. No way back to where you were after the jump. |
| Add a bookmark | 2 | Centre tap, bookmark icon | Icon never changes, so there is no feedback. No button opens the bookmark list, so a saved bookmark can never be reached. |
| Highlight | not possible | | The tap layer covers the page, so text cannot be selected. The highlights button opens a list that can never have entries. |
| Close the book | 2 | Centre tap, ←, OK on "Session Summary" alert | An alert on every close after one minute. |

## Other findings from reading the code

1. Controls hide after 3.5 s even while the reader is choosing something in them.
2. The reader sits inside the tab navigator, so the five-tab bar stays on screen under the book.
3. Dark and Night themes invert the whole page with a CSS filter. Pictures in the book are inverted too.
4. Page numbers and the progress scrubber are unavailable until `book.locations.generate()` finishes (see baseline for how long).
5. `Alert.alert` is used for 20 messages across the app. All are silent on web.

## Edge cases

| Case | Result | How checked |
|---|---|---|
| File that is not a zip, named `.epub` | Rejected at import with "doesn't look like a valid EPUB file" | inferred: `looksLikeZip` on the first 4 bytes |
| Truncated zip (valid header, cut off) | Passes import. Reader shows its error panel. | observed in the reader harness, see baseline |
| Image-heavy 16 MB book | Opens. See baseline for times. | observed in the reader harness |
| Kill app mid-chapter | Position is saved 2 s after each page turn, so a kill inside that window loses one page turn. | inferred: `SAVE_DEBOUNCE = 2000` |
