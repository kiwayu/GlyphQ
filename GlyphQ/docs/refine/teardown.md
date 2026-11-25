# Competitor and research teardown: core reading path and RSVP

Scope: import, read, toggle RSVP, change speed, change theme. Primary sources only. No device recordings.

Source tags:
- **[fetched]**: page text was retrieved and read directly.
- **[index]**: the primary page could not be rendered (HTTP 503/403 or a JS-only page), so the claim comes from the search engine's indexed text of that same primary URL. Treat these as lower confidence and re-check before quoting in UI copy.

---

## Part A: Reading apps

### Apple Books (iOS / iPadOS)

1. **Chrome.** Controls are hidden while reading. The guide says "You may need to tap the page to display" the Menu (or Appearance) button, and every navigation step starts with "tap the page". No auto-hide timer is documented. [fetched] https://support.apple.com/guide/iphone/read-books-iphc1af7c57/ios
2. **Page turn.** "Tap the right margin or swipe right to left". Tap the left margin or swipe left to right to go back. A setting (Settings > Apps > Books, "Both Margins Advance") makes either margin advance. [fetched] https://support.apple.com/guide/iphone/read-books-iphc1af7c57/ios
3. **Page-turn styles.** The current guide only says "tap the Page Turn button, then tap an option", without naming the options. The iOS 17 guide labels the button "Page Turn Style Curl". [fetched] https://support.apple.com/guide/iphone/read-books-iphc1af7c57/17.0/ios/17.0 . The iPad guide names "Curl, Fast Fade, or Scroll". [index] https://support.apple.com/guide/ipad/read-books-ipadc8494b6b/ipados . No default is documented.
4. **Theme, font, size.** The path is tap page > Menu > Themes & Settings. That sheet holds the font-size buttons ("Tap the large A to increase the font size or tap the small A to decrease it"), the page themes ("Tap a page theme such as Quiet or Bold"), and the page-turn style. Font is one level deeper, under Customize > Font. Theme or size therefore takes 3 taps from the page, and font takes 5. [fetched] https://support.apple.com/guide/iphone/read-books-iphc1af7c57/ios
5. **TOC, bookmarks, scrubber, return.**
   - Contents: tap page > Menu > Contents.
   - Bookmarks: tap the Bookmark Ribbon to add one. View them under Contents > Bookmarks.
   - Scrubber: "drag the slider at the bottom of the page left or right to go to a specific page or chapter."
   - Return: after a jump, tap the page and then the **Undo Page Skip** button in the bottom-left corner. "Tap the rounded arrow again to go back to your current location."
   [fetched] https://support.apple.com/guide/iphone/read-books-iphc1af7c57/ios
6. **Import.** Apple's Pages help says to save an EPUB to the device or iCloud Drive, then locate the EPUB file in Files and tap it to open it in Books. [index] https://support.apple.com/en-us/118122 . No Books-side import screen is documented.
7. **Resume.** "When you close a book, your place is saved automatically." No bookmark is needed. [fetched] https://support.apple.com/guide/iphone/read-books-iphc1af7c57/ios

### Amazon Kindle app (iOS / Android)

Note: every amazon.com help page returned HTTP 503 to direct fetch, so all Kindle claims below are [index].

1. **Chrome.** To change settings, "tap the top center of the screen", then open the **Aa** reading-settings menu and choose a tab. [index] https://www.amazon.com/gp/help/customer/display.html?nodeId=TABlJ4ot69emTO8jJG
2. **Page turn.** The Tap / Swipe / Both setting (Settings > Reading Options > Page Turn) is documented for Kindle e-readers only, not for the phone app. [index] https://www.amazon.com/gp/help/customer/display.html?nodeId=T0PHyrZWk1XFRwShgl . No official Amazon page documents the app's page-turn animation. See "Could not verify".
3. **Theme, font, size.** The Aa menu's Font tab covers font type, font size and page colour. The listed fonts include Bookerly, Amazon Ember and OpenDyslexic. A Layout tab offers continuous scrolling, alignment, margins and columns. That gives about 3 taps from the page: top-centre tap, Aa, then the tab. [index] https://www.amazon.com/gp/help/customer/display.html?nodeId=TABlJ4ot69emTO8jJG
4. **TOC, return.** Kindle for Mac documents two separate commands: "Sync to Furthest Page Read" (Command-R) and "Go to Location" (Command-G). [index] https://www.amazon.com/gp/help/customer/display.html?nodeId=TvUCseCLL2qvYBpx3u
5. **Import.** Send to Kindle accepts EPUB, along with PDF, HTML, RTF, TXT and images. Web uploads can be up to 200 MB. [index] https://www.amazon.com/gp/help/customer/display.html?nodeId=G5WYD9SAF7PGXRNA
6. **Resume.** Sync backs up the "furthest page read" across devices and needs an internet connection. [index] https://www.amazon.com/gp/help/customer/display.html?nodeId=GDCAMDFMC2LZP6BR

### Rakuten Kobo Books app (iOS / Android)

1. **Chrome.** "While reading, tap the middle of the screen to bring up the Reading menu." No auto-hide is documented. [fetched] https://help.kobo.com/hc/en-us/articles/360017708154
2. **Page turn.** "Tap the right side of the screen or swipe from right to left". Tap the left side to go back. "Tap and hold the left or right edge of the screen to move from page to page." [fetched] https://help.kobo.com/hc/en-us/articles/360017708194-Turn-pages-and-skip-chapters-in-your-book-on-the-Kobo-Books-app-iOS-Android . Reading Settings include **Page Transition** ("Change the animation style when you turn your page"). The styles are not named. [fetched] https://help.kobo.com/hc/en-us/articles/360017865293-Adjust-page-margins-line-spacing-and-more-on-the-Kobo-Books-app-iOS-Android
3. **Theme, font, size.**
   - Path: centre tap > Font icon > drag the size slider or tap a font. That is 2 taps plus a drag.
   - Shortcut: "pinch the screen to make the font smaller or larger", which opens the size menu.
   [fetched] https://help.kobo.com/hc/en-us/articles/360017708154
   - Colour lives in the same Reading Settings panel under **Tone** ("Adjust the page colour and screen brightness"), along with Margins, Line Spacing, Alignment, Page Transition and Lock Orientation.
   [fetched] https://help.kobo.com/hc/en-us/articles/360017865293-Adjust-page-margins-line-spacing-and-more-on-the-Kobo-Books-app-iOS-Android
4. **TOC, scrubber, return.**
   - TOC: centre tap > Table of Contents icon at the top > tap a chapter. [fetched] https://help.kobo.com/hc/en-us/articles/360017865033-Use-the-table-of-contents-on-your-Kobo-Books-app-iOS-Android
   - Scrubber: "Tap and drag the circle on the slider at the bottom of the page."
   - Return: an arrow near the bottom-left returns you to the previous page. "The arrow icon only appears after you've skipped a chapter or go to a different page using the slider." [fetched] https://help.kobo.com/hc/en-us/articles/360017708194-Turn-pages-and-skip-chapters-in-your-book-on-the-Kobo-Books-app-iOS-Android
   - Bookmarks (Android): open the TOC, then Annotations. [index] https://help.kobo.com/hc/en-us/articles/360017707954-Bookmark-pages-on-the-Kobo-Books-app-for-Android
5. **Import.**
   - Android: Home > Profile icon > **Import Items** > Start > select > **Import Selected**, with an option to delete the originals. That is 5 taps after the file is on the device.
   - Android limits: non-protected ePub only, and "PDF files cannot be imported". Imported items stay on that device and are not synced.
   [fetched] https://help.kobo.com/hc/en-us/articles/360017864893-Import-items-from-your-Android-device-to-your-Kobo-Books-library
   - iOS: open the file from Mail, Google Drive or Finder into Kobo Books. [index] https://help.kobo.com/hc/en-us/articles/360060463753-Import-items-from-your-iOS-or-macOS-device-onto-your-Kobo-Books-app
6. **Resume.** "Your progress is automatically synced … you continue where you left off." [fetched] https://help.kobo.com/hc/en-us/articles/360021392453-Read-with-your-Kobo-eReader-and-Kobo-Books-app

### Readwise Reader

1. **Chrome.** Long-form reading view "hides Reader's action-heavy bottom bar" and "elevates UI elements like reading progress and appearance settings". It is on by default for EPUBs. No tap-to-hide behaviour is documented. [fetched] https://docs.readwise.io/reader/guides/workflows/longform-reading
2. **Page turn.** EPUBs default to **Paged scroll**. "While in paged scroll mode, you can use a single tap on the left or right margins of the page to flip backward or forward." Horizontal pagination is a separate option. On Android, volume buttons can turn pages; this is "not available on iOS devices". [fetched] https://docs.readwise.io/reader/docs/faqs/appearance and https://docs.readwise.io/reader/guides/workflows/longform-reading
3. **Theme, font, size.**
   - The **Aa** icon at the top right opens Appearance in long-form view. That is 1 tap from the page.
   - Font size defaults to 20px and ranges from 14px to 80px.
   - Themes are Crisp (the default), Sepia, Soft, Slate, Ink and Night. Each has light and dark variants that follow the system mode.
   [fetched] https://docs.readwise.io/reader/docs/faqs/appearance
4. **Progress and return.**
   - Reader keeps two positions: "reading progress (the furthest point you've actually read)" and "last location (wherever you last were, even if you were just scrolling)".
   - After a jump, "a Return to [X]% button appears near the bottom of the reading view."
   - Progress can be reset from the actions menu.
   [fetched] https://docs.readwise.io/reader/docs/faqs
   - The return indicator was introduced so readers would not lose their place after skimming or following TOC links. [index] https://readwise.io/reader/update-oct2024
5. **Import.** On mobile, tap "+" (top right of Library) > **Upload a file**, which is 2 taps. On iOS, the Files share sheet also offers "Save File to Reader". [fetched] https://docs.readwise.io/reader/docs/faqs/adding-new-content
6. **Resume.** With "Currently reading" set as the default view, Reader opens to the document last read. [fetched] https://docs.readwise.io/reader/guides/workflows/longform-reading

### Moon+ Reader (Android)

1. **Chrome and tap zones.** The app offers "24 customized operations (screen click, swipe gesture, hardware keys)" assignable to 15 events. Brightness is changed by "sliding your finger along the left edge of the screen". [fetched] http://moondownload.com/ . The Play listing also mentions a "9-square grid" tap-event option, and the developer says tap events can be set to None. [index] https://play.google.com/store/apps/details?id=com.flyersoft.moonreader
2. **Page turn.** "Real page turning effect with customized speed/color/transparent; 5 page flip animations". Paging also works via "touch screen, volume keys or even camera, search or back keys". There are "5 auto-scroll modes … Real-time speed control." [fetched] http://moondownload.com/
3. **Theme, font, size.** "10+ themes embedded, includes Day & Night mode switcher". Visual options include line space and font scale. The step count is not documented. [fetched] http://moondownload.com/
4. **Import, bookmarks, sync.** "self bookcover, search, import supported". The Pro version can "sync reading positions, bookmarks, highlights and notes between phones and tablets." [fetched] http://moondownload.com/
5. **Takeaway.** Moon+ makes nearly every gesture configurable. That is the opposite of a simple core path and is useful as a contrast.

---

## Part B: RSVP readers

### Spritz (company site and patent US 8,903,174 B2)

1. **Display.** Words appear "one word at a time in a window we call the redicle". "One key letter in each word is highlighted in red … the 'Optimal Recognition Point'." [fetched] https://spritz.com/
2. **Speed control.** "Change your reading speed settings with just one click". Users can reach "300 wpm or more". No default wpm, step size or gesture is documented. [fetched] https://spritz.com/
3. **Pause.** "with Spritz you simply hit pause." The site documents no rewind and no context-on-pause behaviour. [fetched] https://spritz.com/
4. **Patent timing model.**
   - Each word gets a relative time multiplier.
   - The base unit is normalised: the default update time equals the speed setting divided by the **average** multiplier of the text.
   - Each word shows for "the product of the relative time multiplier and the dut".
   - So the user's wpm setting stays the true average throughput.
   [fetched] https://patents.google.com/patent/US8903174B2/en
5. **Patent ramp.** The speed settings include "the initial display speed (providing a ramp from a lower speed at the start to the higher overall speed setting)". No ramp values are given. [fetched] https://patents.google.com/patent/US8903174B2/en

### Reedy (official site and listing)

1. **Speed.** Speed goes up to "3000 words per minute with a possible gradual acceleration". "Use volume buttons for quick speed adjusting." No default wpm is stated. [fetched] https://reedy-reader.com/
2. **Pause, navigation.**
   - "Touch the screen to play or pause."
   - "Press any volume button once to stop or proceed the reading."
   - "Press and hold to navigate through sentences". Navigation works through sentences and paragraphs.
   [fetched] https://reedy-reader.com/
3. **Context on pause.** "Quick preview of the full text (including text formatting, images, tables, etc.) during a pause in the speed reader." [fetched] https://reedy-reader.com/
4. **Timing and focus.**
   - "Smart slowing – reducing the speed at punctuation marks and complicated words". No multipliers are published.
   - "Focus mode – the focus point is shifted closer to the beginning of a word."
   - Text size is changed by pinch-to-zoom.
   [fetched] https://reedy-reader.com/
5. **Exit to page.** Reedy is a combined ebook reader plus RSVP mode for epub, fb2, html and txt. [index] https://play.google.com/store/apps/details?id=azagroup.reedy . The site does not say whether leaving RSVP lands on the same word.

### Others

No other RSVP app with primary documentation of word-level return mapping was found. See "Could not verify".

---

## Part C: RSVP research, compared with the GlyphQ engine

### C1. Optimal viewing position / ORP

- **OVP location.** "The optimal viewing position is situated between the beginning and middle of the word." It comes from an interplay of four variables, including the distance to the farthest letter and how informative the word's beginning and end are. Brysbaert & Nazir 2005, *J. Research in Reading* 28(3). [fetched abstract] https://api.openalex.org/works/doi:10.1111/j.1467-9817.2005.00266.x (DOI 10.1111/j.1467-9817.2005.00266.x)
- **Cost of missing the OVP.** O'Regan & Jacobs 1992 (JEP:HPP 18(1), 185–197, DOI 10.1037/0096-1523.18.1.185) found the OVP near or slightly left of the middle. A later paper reports that "naming and decision latencies increased 20–30 msec per letter deviation" from it, citing O'Regan & Jacobs for lexical decision. [index, secondary] https://link.springer.com/content/pdf/10.3758%2FBF03194790.pdf
- **Preferred viewing location in reading.** Rayner 1979 (*Perception* 8, 21–30, DOI 10.1068/p080021) found that readers land between the beginning and the centre of words. [index] https://link.springer.com/content/pdf/10.3758/BF03208086.pdf
- **Spritz rule.** Patent Table I and FIG. 7 give the ORP by character count, excluding punctuation:
  - 1 char: 1st character
  - 2–5 chars: 2nd character
  - 6–9 chars: 3rd character
  - 10–13 chars: 4th character
  - 14 or more chars: 5th character
  - An alternative claim uses a pixel position ratio "equal or substantially equal to 0.265" of the word's width.
  [fetched] https://patents.google.com/patent/US8903174B2/en
- **Comment on GlyphQ.** The GlyphQ focus index (0 / 1 / 2 / 3 / 4 for 1 / 2–5 / 6–9 / 10–13 / 14+) matches the patent table exactly. It also sits inside the "between beginning and middle" OVP region. One open question: the patent counts characters **excluding punctuation**. Check whether GlyphQ strips trailing punctuation before choosing the index; for example, `word,` should index as 4 letters. No paper validates the specific step thresholds. They are the patent's own rule.

### C2. Pauses and duration multipliers

- **Spritz patent multipliers** (FIG. 6) [fetched] https://patents.google.com/patent/US8903174B2/en
  - Word length, punctuation excluded: m = 1.0 for 7 or fewer chars, 1.3 for more than 7, 1.6 for more than 13.
  - Sentence end: a separate **blank element** is inserted, with m = 1.0, 2.2 or 3.3 depending on the number of words in the sentence. The description uses thresholds of >7 and >22 words. Claim 41 uses "twelve" and "twenty-two".
  - The patent gives no comma, clause, paragraph or digit multiplier.
- **Clause and sentence wrap-up.** Rayner, Kambe & Duffy 2000 (*QJEP* 53A(4), 1061–1080) found longer gaze durations on clause-final nouns than on the same nouns in non-final positions. This is the eye-movement basis for clause and sentence pauses. [index, as reported by] https://www.psych.uni-goettingen.de/de/education/archive/publikationen/tiffinrichards_schroeder_2018_the_development_of_wrapup_processes_in_text_reading.pdf
- **Pauses in RSVP.** Castelhano & Muter 2001 (*Behaviour & IT* 20, 237–247, DOI 10.1080/01449290110069400) reported two findings:
  - Punctuation pauses improved *preference* for RSVP.
  - A modified RSVP with pauses at clause boundaries was significantly preferred to plain RSVP.
  No durations were retrievable. [fetched abstract] https://api.openalex.org/works/doi:10.1080/01449290110069400
- **Word frequency.** Rayner & Duffy 1986 (*Memory & Cognition* 14(3), 191–201) found that low-frequency words get longer fixations than high-frequency controls of equal length. [index] https://link.springer.com/article/10.3758/BF03197692
- **Adaptive timing.** Öquist & Goldstein 2003 (*Interacting with Computers*, DOI 10.1016/S0953-5438(03)00039-0) tested RSVP whose timing adapts to the text:
  - On short texts, all RSVP variants raised reading speed by about 33% with no significant comprehension loss.
  - On long texts, all RSVP variants raised task load.
  - Adaptive RSVP had lower task load than fixed RSVP on most factors.
  [fetched abstract] https://api.openalex.org/works/doi:10.1016/S0953-5438(03)00039-0
- **Comment on GlyphQ.**
  - (a) **Normalisation gap.** GlyphQ multiplies on a fixed base of 60000/wpm. Every pause therefore *lowers* real throughput below the displayed wpm. Spritz instead divides by the text's average multiplier, so the displayed wpm stays the true average. GlyphQ's label therefore overstates actual speed on punctuation-heavy text.
  - (b) **Long-word multipliers.** GlyphQ uses 1.3 at 9+ and 1.5 at 13+. The patent uses 1.3 at more than 7 and 1.6 at more than 13. The two are close, but GlyphQ's threshold is shifted and its top value is lower. No paper gives an exact multiplier.
  - (c) **Sentence pause.** GlyphQ's sentence pause is 2.2. That matches the patent's middle value, but the patent scales it with sentence length and shows a blank frame instead of holding the word.
  - (d) **Unsourced multipliers.** No source was found for clause 1.8, paragraph 2.8 or digit 1.4. The clause and sentence pauses have qualitative support (wrap-up effects, Castelhano & Muter) but no numbers.
  - (e) **Stacking.** Stacked multipliers are GlyphQ-specific. The patent applies the word multiplier and the sentence blank to separate elements. Under GlyphQ, a 13+ letter paragraph-final word gets 1.5 × 2.8 = 4.2× base, which is 840 ms at 300 wpm.
  - (f) **Frequency.** GlyphQ has no word-frequency term, though frequency effects on reading time are well established.

### C3. Comprehension against speed

- **Rayner et al. 2016** (*PSPI* 17(1), 4–34): it is unlikely readers can double or triple their speed "(e.g., from around 250 to 500-750 words per minute)" while understanding as well. [fetched abstract] https://api.openalex.org/works/doi:10.1177/1529100615623267
- **Benedetto et al. 2015** (*Computers in Human Behavior* 45, 352–358, DOI 10.1016/j.chb.2014.12.043) compared Spritz with normal reading. Spritz:
  - impaired literal comprehension,
  - increased visual fatigue,
  - greatly reduced blinks.
  The authors attribute the comprehension loss to suppressed parafoveal processing and regressions. [index] https://doi.org/10.1016/j.chb.2014.12.043
- **Ricciardi & Di Nocera 2017** (reply, *CHB* 69, 381–385, DOI 10.1016/j.chb.2016.12.047): across two studies with 172 participants, comprehension was lost when RSVP speed was above 250 wpm. They attribute this mainly to encoding. [index] https://doi.org/10.1016/j.chb.2016.12.047
- **Di Nocera, Ricciardi & Juola 2018** (*IJHFE* 5(4), DOI 10.1504/IJHFE.2018.096118): comprehension did not differ significantly between normal reading and RSVP at 250, 300 and 350 wpm. It dropped at the higher rate tested, with a range up to 450 wpm. [index] https://www.inderscienceonline.com/doi/abs/10.1504/IJHFE.2018.096118
- **Ricciardi et al. 2020** (*IJHFE*, DOI 10.1504/IJHFE.2020.109594): comprehension difficulty appeared even with a very short text above 250 wpm. [index] https://www.inderscienceonline.com/doi/abs/10.1504/IJHFE.2020.109594
- **Acklin & Papesh 2017** (*Am. J. Psychology* 130(2), 183–199) compared static text with RSVP at 700 and 1000 wpm. Static text beat both RSVP rates. Slower RSVP helped verbatim comprehension and faster RSVP helped inferential comprehension. Working memory did not predict comprehension. [fetched abstract] https://api.openalex.org/works/doi:10.5406/amerjpsyc.130.2.0183
- **Schotter, Tran & Rayner 2014** (*Psych. Science*, DOI 10.1177/0956797614531148): blocking regressions with a trailing mask hurt comprehension, and not only for ambiguous sentences. [fetched abstract] https://api.openalex.org/works/doi:10.1177/0956797614531148
- **Primativo et al. 2016** (*PLoS One*, DOI 10.1371/journal.pone.0153786) found that eye movements limit reading to about 300 wpm. Without masks, RSVP word decoding reached about 1200 wpm, but this was word report, not text comprehension. Semantic context helped only by "a factor of about 1.4". [fetched] https://pmc.ncbi.nlm.nih.gov/articles/PMC4835101/
- **Comment on GlyphQ.**
  - The default of 300 wpm sits inside the 250–350 wpm band where comprehension held (Di Nocera 2018).
  - The 450 and 600 presets and the 900 ceiling are in the range where studies report losses.
  - RSVP removes regressions and preview by design. A one-tap way to step back one sentence, or to see the page on pause, addresses the regression finding (Schotter 2014). That is a design inference, not a tested result.

### C4. Ramp-up after resume

- Both documented products ramp: the Spritz patent describes an "initial display speed … ramp from a lower speed at the start", and Reedy advertises "gradual acceleration". [fetched] https://patents.google.com/patent/US8903174B2/en and https://reedy-reader.com/
- No peer-reviewed study testing a ramp was found, and neither product publishes ramp numbers.
- **Comment on GlyphQ.** GlyphQ has no ramp. Adding one has documented *practice* behind it but no measured evidence, so any duration would be a guess. Leave it out of evidence-based claims.

### C5. Context words beside the focus word

- **Readers use neighbouring words.** In word-by-word RSVP with flankers (each word shown between its neighbours), the N400 was smaller when the right flanker fit the sentence. So readers do extract and integrate parafoveal information from a flanking next word. Barber, Doñamayor, Kutas & Münte 2010. [index] https://pubmed.ncbi.nlm.nih.gov/20580772/
- **Spritz shows a single word.** Benedetto et al. 2015 blame lost parafoveal processing for Spritz's comprehension deficit. [index] https://doi.org/10.1016/j.chb.2014.12.043
- **No direct test found.** No study was found that compares comprehension for single-word RSVP against RSVP with dimmed neighbours at the same rate.
- **Comment on GlyphQ.** Dimmed previous and next words have some basis: preview information is used. The comprehension benefit is unverified. Reedy's alternative, a full-text preview only while paused, is documented practice.

---

## Part D: Motion guidance

### Apple HIG

- The HIG Motion page gives **no durations or easing curves**. It says:
  - "Don't add motion for the sake of adding motion."
  - "When animated feedback is brief and precise, it tends to feel lightweight and unobtrusive".
  - "In apps, generally avoid adding motion to UI interactions that occur frequently."
  - "don't make people wait for an animation to complete before they can do anything".
  - The only number given is to avoid oscillation "around 0.2 Hz".
  [fetched] https://developer.apple.com/design/human-interface-guidelines/motion
- **Reduce Motion.** Apps should respond by "reducing automatic and repetitive animations, including zooming, scaling, and peripheral motion". The listed practices are:
  - "Tightening animation springs to reduce bounce effects"
  - "Tracking animations directly with people's gestures"
  - "Replacing transitions in x-, y-, and z-axes with fades to avoid motion"
  - "Avoiding animating into and out of blurs"
  [fetched] https://developer.apple.com/design/human-interface-guidelines/accessibility
- **Sheets.**
  - No durations are given.
  - Detents: "large is the height of a fully expanded sheet and medium is about half". "In an iPhone app, consider supporting the medium detent".
  - "Include a grabber in a resizable sheet."
  - "Support swiping to dismiss a sheet."
  - "Display only one sheet at a time".
  [fetched] https://developer.apple.com/design/human-interface-guidelines/sheets

### Material Design 3

- **Duration tokens** (Google's Material Components docs for M3):
  - Short 1–4: 50, 100, 150, 200 ms
  - Medium 1–4: 250, 300, 350, 400 ms
  - Long 1–4: 450, 500, 550, 600 ms
  - Extra-long 1–4: 700, 800, 900, 1000 ms
  - "duration should increase as the area/traversal of an animation increases."
  [fetched] https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md
- **Easing tokens:**
  - Standard: cubic-bezier(0.2, 0, 0, 1)
  - Standard decelerate: (0, 0, 0, 1)
  - Standard accelerate: (0.3, 0, 1, 1)
  - Emphasized decelerate: (0.05, 0.7, 0.1, 1)
  - Emphasized accelerate: (0.3, 0, 0.8, 0.15)
  - Decelerate curves are for elements that enter, accelerate curves for elements that exit, and standard or emphasized for elements that start and end on screen.
  [fetched] same URL
- **Springs** (newer physics system), same doc:
  - Default spatial: damping 0.9, stiffness 700, for "animations that partially cover the screen like a bottom sheet".
  - Fast spatial: damping 0.9, stiffness 1400.
  - Slow spatial: damping 0.9, stiffness 300.
  - Effects springs, for "color or opacity" with no overshoot: damping 1, stiffness 3800 (fast), 1600 (default) and 800 (slow).
  [fetched] https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md
- **Bottom-sheet easing.** A bottom sheet "enters with Emphasized decelerate and exits permanently with Emphasized accelerate". The suggested pairs are:
  - emphasized decelerate 400 ms to enter, emphasized accelerate 200 ms to exit;
  - standard decelerate 250 ms to enter, standard accelerate 200 ms to exit.
  Exits are shorter because they need less attention. "Don't fade a bottom sheet as it enters and exits". The page also marks easing and duration as legacy, replaced by springs. [index] https://m3.material.io/styles/motion/easing-and-duration
- **Reduced motion.** With the platform setting on, transitions should "Use subtle fades instead of intense sliding or scaling animations" and "Disable decorative effects like parallax or shape morphing". [index] https://m3.material.io/styles/motion/transitions/applying-transitions

---

## Patterns with a documented basis

| Pattern | Source app or paper | Documented behaviour | URL |
|---|---|---|---|
| Chrome hidden; tap page (centre) to show | Apple Books, Kobo | Books: "tap the page to display" the Menu. Kobo: "tap the middle of the screen" | https://support.apple.com/guide/iphone/read-books-iphc1af7c57/ios , https://help.kobo.com/hc/en-us/articles/360017708154 |
| Right/left margin tap + swipe to turn | Apple Books, Kobo, Readwise | Right advances, left goes back; swipe also works (Books, Kobo) | https://help.kobo.com/hc/en-us/articles/360017708194-Turn-pages-and-skip-chapters-in-your-book-on-the-Kobo-Books-app-iOS-Android |
| Page animation is a user choice | Apple Books, Kobo, Moon+ | Books: Page Turn option; Kobo: Page Transition; Moon+: 5 animations | https://help.kobo.com/hc/en-us/articles/360017865293-Adjust-page-margins-line-spacing-and-more-on-the-Kobo-Books-app-iOS-Android |
| One appearance sheet holds theme + size | Apple Books, Kobo, Readwise, Kindle | Books: Themes & Settings; Readwise: Aa, 1 tap; Kindle: Aa > Font tab [index] | https://docs.readwise.io/reader/docs/faqs/appearance |
| Pinch to resize text | Kobo, Reedy | Pinch opens the size menu (Kobo); pinch-to-zoom text (Reedy) | https://help.kobo.com/hc/en-us/articles/360017708154 , https://reedy-reader.com/ |
| Return-to-where-I-was after a jump | Apple Books, Kobo, Readwise | Undo Page Skip (Books); bottom-left arrow, shown only after a jump (Kobo); "Return to [X]%" (Readwise) | https://docs.readwise.io/reader/docs/faqs |
| Furthest-read kept apart from last location | Readwise, Kindle | Readwise tracks both; Kindle syncs "furthest page read" [index] | https://docs.readwise.io/reader/docs/faqs |
| Auto-save place on close | Apple Books, Kobo | "your place is saved automatically" | https://support.apple.com/guide/iphone/read-books-iphc1af7c57/ios |
| EPUB import in 2 taps or via share sheet | Readwise | "+" > Upload a file; iOS "Save File to Reader" | https://docs.readwise.io/reader/docs/faqs/adding-new-content |
| Tap anywhere to play/pause RSVP | Reedy | "Touch the screen to play or pause." | https://reedy-reader.com/ |
| Hardware/volume keys adjust RSVP speed | Reedy | "use volume buttons for quick speed adjusting" | https://reedy-reader.com/ |
| Full-text context shown on pause | Reedy | "Quick preview of the full text … during a pause" | https://reedy-reader.com/ |
| Sentence-level navigation in RSVP | Reedy | "Press and hold to navigate through sentences" | https://reedy-reader.com/ |
| ORP by word length | Spritz patent; OVP literature | 1/2–5/6–9/10–13/14+ chars give 1st/2nd/3rd/4th/5th letter, punctuation excluded; OVP is "between the beginning and middle" | https://patents.google.com/patent/US8903174B2/en |
| wpm setting normalised to true average | Spritz patent | Base time = setting / average multiplier | https://patents.google.com/patent/US8903174B2/en |
| Long-word multiplier | Spritz patent | 1.0 (≤7), 1.3 (>7), 1.6 (>13) | https://patents.google.com/patent/US8903174B2/en |
| Sentence-end blank scaled by sentence length | Spritz patent | 1.0 / 2.2 / 3.3 | https://patents.google.com/patent/US8903174B2/en |
| Clause/punctuation pauses | Castelhano & Muter 2001; Rayner et al. 2000 | Improve preference; clause-final words get longer gazes (no RSVP numbers) | https://api.openalex.org/works/doi:10.1080/01449290110069400 |
| Ramp-up at start | Spritz patent, Reedy | "ramp from a lower speed at the start"; "gradual acceleration" (no numbers) | https://reedy-reader.com/ |
| Keep default about 250–350 wpm | Di Nocera et al. 2018; Ricciardi & Di Nocera 2017 | No comprehension loss at 250–350 wpm; loss above 250 wpm in the 2017 reply [index] | https://www.inderscienceonline.com/doi/abs/10.1504/IJHFE.2018.096118 |
| Allow going back | Schotter et al. 2014 | Blocking regressions hurts comprehension | https://api.openalex.org/works/doi:10.1177/0956797614531148 |
| Sheet: grabber, swipe-down dismiss, medium detent | Apple HIG | As quoted; no durations | https://developer.apple.com/design/human-interface-guidelines/sheets |
| Enter decelerate / exit accelerate; exit shorter | Material 3 | 400 ms in / 200 ms out (emphasized) [index]; tokens 50–1000 ms | https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md |
| Bottom-sheet spring; fades use no-overshoot spring | Material 3 | Spatial damping 0.9, stiffness 700; effects damping 1, stiffness 1600 | https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md |
| Reduced motion: replace slides with fades | Apple HIG, Material 3 | HIG: replace x/y/z transitions with fades; M3: "subtle fades" [index] | https://developer.apple.com/design/human-interface-guidelines/accessibility |
| Avoid motion on frequent interactions | Apple HIG | "avoid adding motion to UI interactions that occur frequently" | https://developer.apple.com/design/human-interface-guidelines/motion |

## Could not verify

- **Kindle app:** tap zones, centre-tap behaviour, page-turn animation options and default. No reachable Amazon page covers the phone app (help pages returned 503); third-party guides only.
- **Apple Books:** the current list of page-turn styles and the default. The current guide does not name them; "Curl, Fast Fade, Scroll" appears only in the iPad guide's indexed text.
- **Auto-hide timers:** none of the five apps documents an auto-hide for reading chrome.
- **Kobo Page Transition:** the style names and default.
- **Moon+ Reader:** default tap zones and default page animation. The Play listing text could not be rendered.
- **Spritz:** default wpm, speed step size, rewind behaviour and context on pause. Official FAQ pages were not reachable.
- **Reedy:** default wpm, speed step size, smart-slowing multipliers, ramp values, and whether exit maps to the current word.
- **RSVP-to-page word mapping:** no RSVP product documents returning to the exact word on exit.
- **Paragraph pause, digit pause, clause multiplier:** no source gives numbers for GlyphQ's 2.8, 1.4 or 1.8.
- **Ramp-up after resume:** no peer-reviewed evidence found.
- **Neighbour words in RSVP:** no comprehension study compares single-word RSVP against dimmed neighbours at the same rate.
- **Benedetto 2015 blink figures:** blink counts and statistics were not retrievable (abstract only, via index).
- **O'Regan & Jacobs 1992 per-letter cost:** the "20 ms per letter" figure was seen only in secondary citations.
- **Material 3 bottom-sheet pairs and reduced-motion text:** m3.material.io pages are JS-rendered, so these come from indexed text only.
- **Apple HIG:** publishes no durations or easing for sheets or fades.
