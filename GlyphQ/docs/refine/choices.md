# Choices left to you

No experiment settles these, so nothing below was decided. A few product-level calls did get made along the way (a removed button, a removed alert, the tab bar hiding while reading, speed meaning what it says); they are listed with how to reverse each at the top of `REPORT.md`. Each has options, a picture where a picture helps, and a recommendation. Everything else in this branch works whichever way you choose.

## 1. Visual identity

**Palette.** The app ships ten themes; one is light. Screenshots are of the library and the reader in each option.

| Option | Library | Reader | Notes |
|---|---|---|---|
| A. Light (today's default) | `shots/choice-light-library.png` | `shots/choice-light-reader.png` | Cool blue on blue-white. Distinct, but blue behind long text is unusual for a reading app. |
| B. Paper (new, not in the app) | `shots/choice-paper-library.png` | `shots/choice-paper-reader.png` | Warm off-white `#FAF7F2`, ink `#2B2620`, one rust accent `#B4532A`. Reads like a page. One line in `theme.ts` to add. |
| C. Dark | `shots/choice-dark-library.png` | `shots/choice-dark-reader.png` | Already in the app. |

Recommendation: **B as the default light theme, C as the default dark**, keep the rest as options. Reason: the reading surface is the product, and a warm neutral page is what Apple Books, Kobo and Readwise all default to.

**Typography.** Book text defaults to Georgia at 17 px. Readwise defaults to 20 px. Options: keep 17, or 18, or 19. Recommendation: **18**; it is one tap away either way and now it is remembered.

**Icons.** Android and web use Material icons mapped from SF Symbol names; iOS uses SF Symbols. Options: keep the platform split, or one outline set on every platform (a new dependency). Recommendation: **keep**; the split is what each platform's users expect.

## 2. Speed reading defaults

| Setting | Options | Recommendation | Why |
|---|---|---|---|
| Default speed | 250, 300 (today), 350 | **300** | Studies found no comprehension loss against normal reading at 250–350 wpm (Di Nocera et al. 2018). |
| Presets | 250/350/450/600 (today), or 200/250/300/350/450 | **today's** | The research says comprehension drops above about 350, but a preset is a shortcut, not advice. |
| Ceiling | 900 (today), 600 | **900** | Same reasoning. |
| Ramp-up after resume | none (today), first 5 words at 70% | **none until tried on a phone** | Spritz and Reedy both ramp; neither publishes numbers and no study tests it. |
| Neighbour words | shown dimmed (today), hidden | **shown** | Readers do take in a flanking next word (Barber et al. 2010); no study shows it helps or hurts comprehension. |

Speed now means what it says: before this work "300" delivered 265. If 300 feels faster than it did, that is why.

## 3. Default theme for the book page

Options: follow the app theme (today), always Sepia, always Light. Recommendation: **follow the app**. The reader now remembers a different choice once you make one.

## 4. Secondary features: keep or cut

| Feature | State | Options | Recommendation |
|---|---|---|---|
| Highlights | Could never be created: the tap layer blocks text selection. Button removed. Data and service kept. | Restore with a "select text" mode (new work), or delete the feature | **Restore later**; it is a core e-reader function, but it needs its own design. |
| Reader tab's "EPUB URL or file path" form | Shown only for a book with no file | Keep, or remove and attach files from the book's detail sheet | **Remove** once books without files have another way to get one. |
| Search tab (Google Books) | Works | Keep as a tab, or move behind a search field in the Library | See tab structure. |
| Analytics tab, goals, folders, smart collections, DNF status | Work | Keep, or cut to make the app a reader first | **Keep**; they are the tracking half of the product and cost the reading path nothing now that a cover tap opens the book. |
| Session summary on closing a book | Removed (it was a blocking alert) | Leave out, or bring back as a line on the library card | **Leave out.** |
| "⚡ Speed reading" bookmark | Kept, one per book, replaced each time | Keep, or drop now that exit lands on the word | **Keep.** |

## 4b. Library grid

| Choice | Options | Recommendation |
|---|---|---|
| Covers per row on a phone | 2 (what shows today, with uneven widths because of a layout bug), or 3 (what the code asks for) | **3 if you want more books per screen, 2 if you want bigger covers.** Either way the widths should be made even. |
| Virtualised library list | Keep today's (smooth up to a few hundred books, slow to open and scroll at 1000), or merge `refine/library-virtual` (opens instantly at any size, hitches while scrolling on web) | **Try the branch on a phone before deciding.** Numbers are in `REPORT.md`. |

## 5. Tab structure

| Option | Tabs | Notes |
|---|---|---|
| A. Today | Library, Search, Reader, Analytics, Settings | Reader as a tab is unusual: it is empty until a book is chosen. |
| B. Three tabs | Library, Stats, Settings | Search becomes the Library's search field with an "online" scope. A book opens over the tabs. "Continue reading" is the first shelf. |
| C. Two tabs | Library, Settings | Stats moves into Settings. |

Recommendation: **B**. It removes a tab that is a dead end when no book is open and a tab that duplicates a field already on the Library.

## 6. Things that add a dependency or a screen

| Addition | Cost | Recommendation |
|---|---|---|
| Word-frequency timing in speed reading | A word-frequency list bundled in the app | Worth trying; frequency effects on reading time are well established. |
| Volume keys change speed (Reedy does this) | A native module | Later. |
| Highlighting with notes | A selection mode in the reader | Yes, see 4. |
| A slide animation on page turn | A turn queue inside the reader page, and a phone to judge it on | Not now. The cheap version (CSS smooth scrolling) was prototyped and left pages misaligned after two quick taps. Apple's guidance is to avoid motion on interactions that happen constantly. Apple Books, Kobo and Moon+ all offer it as an option, so it is a fair thing to want later. |
| PDF support | A PDF renderer | Only if you read PDFs; import already says "PDF support lands later". |
| An emulator or device run of this work | A phone with USB debugging, or enabling Windows Hypervisor Platform | **Do this first.** Everything here was measured in Chromium. |
