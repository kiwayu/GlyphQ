/*
 * Web build of contentHash: same idea as the native one (size + first 1MB +
 * last 1MB), read from the IndexedDB Blob and digested with Web Crypto.
 * Hashes are only ever compared with others made on the same platform.
 */

import { readStoredBlob } from "./localEpub.web";

export const HASH_CHUNK_BYTES = 1024 * 1024;

export function composeHashInput(size: number, headB64: string, tailB64: string): string {
  return `${size}|${headB64}|${tailB64}`;
}

export interface FileHash {
  hash: string;
  size: number;
}

export async function hashFile(uri: string): Promise<FileHash | null> {
  const blob = await readStoredBlob(uri);
  if (!blob) return null;
  const size = blob.size;
  const tailStart = Math.max(size - HASH_CHUNK_BYTES, HASH_CHUNK_BYTES);
  const parts = [
    new TextEncoder().encode(`${size}|`),
    new Uint8Array(await blob.slice(0, HASH_CHUNK_BYTES).arrayBuffer()),
    new Uint8Array(size > HASH_CHUNK_BYTES ? await blob.slice(tailStart).arrayBuffer() : new ArrayBuffer(0)),
  ];
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await new Blob(parts as BlobPart[]).arrayBuffer()
  );
  const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return { hash, size };
}
