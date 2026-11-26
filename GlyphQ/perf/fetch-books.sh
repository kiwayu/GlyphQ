#!/usr/bin/env bash
# Fetch the public-domain books the perf baseline uses, and make two broken files.
set -euo pipefail
cd "$(dirname "$0")" && mkdir -p books && cd books
M=https://aleph.pglaf.org/cache/epub
curl -fsSL -o small-alice.epub     "$M/11/pg11-images-3.epub"    # 0.19 MB
curl -fsSL -o large-lesmis.epub    "$M/135/pg135-images-3.epub"  # 10.1 MB
curl -fsSL -o images-huckfinn.epub "$M/76/pg76-images-3.epub"    # 16.0 MB, illustrated
head -c 60000 small-alice.epub > malformed-truncated.epub
printf 'this is not a zip file at all' > malformed-notzip.epub
ls -la
