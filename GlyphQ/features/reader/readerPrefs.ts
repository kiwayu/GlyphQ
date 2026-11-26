/*
 * What the reader remembers between opens.
 *
 * Appearance lives in app_settings, the same rows the Settings screen edits,
 * so a change made in a book is the new default everywhere:
 *
 *   readerMatchApp  true  -> paint the book in the app palette
 *                   false -> use the named readerTheme
 *   readerFont / readerFontSize / readerLineHeight / readerMargin
 *
 * Page numbers (epub.js "locations") take up to a minute to compute on a long
 * book, so the result is cached per book in AsyncStorage.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAllSettings, setMultipleSettings, type AppSettings } from "@/services/settings";
import { DEFAULT_SETTINGS, type ReaderFont, type ReaderSettings } from "./readerHtml";

export interface AppPalette {
  bg: string;
  fg: string;
  link: string;
}

const FONT_IDS: ReaderFont[] = ["georgia", "palatino", "charter", "system"];
const FONT_NAMES: Record<ReaderFont, string> = {
  georgia: "Georgia",
  palatino: "Palatino",
  charter: "Charter",
  system: "System",
};
/** The fonts the reader can show, as the Settings screen names them. */
export const READER_FONT_NAMES: string[] = FONT_IDS.map((id) => FONT_NAMES[id]);

/** Saved appearance as reader settings. Pure, so it can be tested. */
export function toReaderSettings(
  saved: Pick<
    AppSettings,
    "readerFont" | "readerFontSize" | "readerTheme" | "readerMatchApp" | "readerLineHeight" | "readerMargin"
  >,
  app: AppPalette,
  appIsDark: boolean
): ReaderSettings {
  const font = String(saved.readerFont ?? "").toLowerCase() as ReaderFont;
  return {
    theme: saved.readerMatchApp ? (appIsDark ? "dark" : "light") : saved.readerTheme,
    font: FONT_IDS.includes(font) ? font : DEFAULT_SETTINGS.font,
    fontSize: saved.readerFontSize || DEFAULT_SETTINGS.fontSize,
    lineHeight: saved.readerLineHeight || DEFAULT_SETTINGS.lineHeight,
    marginWidth: saved.readerMargin || DEFAULT_SETTINGS.marginWidth,
    bg: saved.readerMatchApp ? app.bg : null,
    fg: saved.readerMatchApp ? app.fg : null,
    link: saved.readerMatchApp ? app.link : null,
  };
}

/** The app_settings rows that hold these reader settings. Pure. */
export function toSavedSettings(s: ReaderSettings): Partial<AppSettings> {
  return {
    readerMatchApp: !!s.bg,
    readerTheme: s.theme,
    readerFont: FONT_NAMES[s.font],
    readerFontSize: s.fontSize,
    readerLineHeight: s.lineHeight,
    readerMargin: s.marginWidth,
  };
}

export async function loadReaderSettings(app: AppPalette, appIsDark: boolean): Promise<ReaderSettings> {
  return toReaderSettings(await getAllSettings(), app, appIsDark);
}

export async function saveReaderSettings(s: ReaderSettings): Promise<void> {
  await setMultipleSettings(toSavedSettings(s));
}

const locationsKey = (bookId: number) => `reader_locations_v1:${bookId}`;

export async function loadLocations(bookId: number): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(locationsKey(bookId));
  } catch {
    return null;
  }
}

export async function saveLocations(bookId: number, locations: string): Promise<void> {
  try {
    await AsyncStorage.setItem(locationsKey(bookId), locations);
  } catch {
    /* a failed cache write only costs the next open its head start */
  }
}
