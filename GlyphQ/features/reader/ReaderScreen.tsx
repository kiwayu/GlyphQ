import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  AppState,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ReaderWebView,
  type ReaderWebViewHandle,
  type WebViewMessageEvent,
} from "@/components/ReaderWebView";
import { buildReaderHtml, type ReaderSettings } from "./readerHtml";
import { READER_THEMES } from "./readerThemes";
import {
  loadReaderSettings,
  saveReaderSettings,
  loadLocations,
  saveLocations,
  toReaderSettings,
} from "./readerPrefs";
import AppearanceSheet from "./AppearanceSheet";
import ContentsSheet, { type TocItem } from "./ContentsSheet";
import {
  startSession,
  endSession,
  updateProgress,
  getProgress,
  setRsvpWordIndex,
} from "@/services/readingTracker";
import { loadPrefs, savePrefs } from "@/services/preferences";
import RsvpOverlay from "./rsvp/RsvpOverlay";
import { tokenizeParagraphs, type Token } from "./rsvp/engine";
import { classifyGesture, SWIPE_MIN } from "./tapZones";
import { nextCaretState, startIndexFor, type CaretState } from "./caretState";
import {
  addBookmark,
  deleteBookmark,
  getBookmarksForBook,
  type Bookmark,
} from "@/services/bookmarks";
import { writeReaderHtmlFile, readAccessRoot, toReadableUrl } from "@/services/localEpub";
import { hasCover, saveCover } from "@/services/epubCover";
import { applyEpubMeta } from "@/services/epubMeta";
import { useLibraryStore } from "@/store/libraryStore";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { t, getThemeId, isThemeDark } from "@/theme";

interface ReaderScreenProps {
  bookId:  number;
  epubUrl: string;
  title?:  string;
  onClose?: () => void;
}

/* Position is written this long after the last page turn, and at once when
   the app is backgrounded or the book is closed. */
const SAVE_DEBOUNCE = 800;
/* The "back to page N" pill survives this many page turns after a jump. */
const RETURN_TURNS = 3;
const RSVP_MARK = "⚡ Speed reading";

/* What is on screen over the page. One value, so two layers can never be up
   at once and "is anything open" is not a five-way boolean test. */
type Chrome = "hidden" | "bars" | "appearance" | "contents";

const BAR_IN = FadeIn.duration(150);
const BAR_OUT = FadeOut.duration(100);

const appPalette = () => ({
  bg: t.color.bg.base,
  fg: t.color.text.primary,
  link: t.color.accent.base,
});

function minutesLeftLabel(currentPage: number, totalPages: number): string {
  if (!totalPages || !currentPage) return "";
  const mins = Math.round(Math.max(0, totalPages - currentPage) * 1.2);
  if (mins < 1) return "< 1 min left";
  if (mins < 60) return `${mins} min left`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m left` : `${h}h left`;
}

export default function ReaderScreen({ bookId, epubUrl, title, onClose }: ReaderScreenProps) {
  const webViewRef      = useRef<ReaderWebViewHandle>(null);
  const saveTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef  = useRef<{ cfi: string; pct: number; page: number } | null>(null);
  const sessionIdRef    = useRef<number | null>(null);
  const startPageRef    = useRef<number>(0);
  const latestPageRef   = useRef<number>(0);
  const htmlRef         = useRef<string | null>(null);
  const coverTriedRef   = useRef(false);
  const cfiRef          = useRef<string | null>(null);
  const chapterRef      = useRef("");
  const rsvpMarkerRef   = useRef(false); // next currentCfi drops a speed-read marker
  /* Where speed reading should start, and whether that choice is still valid.
     Lifecycle lives in caretState.ts so it can be tested; this ref is just
     the current value. */
  const caretRef        = useRef<CaretState>(null);
  const caretTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── gesture phase machine ──────────────────────────
     One phase instead of a pile of booleans. The bug this replaces existed
     because release could not see what move had decided.

                        ┌──────────┐
          touch down    │          │   release (no travel)
       ┌───────────────▶│ TRACKING │──────────────▶ score from ORIGIN
       │                └────┬─────┘                (classifyGesture)
    ┌──┴───┐                 │
    │ IDLE │◀────┐   400ms held without moving ──▶ ┌────────┐
    └──────┘     │                                 │ CARET  │──▶ commit index
       ▲         │   |dx| > SWIPE_MIN ───────────▶ ┌────────┐
       │         │   and |dx| > |dy|               │SWIPING │──▶ direction wins
       │         └─────────────────────────────────└────────┘
       └── terminate, or a second finger at any point → abort, no action    */
  const phaseRef        = useRef<"idle" | "tracking" | "swiping" | "caret">("idle");
  const originRef       = useRef<{ x: number; y: number } | null>(null);
  const multiTouchRef   = useRef(false);

  const [htmlReady,    setHtmlReady]    = useState(false);
  /* file:// URI of the written reader HTML when the book is a local file
     (iOS WKWebView cannot XHR file:// from an HTML-string origin — Spike #0) */
  const [sourceUri,    setSourceUri]    = useState<string | null>(null);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  /* Starts as the saved-settings defaults so the first frame has the right
     background; replaced by what is actually saved before the page loads. */
  const [settings,     setSettings]     = useState<ReaderSettings>(() =>
    toReaderSettings(
      { readerFont: "Georgia", readerFontSize: 17, readerTheme: "light", readerMatchApp: true, readerLineHeight: 1.6, readerMargin: 20 },
      appPalette(),
      isThemeDark(getThemeId())
    )
  );
  const settingsRef     = useRef(settings);
  const [chrome,       setChrome]       = useState<Chrome>("hidden");
  const [toc,          setToc]          = useState<TocItem[]>([]);
  const [chapter,      setChapter]      = useState("");
  const [percentage,   setPercentage]   = useState(0);
  const [currentPage,  setCurrentPage]  = useState(0);
  const [totalPages,   setTotalPages]   = useState(0);
  const [chapterPage,  setChapterPage]  = useState(0);
  const [chapterPages, setChapterPages] = useState(0);
  const [cfi,          setCfi]          = useState<string | null>(null);
  const [bookmarks,    setBookmarks]    = useState<Bookmark[]>([]);
  /* Set by any jump (contents, bookmark, scrubber): where the reader was. */
  const [returnTo,     setReturnTo]     = useState<{ cfi: string; page: number } | null>(null);
  const turnsSinceJumpRef = useRef(0);

  /* ── Seek slider (jump to any page) ── */
  const [seeking,      setSeeking]      = useState(false);
  const [seekPct,      setSeekPct]      = useState(0);
  const seekWidthRef    = useRef(0);

  /* ── RSVP speed reading ── */
  const [showRsvp,      setShowRsvp]      = useState(false);
  const [rsvpTokens,    setRsvpTokens]    = useState<Token[]>([]);
  const rsvpTokensRef   = useRef<Token[]>([]);
  const [rsvpChapter,   setRsvpChapter]   = useState("");
  const [rsvpWpm,       setRsvpWpm]       = useState(300);
  const rsvpStartIdxRef = useRef(0);
  /* Bumped per chapter load so the overlay remounts: a fresh mount is exactly
     "paused at word 0 of the new chapter" with no extra reset plumbing. */
  const [rsvpEpoch,     setRsvpEpoch]     = useState(0);
  /* Mirrors showRsvp for the message handler and the progress writer, which
     both run outside React's render and would otherwise read a stale value. */
  const showRsvpRef     = useRef(false);
  /* Set when the current tokens arrived from an advance: the overlay holds this
     label in the word slot, then resumes on its own. Cleared on a normal open. */
  const [rsvpIntro,     setRsvpIntro]     = useState<string | undefined>();
  const [rsvpAdvancing, setRsvpAdvancing] = useState(false);
  const [rsvpEndOfBook, setRsvpEndOfBook] = useState(false);
  /* True from close until the close-time seek reports back. The seek is a real
     navigation, so progress writes during it must not clear the resume pointer. */
  const rsvpSeekingRef  = useRef(false);
  /* Guards against a second nextChapter() while one is still walking the spine
     (the overlay stays interactive during the async window). */
  const advancingRef    = useRef(false);
  /* Words streamed this session, accumulated ACROSS chapter advances — the
     per-chapter token array is discarded on every advance. */
  const rsvpWordsRef    = useRef(0);
  const rsvpSessionRef  = useRef<number | null>(null);
  /* Chapter the current tokens came from, and the one the saved pointer belongs
     to. A bare word index is ambiguous now that a session crosses chapters. */
  const rsvpHrefRef     = useRef<string | null>(null);
  const savedRsvpHrefRef = useRef<string | null>(null);

  useEffect(() => {
    loadPrefs().then((p) => setRsvpWpm(p.rsvpWpm ?? 300));
  }, []);

  useEffect(() => { showRsvpRef.current = showRsvp; }, [showRsvp]);

  /* ── HTML built once, from saved position, appearance and page numbers ── */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [row, saved, locations, readable] = await Promise.all([
        getProgress(bookId),
        loadReaderSettings(appPalette(), isThemeDark(getThemeId())),
        loadLocations(bookId),
        toReadableUrl(epubUrl),
      ]);
      if (cancelled) return;
      rsvpStartIdxRef.current = row?.rsvp_word_index ?? 0;
      savedRsvpHrefRef.current = row?.rsvp_href ?? null;
      const savedPage = row?.current_page ?? 0;
      if (savedPage) {
        startPageRef.current  = savedPage;
        latestPageRef.current = savedPage;
        setCurrentPage(savedPage);
        setPercentage(row?.percentage ?? 0);
      }
      settingsRef.current = saved;
      setSettings(saved);
      const html = buildReaderHtml(readable, row?.cfi ?? null, saved, locations);
      htmlRef.current = html;
      /* Local files load via a file:// HTML document (same documentDirectory
         tree) so epub.js can XHR the book on iOS. Remote URLs keep the
         HTML-string path. */
      let uri: string | null = null;
      if (epubUrl.startsWith("file://")) {
        try {
          uri = await writeReaderHtmlFile(html);
        } catch {
          uri = null; // fall back to HTML-string source
        }
      }
      if (!cancelled) {
        setSourceUri(uri);
        setHtmlReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [bookId, epubUrl]);

  useEffect(() => {
    getBookmarksForBook(bookId).then(setBookmarks);
  }, [bookId]);

  /* ── Session management ─────────────────────────── */

  const finishSession = useCallback(() => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    const pagesRead = Math.max(0, latestPageRef.current - startPageRef.current);
    endSession(sid, pagesRead);
    sessionIdRef.current = null;
  }, []);

  /* ── Progress saving ────────────────────────────── */

  /* Write the pending position now. Called by the debounce timer, and directly
     when the app is backgrounded or the book closes: the timer alone lost the
     last page turn whenever either happened inside the debounce window. */
  const flushProgress = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    const pending = pendingSaveRef.current;
    if (!pending) return;
    pendingSaveRef.current = null;
    /* Speed reading drives real navigations (chapter advance, close-time
       seek). Those must not clear the RSVP resume pointer — D16 clears it
       when NORMAL reading resumes, and neither of these is that. */
    const inRsvp = showRsvpRef.current || rsvpSeekingRef.current;
    await updateProgress(bookId, pending.page, pending.pct, pending.cfi, inRsvp);
    /* Nor should they rotate the page-reading session: the spine walk fires
       several of these, which would scatter one RSVP session across rows
       and inflate pages_read with synthetic jumps. */
    if (inRsvp) return;
    const pagesRead = Math.max(0, pending.page - startPageRef.current);
    if (sessionIdRef.current && pagesRead > 0) {
      await endSession(sessionIdRef.current, pagesRead);
      sessionIdRef.current = await startSession(bookId);
      startPageRef.current = pending.page;
    }
  }, [bookId]);

  const saveProgressSoon = useCallback(
    (at: string, pct: number, page: number) => {
      latestPageRef.current = page;
      pendingSaveRef.current = { cfi: at, pct, page };
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(flushProgress, SAVE_DEBOUNCE);
    },
    [flushProgress]
  );

  useEffect(() => {
    startSession(bookId).then((id) => { sessionIdRef.current = id; });
    return () => {
      flushProgress().then(finishSession);
      if (caretTimerRef.current) clearTimeout(caretTimerRef.current);
    };
  }, [bookId, finishSession, flushProgress]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        flushProgress().then(finishSession);
      } else if (state === "active" && !sessionIdRef.current) {
        startPageRef.current = latestPageRef.current;
        startSession(bookId).then((id) => { sessionIdRef.current = id; });
      }
    });
    return () => sub.remove();
  }, [bookId, finishSession, flushProgress]);

  /* Every gesture ends here, including interrupted ones. Clearing the origin
     matters: it decides which page turn fires, so a stale one from an aborted
     touch would score the next gesture. */
  const resetGesture = useCallback(() => {
    phaseRef.current = "idle";
    originRef.current = null;
    multiTouchRef.current = false;
  }, []);

  const inject = useCallback(
    (js: string) => webViewRef.current?.injectJavaScript(js + ";true;"),
    []
  );

  /* ── Appearance ─────────────────────────────────── */

  /* A change applies to the page at once and becomes the saved default, so
     the next book opens the way this one was left. */
  const updateSettings = useCallback(
    (patch: Partial<ReaderSettings>) => {
      const next = { ...settingsRef.current, ...patch };
      settingsRef.current = next;
      setSettings(next);
      inject(`window.readerApi.applySettings(${JSON.stringify(JSON.stringify(next))})`);
      saveReaderSettings(next);
    },
    [inject]
  );

  /* ── Navigation ─────────────────────────────────── */

  const turn = useCallback(
    (dir: "next" | "prev") => {
      inject(dir === "next" ? "window.readerApi.nextPage()" : "window.readerApi.prevPage()");
      setChrome("hidden");
      if (++turnsSinceJumpRef.current >= RETURN_TURNS) setReturnTo(null);
    },
    [inject]
  );

  /* Any jump away from the page being read remembers that page, so one tap
     brings the reader back (contents, a bookmark, or the scrubber). */
  const jump = useCallback(
    (js: string) => {
      if (cfiRef.current) {
        setReturnTo({ cfi: cfiRef.current, page: latestPageRef.current });
        turnsSinceJumpRef.current = 0;
      }
      inject(js);
      setChrome("hidden");
    },
    [inject]
  );

  const goBack = useCallback(() => {
    if (!returnTo) return;
    inject(`window.readerApi.goToCfi(${JSON.stringify(returnTo.cfi)})`);
    setReturnTo(null);
  }, [inject, returnTo]);

  /* Drag the progress bar to jump to any page. locationX is relative to the
     seek track (no horizontal padding), so x/width == fraction read. */
  const onSeekTouch = useCallback((x: number) => {
    const w = seekWidthRef.current;
    if (w > 0) setSeekPct(Math.max(0, Math.min(1, x / w)));
  }, []);

  const commitSeek = useCallback(() => {
    setSeeking(false);
    jump(`window.readerApi.goToPercentage(${seekPct})`);
  }, [jump, seekPct]);

  /* ── Bookmarks ─────────────────────────────────── */

  const isBookmarked = !!cfi && bookmarks.some((b) => b.cfi === cfi);

  /* A bookmark is named after the chapter it is in: early pages of a book can
     all be "page 1", and a list of those says nothing. */
  const handleToggleBookmark = useCallback(async () => {
    const at = cfiRef.current;
    if (!at) return;
    const existing = (await getBookmarksForBook(bookId)).find((b) => b.cfi === at);
    if (existing) await deleteBookmark(existing.id);
    else await addBookmark(bookId, at, chapterRef.current || undefined, latestPageRef.current || undefined);
    setBookmarks(await getBookmarksForBook(bookId));
  }, [bookId]);

  const handleDeleteBookmark = useCallback(
    async (id: number) => {
      await deleteBookmark(id);
      setBookmarks(await getBookmarksForBook(bookId));
    },
    [bookId]
  );

  /* ── Speed reading (RSVP) ──────────────────────── */

  const openRsvp = useCallback(() => {
    setChrome("hidden");
    rsvpWordsRef.current = 0;
    setRsvpIntro(undefined);
    setRsvpAdvancing(false);
    setRsvpEndOfBook(false);
    // Speed reading gets its own session row so its words and WPM are not
    // averaged into page reading (and vice versa).
    startSession(bookId, "rsvp").then((id) => { rsvpSessionRef.current = id; });
    // Pull the current chapter's text; handler opens the overlay on reply.
    inject("window.readerApi.getChapterText()");
  }, [inject, bookId]);

  /* Chapter finished: walk the book itself to the next one and pull its text.
     The reply arrives as a chapterText message flagged `advanced`. The guard
     matters because the overlay stays interactive while the walk runs: a
     second finish would start a concurrent walk and skip a chapter. */
  const advanceRsvp = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setRsvpAdvancing(true);   // overlay says "Next chapter…", transport disabled
    inject("window.readerApi.nextChapter()");
  }, [inject]);

  /* End of book: go back to the chapter just finished rather than closing. */
  const backToLastChapter = useCallback(() => {
    setRsvpEndOfBook(false);
    rsvpStartIdxRef.current = 0;
    setRsvpEpoch((n) => n + 1);
  }, []);

  const closeRsvp = useCallback(
    (lastIndex: number) => {
      const tokens = rsvpTokensRef.current;
      setShowRsvp(false);
      showRsvpRef.current = false;
      advancingRef.current = false;
      setRsvpAdvancing(false);
      setRsvpEndOfBook(false);
      setRsvpIntro(undefined);
      const hadTokens = tokens.length > 0;
      if (hadTokens) {
        /* Cancel any advance still walking the spine FIRST. Without this its
           display() resolves after our seek and drags the book a chapter
           forward — the exact bug this whole feature exists to prevent. */
        rsvpSeekingRef.current = true;
        inject("window.readerApi.cancelAdvance()");
        /* Leave the page on the word where speed reading stopped, not where it
           was when the overlay opened. A token carries the text block it came
           from and its word within that block; the page turns to that word and
           marks it for a moment. */
        const stop = tokens[Math.min(lastIndex, tokens.length - 1)];
        rsvpMarkerRef.current = true;
        inject(`window.readerApi.goToBlock(${stop.paragraphIndex},${stop.sourceWord})`);
      }
      // Close the RSVP session with everything streamed across all chapters.
      const words = rsvpWordsRef.current + (hadTokens ? lastIndex + 1 : 0);
      const sid = rsvpSessionRef.current;
      if (sid) {
        endSession(sid, 0, { wordsRead: words, wpmLast: rsvpWpm });
        rsvpSessionRef.current = null;
      }
      rsvpTokensRef.current = [];
      setRsvpTokens([]);
      rsvpWordsRef.current = 0;
      // Persist resume pointer (clamped to a real word, scoped to its chapter)
      // and remember the speed.
      const stopHref = rsvpHrefRef.current;
      savedRsvpHrefRef.current = hadTokens ? stopHref : null;
      rsvpStartIdxRef.current = hadTokens ? lastIndex : 0;
      setRsvpWordIndex(bookId, hadTokens ? lastIndex : null, stopHref);
      savePrefs({ rsvpWpm });
    },
    [bookId, rsvpWpm, inject]
  );

  /* ── Message handler ────────────────────────────── */

  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        switch (msg.type) {
          case "ready":
            // Enrich the library once per open: fill missing author/metadata
            // and grab the cover if the book has none yet.
            if (!coverTriedRef.current) {
              coverTriedRef.current = true;
              inject("window.readerApi.extractMeta()");
              if (!(await hasCover(bookId))) {
                inject("window.readerApi.extractCover()");
              }
            }
            break;
          case "meta":
            if (await applyEpubMeta(bookId, msg)) {
              await useLibraryStore.getState().loadLibrary();
            }
            break;
          case "cover":
            if (msg.dataUrl && (await saveCover(bookId, msg.dataUrl))) {
              await useLibraryStore.getState().loadLibrary();
            }
            break;
          case "caret":
            if (typeof msg.wordIndex === "number") {
              caretRef.current = nextCaretState(caretRef.current, {
                type: "placed",
                index: msg.wordIndex,
                href: msg.href ?? null,
              });
            }
            break;
          case "tocLoaded":
            setToc(msg.toc ?? []);
            break;
          case "locationsGenerated":
            setTotalPages(msg.totalPages ?? 0);
            // A freshly generated set is cached so the next open skips the work.
            if (typeof msg.locations === "string") saveLocations(bookId, msg.locations);
            break;
          case "locationChanged":
            cfiRef.current = msg.cfi ?? null;
            setCfi(msg.cfi ?? null);
            setPercentage(msg.percentage ?? 0);
            setCurrentPage(msg.currentPage ?? 0);
            setChapterPage(msg.chapterPage ?? 0);
            setChapterPages(msg.chapterPages ?? 0);
            setChapter(msg.chapter ?? "");
            chapterRef.current = msg.chapter ?? "";
            /* A caret picked in another chapter is meaningless here. Without
               this, an abandoned pick silently hijacked the next RSVP open. */
            caretRef.current = nextCaretState(caretRef.current, {
              type: "chapterChanged",
              href: msg.href ?? null,
            });
            if (startPageRef.current === 0 && msg.currentPage > 0) {
              startPageRef.current = msg.currentPage;
            }
            if (msg.cfi) {
              saveProgressSoon(msg.cfi, msg.percentage ?? 0, msg.currentPage ?? 0);
            }
            break;
          case "currentCfi": {
            /* Only the close-time seek of speed reading asks for this now. The
               seek has landed: normal reading resumes from here, so later
               progress writes may clear the pointer again. */
            if (!rsvpMarkerRef.current) break;
            rsvpMarkerRef.current = false;
            rsvpSeekingRef.current = false;
            if (!msg.cfi) break;
            /* One marker per book: it says where speed reading last stopped,
               so the previous one is replaced rather than piling up. */
            const old = (await getBookmarksForBook(bookId)).filter((b) => b.label === RSVP_MARK);
            await Promise.all(old.map((b) => deleteBookmark(b.id)));
            await addBookmark(bookId, msg.cfi, RSVP_MARK, latestPageRef.current || undefined);
            setBookmarks(await getBookmarksForBook(bookId));
            break;
          }
          case "chapterText": {
            /* An advance that was cancelled by closing still posts its reply.
               Applying it would resurrect the overlay's tokens after close. */
            if (msg.advanced && !showRsvpRef.current) {
              advancingRef.current = false;
              break;
            }
            if (msg.advanced) {
              advancingRef.current = false;
              setRsvpAdvancing(false);
              // Bank the finished chapter before its tokens are replaced.
              rsvpWordsRef.current += rsvpTokensRef.current.length;
            }
            if (msg.endOfBook) {
              advancingRef.current = false;
              setRsvpAdvancing(false);
              /* Finishing a book is the one moment worth marking. It gets the
                 word slot and two real choices, not an OS dialog thrown over an
                 immersive reader with a ↻ that would replay the last chapter. */
              setRsvpEndOfBook(true);
              break;
            }
            const paragraphs: string[] = Array.isArray(msg.paragraphs) ? msg.paragraphs : [];
            const tokens = tokenizeParagraphs(paragraphs);
            rsvpTokensRef.current = tokens;
            setRsvpTokens(tokens);
            setRsvpChapter(msg.chapter || "");
            rsvpHrefRef.current = msg.href ?? null;
            if (msg.advanced) {
              /* Auto-advanced past a chapter end. The overlay remounts at word
                 0 and holds the label before resuming; a chapter with no
                 resolvable title skips the hold rather than showing a blank. */
              rsvpStartIdxRef.current = 0;
              const label =
                msg.chapter ||
                (typeof msg.spineIndex === "number" ? `Chapter ${msg.spineIndex}` : "");
              setRsvpIntro(label || undefined);
              setRsvpEpoch((n) => n + 1);
              break;
            }
            // A normal open holds nothing: the reader chose to be here.
            setRsvpIntro(undefined);
            /* Where to start, most specific first:
                 1. a word the reader picked with the caret in THIS chapter
                    (word 0 is a legitimate pick, so "nothing picked" is null);
                 2. the word speed reading last stopped on, if it is in this
                    chapter and the reader has not paged away since;
                 3. the first word of the page on screen.
               None of them asks a question first. */
            const caretStart = startIndexFor(caretRef.current, msg.href ?? null, tokens.length);
            caretRef.current = nextCaretState(caretRef.current, {
              type: caretStart !== null ? "consumed" : "abandoned",
            });
            const saved = rsvpStartIdxRef.current;
            const savedHref = savedRsvpHrefRef.current;
            const canResume =
              saved > 0 && saved < tokens.length && (!savedHref || savedHref === msg.href);
            const at = msg.pageStart as { block: number; word: number } | null;
            const pageStart = at
              ? tokens.findIndex(
                  (tk) =>
                    tk.paragraphIndex > at.block ||
                    (tk.paragraphIndex === at.block && tk.sourceWord >= at.word)
                )
              : -1;
            rsvpStartIdxRef.current =
              caretStart !== null ? caretStart : canResume ? saved : Math.max(0, pageStart);
            setShowRsvp(true);
            break;
          }
          case "error":
            setLoadError(typeof msg.message === "string" ? msg.message : "This book could not be opened.");
            break;
        }
      } catch {
        /* malformed message */
      }
    },
    [saveProgressSoon, bookId, inject]
  );

  /* ── Derived values ─────────────────────────────── */

  const insets = useSafeAreaInsets();
  const { width: winWidth } = useWindowDimensions();
  /* Chrome follows the page: the app palette when the book does, otherwise
     the named theme's own colours. */
  const named = READER_THEMES[settings.theme];
  const ui = settings.bg
    ? {
        bg: settings.bg,
        fg: t.color.text.primary,
        sub: t.color.text.tertiary,
        accent: t.color.accent.base,
        barBg: t.color.bg.raised,
        barBorder: t.color.border.default,
      }
    : named;
  const shownPct = seeking ? seekPct * 100 : Math.min(percentage, 100);
  const pageLabel = currentPage && totalPages ? `${currentPage} / ${totalPages}` : "";
  const chapterLeft = chapterPages
    ? `${Math.max(0, chapterPages - chapterPage)} left in chapter`
    : "";
  const pctLabel = percentage > 0 ? `${percentage.toFixed(totalPages ? 1 : 0)}%` : "";

  /* ── Render ─────────────────────────────────────── */

  if (loadError) {
    return (
      <View style={[s.root, s.errorRoot, { backgroundColor: ui.bg }]}>
        <Text style={[s.errorTitle, { color: ui.fg }]}>Can&apos;t open this book</Text>
        <Text style={[s.errorBody, { color: ui.sub }]}>{loadError}</Text>
        <Pressable style={[s.errorBtn, { borderColor: ui.accent }]} onPress={onClose} accessibilityRole="button">
          <Text style={[s.errorBtnText, { color: ui.accent }]}>Back to library</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: ui.bg }]}>
      {htmlReady && htmlRef.current && (
        <ReaderWebView
          ref={webViewRef}
          source={sourceUri ? { uri: sourceUri } : { html: htmlRef.current }}
          originWhitelist={["*"]}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          allowingReadAccessToURL={readAccessRoot()}
          mixedContentMode="always"
          // Keep the page inside the safe area; edge-to-edge Android
          // otherwise renders the book under the status/navigation bars.
          style={[s.webView, { marginTop: insets.top, marginBottom: insets.bottom }]}
        />
      )}

      {/* Tap zones — reliable native layer. In-WebView tap detection did
          not fire on Android (epub.js iframe), so the RN overlay owns taps:
          left third = back, right third = forward, middle = show or hide the
          controls. Long-press + drag places a caret to pick the speed-reading
          start word.
          ponytail: this layer takes every touch, so text in the book cannot be
          selected. Highlighting needs a selection path of its own before it
          can come back. */}
      {htmlReady && !showRsvp && (
        <View
          style={StyleSheet.absoluteFill}
          testID="reader-taps"
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            const { locationX, locationY, touches } = e.nativeEvent;
            phaseRef.current = "tracking";
            originRef.current = { x: locationX, y: locationY };
            multiTouchRef.current = (touches?.length ?? 1) > 1;
            if (caretTimerRef.current) clearTimeout(caretTimerRef.current);
            caretTimerRef.current = setTimeout(() => {
              phaseRef.current = "caret";
              inject(`window.readerApi.caretAt(${locationX}, ${locationY - insets.top})`);
            }, 400);
          }}
          onResponderMove={(e) => {
            const { locationX, locationY, touches } = e.nativeEvent;
            // Two fingers means the release position belongs to a different
            // finger than the origin, so the delta is meaningless. Latch it.
            if ((touches?.length ?? 1) > 1) multiTouchRef.current = true;

            if (phaseRef.current === "caret") {
              // Draw only — the word index is resolved once, on release.
              inject(`window.readerApi.caretAt(${locationX}, ${locationY - insets.top})`);
              return;
            }
            const origin = originRef.current;
            if (!origin) return;
            const dx = locationX - origin.x;
            const dy = locationY - origin.y;
            if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
              phaseRef.current = "swiping";
            }
            if ((Math.abs(dx) > 10 || Math.abs(dy) > 10) && caretTimerRef.current) {
              clearTimeout(caretTimerRef.current); // moved first → not a long-press
              caretTimerRef.current = null;
            }
          }}
          onResponderRelease={(e) => {
            const { locationX, locationY } = e.nativeEvent;
            if (caretTimerRef.current) clearTimeout(caretTimerRef.current);
            caretTimerRef.current = null;

            if (phaseRef.current === "caret") {
              // Resolve the word index now, once, rather than per move event.
              inject(`window.readerApi.caretCommit(${locationX}, ${locationY - insets.top})`);
              resetGesture();
              return;
            }
            const action = classifyGesture(
              originRef.current,
              { x: locationX, y: locationY },
              winWidth,
              multiTouchRef.current
            );
            resetGesture();
            if (action === "prev" || action === "next") turn(action);
            else if (action === "menu") setChrome((c) => (c === "hidden" ? "bars" : "hidden"));
            // "none" → a multi-touch gesture; deliberately do nothing.
          }}
          onResponderTerminate={() => {
            if (caretTimerRef.current) clearTimeout(caretTimerRef.current);
            caretTimerRef.current = null;
            resetGesture();
          }}
        />
      )}

      {/* Always-on progress line, under the page while the controls are away */}
      {chrome === "hidden" && (
        <View style={[s.footer, { paddingBottom: insets.bottom }]} pointerEvents="none">
          <View style={[s.progressTrack, { backgroundColor: ui.barBorder }]}>
            <View style={[s.progressFill, { backgroundColor: ui.accent, width: `${shownPct}%` as `${number}%` }]} />
          </View>
          <View style={s.statsRow}>
            <Text style={[s.statText, { color: ui.sub }]}>{pageLabel}</Text>
            <Text style={[s.statText, { color: ui.sub }]}>{chapterLeft}</Text>
            <Text style={[s.statText, { color: ui.sub }]}>{pctLabel}</Text>
          </View>
        </View>
      )}

      {/* After a jump: one tap back to where the reader was */}
      {returnTo && chrome === "hidden" && !showRsvp && (
        <Animated.View
          entering={BAR_IN}
          exiting={BAR_OUT}
          style={[s.returnWrap, { bottom: insets.bottom + 44 }]}
        >
          <Pressable
            onPress={goBack}
            style={[s.returnPill, { backgroundColor: ui.barBg, borderColor: ui.barBorder }]}
            accessibilityRole="button"
            testID="reader-return"
          >
            <IconSymbol name="arrow.counterclockwise" size={14} color={ui.accent} />
            <Text style={[s.returnText, { color: ui.fg }]}>
              {returnTo.page ? `Back to page ${returnTo.page}` : "Back to where you were"}
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Top bar */}
      {chrome === "bars" && (
        <Animated.View
          entering={BAR_IN}
          exiting={BAR_OUT}
          style={[s.topBar, { backgroundColor: ui.barBg, borderBottomColor: ui.barBorder, paddingTop: insets.top }]}
        >
          <View style={s.topBarInner}>
            <Pressable onPress={onClose} style={s.barBtn} accessibilityRole="button" accessibilityLabel="Back to library" hitSlop={6}>
              <IconSymbol name="chevron.left" size={24} color={ui.fg} />
            </Pressable>
            <Text style={[s.chapterTitle, { color: ui.fg }]} numberOfLines={1}>
              {chapter || title || ""}
            </Text>
            <Pressable
              onPress={handleToggleBookmark}
              style={s.barBtn}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={isBookmarked ? "Remove bookmark" : "Bookmark this page"}
              accessibilityState={{ selected: isBookmarked }}
              testID="reader-bookmark"
            >
              <IconSymbol
                name={isBookmarked ? "bookmark.fill" : "bookmark"}
                size={22}
                color={isBookmarked ? ui.accent : ui.fg}
              />
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* Bottom bar */}
      {chrome === "bars" && (
        <Animated.View
          entering={BAR_IN}
          exiting={BAR_OUT}
          style={[s.bottomBar, { backgroundColor: ui.barBg, borderTopColor: ui.barBorder, paddingBottom: insets.bottom }]}
        >
          {/* Progress track — draggable to jump to any page */}
          <View style={s.progressWrap}>
            <View
              style={s.seekHit}
              onLayout={(e) => { seekWidthRef.current = e.nativeEvent.layout.width; }}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => { setSeeking(true); onSeekTouch(e.nativeEvent.locationX); }}
              onResponderMove={(e) => onSeekTouch(e.nativeEvent.locationX)}
              onResponderRelease={commitSeek}
              onResponderTerminate={commitSeek}
              accessibilityRole="adjustable"
              accessibilityLabel="Position in book"
            >
              <View style={[s.progressTrack, { backgroundColor: ui.barBorder }]}>
                <View style={[s.progressFill, { backgroundColor: ui.accent, width: `${shownPct}%` as `${number}%` }]} />
              </View>
              <View style={[s.seekThumb, { backgroundColor: ui.accent, left: `${shownPct}%` as `${number}%` }]} />
            </View>
          </View>
          <View style={s.statsRow}>
            <Text style={[s.statText, { color: ui.sub }]}>
              {seeking && totalPages
                ? `→ ${Math.max(1, Math.round(seekPct * totalPages))} / ${totalPages}`
                : pageLabel}
            </Text>
            <Text style={[s.statText, { color: ui.sub }]}>
              {chapterLeft || minutesLeftLabel(currentPage, totalPages)}
            </Text>
            <Text style={[s.statText, { color: ui.sub }]}>{pctLabel}</Text>
          </View>

          <View style={s.actionRow}>
            <BarAction icon="list.bullet" label="Contents" color={ui.fg} onPress={() => setChrome("contents")} />
            <BarAction icon="textformat.size" label="Appearance" color={ui.fg} onPress={() => setChrome("appearance")} />
            <BarAction icon="bolt.fill" label="Speed read" color={ui.accent} onPress={openRsvp} />
          </View>
        </Animated.View>
      )}

      {chrome === "appearance" && (
        <AppearanceSheet
          settings={settings}
          appPalette={appPalette()}
          onChange={updateSettings}
          onClose={() => setChrome("hidden")}
        />
      )}

      {chrome === "contents" && (
        <ContentsSheet
          toc={toc}
          bookmarks={bookmarks}
          currentChapter={chapter}
          onGoToChapter={(href) => jump(`window.readerApi.goToChapter(${JSON.stringify(href)})`)}
          onGoToBookmark={(at) => jump(`window.readerApi.goToCfi(${JSON.stringify(at)})`)}
          onDeleteBookmark={handleDeleteBookmark}
          onClose={() => setChrome("hidden")}
        />
      )}

      {showRsvp && (
        <RsvpOverlay
          key={rsvpEpoch}
          tokens={rsvpTokens}
          initialWpm={rsvpWpm}
          startIndex={rsvpStartIdxRef.current}
          chapter={rsvpChapter}
          colors={{
            bg:     t.color.bg.base,
            fg:     t.color.text.primary,
            sub:    t.color.text.tertiary,
            accent: t.color.accent.base,
            barBg:  t.color.bg.raised,
            border: t.color.border.default,
          }}
          onWpmChange={setRsvpWpm}
          onFinish={advanceRsvp}
          introLabel={rsvpIntro}
          advancing={rsvpAdvancing}
          endOfBook={rsvpEndOfBook}
          bookTitle={title}
          onBackToChapter={backToLastChapter}
          onClose={closeRsvp}
        />
      )}
    </View>
  );
}

function BarAction({
  icon, label, color, onPress,
}: {
  icon: React.ComponentProps<typeof IconSymbol>["name"];
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.action, pressed && s.actionPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <IconSymbol name={icon} size={22} color={color} />
      <Text style={[s.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  webView: { flex: 1 },

  errorRoot: { alignItems: "center", justifyContent: "center", padding: t.space._8 },
  errorTitle: { ...t.font.title, marginBottom: t.space._2, textAlign: "center" },
  errorBody: { ...t.font.body, textAlign: "center", lineHeight: 22, marginBottom: t.space._6 },
  errorBtn: {
    borderWidth: 1.5,
    borderRadius: t.radius["2xl"],
    paddingHorizontal: t.space._6,
    paddingVertical: t.space._3,
  },
  errorBtnText: { fontSize: 15, fontWeight: "700" },

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.space._3,
    paddingVertical: t.space._2,
  },
  barBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  chapterTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginHorizontal: t.space._2,
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  /* always-on slim progress footer (no background: sits over the page edge) */
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: t.space._5,
    paddingTop: t.space._2,
  },
  progressWrap: { paddingHorizontal: t.space._5, paddingTop: t.space._2 },
  /* generous vertical grab area around the thin visual track */
  seekHit: { justifyContent: "center", paddingVertical: 14 },
  seekThumb: {
    position: "absolute",
    top: "50%",
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: -7,
    marginLeft: -7,
  },
  progressTrack: { height: 3, borderRadius: 1.5, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 1.5 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: t.space._5,
    paddingTop: 2,
    paddingBottom: 4,
  },
  statText: { fontSize: 11, fontWeight: "500" },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: t.space._4,
    paddingTop: t.space._2,
    paddingBottom: t.space._3,
  },
  action: {
    minWidth: 88,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: t.radius.xl,
    paddingHorizontal: t.space._3,
  },
  actionPressed: { opacity: 0.6 },
  actionLabel: { fontSize: 11, fontWeight: "600", marginTop: 3 },

  returnWrap: { position: "absolute", left: t.space._4 },
  returnPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space._2,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.space._4,
    paddingVertical: t.space._2,
    ...t.shadow.soft,
  },
  returnText: { fontSize: 13, fontWeight: "600" },
});
