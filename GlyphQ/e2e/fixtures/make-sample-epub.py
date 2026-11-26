"""Builds e2e/fixtures/sample.epub: 3 chapters of numbered words (c2p1w37), so a
test can say exactly which word is on screen. Run: python e2e/fixtures/make-sample-epub.py"""
import zipfile, os

def chapter(c):
    paras = []
    for p in range(1, 5):
        words = []
        for w in range(1, 401):
            tok = f"c{c}p{p}w{w}"
            if w % 12 == 0: tok += "."
            elif w % 5 == 0: tok += ","
            words.append(tok)
        paras.append("<p>" + " ".join(words) + "</p>")
    return (f'<?xml version="1.0" encoding="utf-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter {c}</title></head>'
            f'<body><h1>Chapter {c}</h1>{"".join(paras)}</body></html>')

opf = '''<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">glyphq-sample</dc:identifier>
<dc:title>Sample Book</dc:title><dc:creator>Test Author</dc:creator><dc:language>en</dc:language>
<meta property="dcterms:modified">2026-01-01T00:00:00Z</meta></metadata>
<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
''' + "".join(f'<item id="c{c}" href="c{c}.xhtml" media-type="application/xhtml+xml"/>\n' for c in (1, 2, 3)) + '''</manifest>
<spine>''' + "".join(f'<itemref idref="c{c}"/>' for c in (1, 2, 3)) + '''</spine></package>'''
nav = ('<?xml version="1.0" encoding="utf-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head>'
       '<body><nav epub:type="toc"><ol>' + "".join(f'<li><a href="c{c}.xhtml">Chapter {c}</a></li>' for c in (1, 2, 3)) + '</ol></nav></body></html>')
container = '''<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'''

out = os.path.join(os.path.dirname(__file__), "sample.epub")
with zipfile.ZipFile(out, "w") as z:
    def add(name, data, method=zipfile.ZIP_DEFLATED):
        info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0)); info.compress_type = method
        z.writestr(info, data)
    add("mimetype", "application/epub+zip", zipfile.ZIP_STORED)
    add("META-INF/container.xml", container)
    add("OEBPS/content.opf", opf); add("OEBPS/nav.xhtml", nav)
    for c in (1, 2, 3): add(f"OEBPS/c{c}.xhtml", chapter(c))
print(out, os.path.getsize(out))
