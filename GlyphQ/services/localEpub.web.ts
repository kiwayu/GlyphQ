/*
 * Web build of localEpub: the browser has no documentDirectory, so imported
 * books live in IndexedDB as Blobs.
 *
 *   file input ──▶ Blob ──▶ IndexedDB "glyphq-files"/"books"[<name>]
 *   stored uri: idb://books/<name>
 *   toReadableUrl(uri) ──▶ blob: URL the reader iframe can fetch
 */

import * as DocumentPicker from "expo-document-picker";
import { ebookKindOf, safeStorageName } from "./fileValidation";

export interface PickedEbook {
  uri: string;
  name: string;
  originalName: string;
  kind: "epub" | "pdf";
  size: number | null;
}

export class ImportValidationError extends Error {}

const DB_NAME = "glyphq-files";
const STORE = "books";
const SCHEME = "idb://books/";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store<T>(
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** The stored Blob for an idb:// uri, or null. */
export async function readStoredBlob(uri: string): Promise<Blob | null> {
  if (!uri.startsWith(SCHEME)) return null;
  return (await store<Blob | undefined>("readonly", (s) => s.get(uri.slice(SCHEME.length)))) ?? null;
}

export async function pickAndStoreLocalEbook(): Promise<PickedEbook | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/epub+zip", "application/pdf", "application/octet-stream"],
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const displayName = asset.name ?? "book";
  const kind = ebookKindOf(displayName);
  if (!kind) {
    throw new ImportValidationError(`"${displayName}" is not an .epub or .pdf file.`);
  }
  const blob: Blob = asset.file ?? (await (await fetch(asset.uri)).blob());

  if (kind === "epub") {
    const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    if (head[0] !== 0x50 || head[1] !== 0x4b) {
      throw new ImportValidationError(`"${displayName}" doesn't look like a valid EPUB file.`);
    }
  }

  // Same-named files must not overwrite each other: b.epub, b-1.epub, ...
  const safe = safeStorageName(displayName);
  const dot = safe.lastIndexOf(".");
  const stem = dot > 0 ? safe.slice(0, dot) : safe;
  const ext = dot > 0 ? safe.slice(dot) : "";
  const taken = new Set((await store("readonly", (s) => s.getAllKeys())).map(String));
  let storedName = safe;
  for (let n = 1; taken.has(storedName); n++) storedName = `${stem}-${n}${ext}`;

  await store("readwrite", (s) => s.put(blob, storedName));
  return {
    uri: SCHEME + storedName,
    name: storedName,
    originalName: displayName,
    kind,
    size: blob.size,
  };
}

export async function removeStoredEbook(uri: string): Promise<void> {
  if (!uri.startsWith(SCHEME)) return;
  try {
    await store("readwrite", (s) => s.delete(uri.slice(SCHEME.length)));
  } catch {
    // cleanup only
  }
}

/** A URL the reader page can fetch. Remote URLs pass through. */
export async function toReadableUrl(uri: string): Promise<string> {
  const blob = await readStoredBlob(uri);
  return blob ? URL.createObjectURL(blob) : uri;
}

/** Native-only: the web reader always loads from an HTML string. */
export async function writeReaderHtmlFile(): Promise<string> {
  throw new Error("writeReaderHtmlFile is not used on web");
}

export function readAccessRoot(): string | undefined {
  return undefined;
}
