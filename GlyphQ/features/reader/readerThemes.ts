/*
 * The four in-book themes, in one place. The reader page (readerHtml.ts) paints
 * the book with bg/fg/link; the native chrome around it uses the rest.
 */
export type ReaderTheme = "light" | "sepia" | "dark" | "night";

export interface ReaderThemeColors {
  label: string;
  bg: string;
  fg: string;
  link: string;
  sub: string;
  barBg: string;
  barBorder: string;
  accent: string;
}

export const READER_THEMES: Record<ReaderTheme, ReaderThemeColors> = {
  light: {
    label: "Light", bg: "#fafafa", fg: "#1a1a1a", link: "#3f82bc", sub: "#888",
    barBg: "rgba(250,250,250,0.96)", barBorder: "rgba(0,0,0,0.08)", accent: "#3f82bc",
  },
  sepia: {
    label: "Sepia", bg: "#f4ecd8", fg: "#5b4636", link: "#8b5e3c", sub: "#917562",
    barBg: "rgba(237,226,204,0.96)", barBorder: "rgba(91,70,54,0.12)", accent: "#8b5e3c",
  },
  dark: {
    label: "Dark", bg: "#1c1c1c", fg: "#d4d4d4", link: "#88BDF2", sub: "#777",
    barBg: "rgba(20,20,20,0.97)", barBorder: "rgba(255,255,255,0.08)", accent: "#88BDF2",
  },
  night: {
    label: "Night", bg: "#000000", fg: "#a0a0a0", link: "#6A89A7", sub: "#555",
    barBg: "rgba(0,0,0,0.98)", barBorder: "rgba(255,255,255,0.05)", accent: "#6A89A7",
  },
};

export const READER_THEME_ORDER: ReaderTheme[] = ["light", "sepia", "dark", "night"];
