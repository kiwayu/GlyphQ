/*
 * The reader's saved appearance: what the Settings screen stores must come
 * back as the same page, and a change made in a book must store as the same
 * rows the Settings screen edits.
 */
import { toReaderSettings, toSavedSettings } from "../readerPrefs";

jest.mock("@/services/settings", () => ({}));
jest.mock("@react-native-async-storage/async-storage", () => ({}));

const app = { bg: "#101010", fg: "#eeeeee", link: "#88aaff" };
const saved = {
  readerFont: "Palatino",
  readerFontSize: 20,
  readerTheme: "sepia" as const,
  readerMatchApp: false,
  readerLineHeight: 1.8,
  readerMargin: 32,
};

describe("reader appearance", () => {
  it("opens with the saved font, size, spacing, margin and theme", () => {
    expect(toReaderSettings(saved, app, true)).toEqual({
      theme: "sepia",
      font: "palatino",
      fontSize: 20,
      lineHeight: 1.8,
      marginWidth: 32,
      bg: null,
      fg: null,
      link: null,
    });
  });

  it("paints the app palette when the reader follows the app theme", () => {
    const s = toReaderSettings({ ...saved, readerMatchApp: true }, app, true);
    expect(s).toMatchObject({ theme: "dark", bg: "#101010", fg: "#eeeeee", link: "#88aaff" });
  });

  it("falls back to Georgia for a font the reader does not have", () => {
    expect(toReaderSettings({ ...saved, readerFont: "Comic Sans" }, app, false).font).toBe("georgia");
  });

  it("survives a save and a load unchanged", () => {
    const s = toReaderSettings(saved, app, false);
    const rows = toSavedSettings(s) as typeof saved;
    expect(rows).toEqual(saved);
    expect(toReaderSettings(rows, app, false)).toEqual(s);
  });
});
