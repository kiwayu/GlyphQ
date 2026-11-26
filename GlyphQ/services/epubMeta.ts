/*
 * Fill missing book metadata (author, publisher, year) from the EPUB's own
 * metadata — extracted in the reader WebView via epub.js book.loaded.metadata.
 * Only EMPTY fields are filled, so a user's edits and Google Books data win.
 * The one exception is a title that is still just the imported file's name.
 */

import { execute, getOne } from "@/db/database";

export interface EpubMeta {
  title?: string;
  creator?: string;
  publisher?: string;
  pubdate?: string;
  language?: string;
}

interface CurrentMeta {
  title?: string | null;
  /** Where the imported file is stored; its name is what the title started as. */
  file_path?: string | null;
  authors: string | null;
  publisher: string | null;
  published_year: number | null;
}

interface MetaFill {
  title?: string;
  authors?: string;
  publisher?: string;
  published_year?: number;
}

/** Whether a book still needs author/cover extraction (empty author or cover). */
export function needsEnrichment(book: { authors: string | null; cover_url: string | null }): boolean {
  return !book.authors || !book.cover_url;
}

/**
 * True when a title is only the imported file's name ("pg11-images-3"), which
 * is what an import starts with. Such a title was never chosen by anyone, so
 * the book's own title may replace it. The stored name can differ from the
 * picked one by punctuation and a "-1" de-duplication suffix.
 */
export function titleIsFileName(
  title: string | null | undefined,
  filePath: string | null | undefined
): boolean {
  if (!title || !filePath) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  let base = filePath.split("/").pop() ?? "";
  try { base = decodeURIComponent(base); } catch { /* keep the raw name */ }
  base = base.replace(/\.[^.]+$/, "");
  const t = norm(title);
  return !!t && (t === norm(base) || t === norm(base.replace(/-\d+$/, "")));
}

/** Pure: which fields should be filled from the epub metadata (empty ones only). */
export function pickMissingMeta(current: CurrentMeta, meta: EpubMeta): MetaFill {
  const out: MetaFill = {};
  const title = meta.title?.trim();
  if (title && titleIsFileName(current.title, current.file_path)) out.title = title;
  const creator = meta.creator?.trim();
  const publisher = meta.publisher?.trim();
  if (!current.authors && creator) out.authors = creator;
  if (!current.publisher && publisher) out.publisher = publisher;
  if (current.published_year == null && meta.pubdate) {
    const year = parseInt(String(meta.pubdate).slice(0, 4), 10);
    if (year > 0) out.published_year = year;
  }
  return out;
}

/** Fill the book's empty metadata fields. Returns true if anything changed. */
export async function applyEpubMeta(
  bookId: number,
  meta: EpubMeta
): Promise<boolean> {
  const row = await getOne<CurrentMeta>(
    `SELECT b.title, b.authors, b.publisher, b.published_year,
            (SELECT file_path FROM book_files WHERE book_id = b.id LIMIT 1) AS file_path
     FROM books b WHERE b.id = ?`,
    [bookId]
  );
  if (!row) return false;
  const fill = pickMissingMeta(row, meta);
  const keys = Object.keys(fill) as (keyof MetaFill)[];
  if (keys.length === 0) return false;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  await execute(`UPDATE books SET ${sets} WHERE id = ?`, [
    ...keys.map((k) => fill[k] as string | number),
    bookId,
  ]);
  return true;
}
