import { pickMissingMeta, needsEnrichment, titleIsFileName } from "../epubMeta";

describe("needsEnrichment", () => {
  it("is true when the author is missing", () => {
    expect(needsEnrichment({ authors: null, cover_url: "x" })).toBe(true);
  });
  it("is true when the cover is missing", () => {
    expect(needsEnrichment({ authors: "A", cover_url: null })).toBe(true);
  });
  it("is false when both are present", () => {
    expect(needsEnrichment({ authors: "A", cover_url: "x" })).toBe(false);
  });
});

describe("pickMissingMeta", () => {
  const empty = { authors: null, publisher: null, published_year: null };

  it("fills author from epub creator when missing", () => {
    expect(pickMissingMeta(empty, { creator: "  Jane Austen " }).authors).toBe(
      "Jane Austen"
    );
  });

  it("does not overwrite an existing author", () => {
    const cur = { ...empty, authors: "Someone" };
    expect(pickMissingMeta(cur, { creator: "Jane Austen" }).authors).toBeUndefined();
  });

  it("parses the year from pubdate", () => {
    expect(pickMissingMeta(empty, { pubdate: "1813-01-28" }).published_year).toBe(1813);
  });

  it("fills publisher when missing", () => {
    expect(pickMissingMeta(empty, { publisher: "Penguin" }).publisher).toBe("Penguin");
  });

  it("returns nothing when there is nothing to fill", () => {
    expect(pickMissingMeta(empty, { creator: "", publisher: "  " })).toEqual({});
  });
});

describe("a title that is only the file name", () => {
  const imported = {
    title: "pg11-images-3",
    file_path: "file:///data/books/pg11-images-3.epub",
    authors: null,
    publisher: null,
    published_year: null,
  };

  it("is replaced by the book's own title", () => {
    expect(pickMissingMeta(imported, { title: " Alice in Wonderland " }).title).toBe(
      "Alice in Wonderland"
    );
  });

  it("is recognised when storage renamed the file to avoid a clash", () => {
    expect(titleIsFileName("My Great Book", "idb://books/My_Great_Book-1.epub")).toBe(true);
  });

  it("leaves a title somebody chose alone", () => {
    const edited = { ...imported, title: "Alice (school copy)" };
    expect(pickMissingMeta(edited, { title: "Alice in Wonderland" }).title).toBeUndefined();
  });

  it("leaves a book with no imported file alone", () => {
    const fromSearch = { ...imported, file_path: null };
    expect(pickMissingMeta(fromSearch, { title: "Alice in Wonderland" }).title).toBeUndefined();
  });
});
