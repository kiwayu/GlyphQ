import jszipSrc from "./vendor/jszipMin";
import epubjsSrc from "./vendor/epubjsMin";
import { READER_THEMES, type ReaderTheme } from "./readerThemes";

export type { ReaderTheme };

export type ReaderFont  = "georgia" | "palatino" | "charter" | "system";

export interface ReaderSettings {
  theme:       ReaderTheme;
  font:        ReaderFont;
  fontSize:    number;   // px  13–26
  lineHeight:  number;   // multiplier  1.3–2.0
  marginWidth: number;   // px  8–56
  /* Exact palette (e.g. an app theme like Catppuccin). When set, the book
     renders these colours directly instead of the classic filter theme. */
  bg?:         string | null;
  fg?:         string | null;
  link?:       string | null;
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  theme:       "light",
  font:        "georgia",
  fontSize:    17,
  lineHeight:  1.6,
  marginWidth: 20,
};

/**
 * JSON that is safe inside an inline <script>. A saved position and the cached
 * page numbers are CFIs, and a CFI carries element ids taken from the book, so
 * a crafted EPUB could put "</script>" in one and break out of the script.
 * Escaping "<" keeps the value inside its string.
 */
function scriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c");
}

export function buildReaderHtml(
  epubUrl:    string,
  initialCfi: string | null,
  settings:   ReaderSettings,
  /** epub.js locations JSON from an earlier open of this book, if cached. */
  savedLocations: string | null = null
): string {
  const initBg      = settings.bg || READER_THEMES[settings.theme].bg;
  const themesArg   = JSON.stringify(
    Object.fromEntries(
      Object.entries(READER_THEMES).map(([k, v]) => [k, { bg: v.bg, fg: v.fg, link: v.link }])
    )
  );
  const cfiArg      = initialCfi ? scriptJson(initialCfi) : "null";
  const urlArg      = scriptJson(epubUrl);
  const locationsArg = savedLocations ? scriptJson(savedLocations) : "null";
  const settingsArg = scriptJson(settings);

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
<script>${jszipSrc}<\/script>
<script>${epubjsSrc}<\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden}
body{background:${initBg}}
#viewer{width:100%;height:100%;padding:0 ${settings.marginWidth}px}
#loading{
  position:fixed;inset:0;
  background:${initBg};
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  z-index:100;transition:opacity .3s
}
#loading.gone{opacity:0;pointer-events:none}
#load-icon{width:34px;height:34px;border-radius:50%;border:3px solid rgba(127,127,127,.22);border-top-color:#3f82bc;margin-bottom:16px;animation:spin .8s linear infinite}
#load-text{font-family:-apple-system,sans-serif;font-size:14px;opacity:.45}
@keyframes spin{to{transform:rotate(360deg)}}
#err{
  position:fixed;inset:0;background:${initBg};
  display:none;flex-direction:column;
  align-items:center;justify-content:center;
  padding:32px;z-index:101
}
#err-msg{font-family:-apple-system,sans-serif;font-size:15px;color:#dc2626;text-align:center;line-height:1.6}
</style>
</head><body>
<div id="loading"><div id="load-icon"></div><div id="load-text">Opening book…</div></div>
<div id="err"><div id="err-msg"></div></div>
<div id="viewer"></div>
<script>(function(){
var THEMES=${themesArg};
var FONTS={
  georgia: "Georgia,'Times New Roman',serif",
  palatino:"'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif",
  charter: "Charter,'Bitstream Charter',Georgia,serif",
  system:  "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
};
var s=${settingsArg};
var currentCfi=${cfiArg};
var totalPages=0;
var book=null,rendition=null;

/* ── messaging ────────────────────────────────────── */
function post(type,data){
  try{window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({type:type},data||{})));}catch(e){}
}

/* ── overlays ─────────────────────────────────────── */
function hideLoading(){
  var el=document.getElementById("loading");
  if(el){el.classList.add("gone");setTimeout(function(){el.style.display="none";},350);}
}
function showError(msg){
  hideLoading();
  var el=document.getElementById("err"),txt=document.getElementById("err-msg");
  if(el&&txt){el.style.display="flex";txt.textContent=msg;}
  post("error",{message:msg});
}

/* ── chapter title resolver ───────────────────────── */
/* Populated from the flattened nav tree once navigation loads. Searching the
   flat list matters: epubs nest chapters under parts, and a top-level-only
   scan returns "" for every nested chapter — which is most of them in a book
   that has parts at all. */
var flatToc=[];
function chapterOf(href){
  if(!href)return"";
  for(var i=0;i<flatToc.length;i++){
    if(flatToc[i].href&&flatToc[i].href.indexOf(href)!==-1)return flatToc[i].label;
  }
  // Nav tree not loaded yet: fall back to the raw top-level list.
  if(!book||!book.navigation||!book.navigation.toc)return"";
  var toc=book.navigation.toc;
  for(var j=0;j<toc.length;j++){
    if(toc[j].href&&toc[j].href.indexOf(href)!==-1)return(toc[j].label||"").trim();
  }
  return"";
}

/* THEME: colours are painted straight into the book through epub.js's content
   hook (contentCss), and the page around it takes the same background. An app
   palette (s.bg/s.fg/s.link) wins over the named theme. Nothing is filtered,
   so pictures keep their own colours in dark themes. */
function palette(){
  var th=THEMES[s.theme]||THEMES.light;
  return {bg:s.bg||th.bg,fg:s.fg||th.fg,link:s.link||s.fg||th.link};
}
function applyTheme(){
  var v=document.getElementById("viewer");
  var loadEl=document.getElementById("loading");
  var p=palette();
  if(v){v.style.padding="0 "+s.marginWidth+"px";v.style.background=p.bg;}
  document.body.style.background=p.bg;
  if(loadEl)loadEl.style.background=p.bg;
  repaintContents();
}

function contentCss(){
  var ff=(FONTS[s.font]||FONTS.georgia),p=palette();
  return "html,body{font-family:"+ff+" !important;line-height:"+s.lineHeight+" !important;"
    +"font-size:"+s.fontSize+"px !important;"
    +"background:"+p.bg+" !important;color:"+p.fg+" !important;}"
    +"body *{font-family:"+ff+" !important;line-height:"+s.lineHeight+" !important;"
    +"color:"+p.fg+" !important;}"
    +"body *:not(img):not(svg):not(video){background-color:transparent !important;}"
    +"a,a *{color:"+p.link+" !important;}"
    +"p{margin-bottom:.75em;-webkit-hyphens:auto;hyphens:auto;hyphenate-limit-chars:7 3 3;}"
    +"h1,h2,h3,h4,h5,h6{margin:1em 0 .5em;}"
    +"img,svg{max-width:100% !important;height:auto !important;}";
}
function paintContents(contents){
  try{if(contents&&contents.addStylesheetCss)contents.addStylesheetCss(contentCss(), "bb-type");}catch(e){}
}
function repaintContents(){
  if(!rendition||!rendition.getContents)return;
  try{
    var cs=rendition.getContents();
    if(cs&&cs.document)cs=[cs];
    if(cs&&cs.length)for(var i=0;i<cs.length;i++)paintContents(cs[i]);
  }catch(e){}
}

/* ── apply settings ───────────────────────────────── */
function applySettings(json){
  var incoming;
  try{incoming=JSON.parse(json);}catch(e){return;}
  var prevLayout=s.font+"_"+s.fontSize+"_"+s.lineHeight+"_"+s.marginWidth;
  Object.assign(s,incoming);
  var newLayout=s.font+"_"+s.fontSize+"_"+s.lineHeight+"_"+s.marginWidth;
  applyTheme();                    // colours + typography, repaints the book
  if(newLayout!==prevLayout&&rendition){
    try{
      var v=document.getElementById("viewer");
      rendition.resize(v.clientWidth-2*s.marginWidth,v.clientHeight);
    }catch(e){}
    if(currentCfi)rendition.display(currentCfi).then(repaintContents).catch(function(){});
  }
}

/* ── book init ────────────────────────────────────── */
try{
  /* A blob: URL has no .epub extension for epub.js to sniff, so say what it is. */
  var bookUrl=${urlArg};
  book=/^blob:/.test(bookUrl)?ePub(bookUrl,{openAs:"epub"}):ePub(bookUrl);
  /* A file epub.js cannot open (cut-off download, not a zip) never rejects
     display(): the only signal is this event. Without it the page sat on
     "Opening book" for ever. */
  book.on("openFailed",function(){
    showError("This file could not be opened. It may be damaged or not an EPUB.");
  });
  rendition=book.renderTo("viewer",{
    width:"100%",height:"100%",
    spread:"none",flow:"paginated"
  });

  /* Style every section as epub.js renders it — runs inside epub.js so it can
     reach the content. This is what makes the theme (incl. default) actually
     apply to the book text. */
  if(rendition.hooks&&rendition.hooks.content){
    rendition.hooks.content.register(function(contents){paintContents(contents);});
  }

  applyTheme();

  var dp=currentCfi?rendition.display(currentCfi):rendition.display();
  dp.then(function(){hideLoading();post("ready");})
    .catch(function(e){showError("Could not display book: "+(e&&e.message||"unknown error"));});

  /* Page numbers. Generating them reads every chapter of the book, so a cached
     set from an earlier open is loaded instead when there is one; a fresh set
     is posted back to be cached. Either way the current page is re-reported,
     because the first relocated fired before any numbers existed. */
  var savedLocations=${locationsArg};
  book.ready
    .then(function(){
      if(savedLocations){
        try{book.locations.load(savedLocations);if(book.locations.length())return null;}catch(e){}
      }
      return book.locations.generate(1600).then(function(){return book.locations.save();});
    })
    .then(function(fresh){
      totalPages=book.locations.length();
      post("locationsGenerated",{totalPages:totalPages,locations:fresh});
      try{rendition.reportLocation();}catch(e){}
    })
    .catch(function(){});

  /* Flatten the nav tree: epubs nest chapters under parts ("books within the
     book"), so a flat nav.toc.map drops every nested chapter. Recurse into
     subitems and carry depth for indentation. */
  function flattenToc(items,level,out){
    for(var i=0;i<items.length;i++){
      var ch=items[i];
      out.push({
        id:ch.id||(level+"_"+out.length),
        label:(ch.label||"").trim(),
        href:ch.href,
        level:level
      });
      if(ch.subitems&&ch.subitems.length)flattenToc(ch.subitems,level+1,out);
    }
    return out;
  }
  book.loaded.navigation
    .then(function(nav){
      flatToc=flattenToc(nav.toc||[],0,[]);   // also feeds chapterOf()
      post("tocLoaded",{toc:flatToc});
    }).catch(function(){});

  rendition.on("relocated",function(loc){
    var pct=loc.start.percentage||0;
    var cfi=loc.start.cfi;
    var disp0=(loc.start&&loc.start.displayed)||{};
    /* Page numbers need book.locations, which takes a while on a long book.
       Until then, estimate progress from the chapter's place in the spine. */
    if(!totalPages&&book.spine){
      var nSec=book.spine.length||0;
      if(nSec)pct=((loc.start.index||0)+((disp0.page||1)-1)/(disp0.total||1))/nSec;
    }
    currentCfi=cfi;
    var page=0;
    if(book.locations&&cfi){try{page=book.locations.locationFromCfi(cfi)||0;}catch(e){}}
    /* epub.js already paginates the current section; reuse its counts. */
    var disp=disp0;
    post("locationChanged",{
      cfi:cfi,
      percentage:Math.round(pct*10000)/100,
      currentPage:page,
      totalPages:totalPages,
      chapterPage:disp.page||0,
      chapterPages:disp.total||0,
      chapter:chapterOf(loc.start.href||""),
      /* Identifies WHICH chapter this is, so the native side can invalidate a
         caret pick that belonged to a different one. */
      href:loc.start.href||""
    });
  });

  /* No in-iframe input handling lives here. The native side mounts a
     full-screen responder over this WebView (see features/reader/tapZones.ts),
     so no touch or click ever reaches the book document: the overlay is
     absoluteFill while reading, and the RSVP overlay covers it while speed
     reading. Listeners bound here would be unreachable code that merely looks
     live. Gestures have exactly one owner, and it is not this file. */

}catch(err){showError("Failed to load book: "+(err&&err.message||"unknown error"));}

/* ── chapter text extraction (RSVP speed reading) ──── */
/* Paginated flow keeps the whole section in one iframe document, so the
   block-level text we read here is the entire current chapter — exactly
   what the RSVP engine tokenizes. */
function currentDocs(){
  var docs=[];
  try{
    if(rendition&&typeof rendition.getContents==="function"){
      var cs=rendition.getContents()||[];
      if(cs&&cs.document)cs=[cs];           // some versions return one Contents
      for(var i=0;i<cs.length;i++)if(cs[i]&&cs[i].document)docs.push(cs[i].document);
    }
  }catch(e){}
  if(!docs.length){
    var views=(rendition&&rendition.manager&&rendition.manager.views&&(rendition.manager.views._views||rendition.manager.views.views))||[];
    for(var j=0;j<views.length;j++){
      var v=views[j],d=v.document||(v.iframe&&v.iframe.contentDocument);
      if(d)docs.push(d);
    }
  }
  return docs;
}
var BLOCK_SEL="p,li,blockquote,h1,h2,h3,h4,h5,h6";
/* Blocks that actually carry text, in reading order. The RSVP token stream is
   built from exactly this list, so token.paragraphIndex indexes straight back
   into it — that is what lets goToBlock() land the page on the stopping word.
   Empty spacer blocks must stay skipped in BOTH places or the mapping drifts. */
function textBlocks(doc){
  var out=[];
  if(!doc||!doc.body)return out;
  var blocks=doc.body.querySelectorAll(BLOCK_SEL);
  for(var i=0;i<blocks.length;i++){
    /* A block that wraps other blocks (blockquote > p, li > p) would repeat
       their text: once for itself and once for each child. Keep the leaves. */
    if(blocks[i].querySelector(BLOCK_SEL))continue;
    if((blocks[i].textContent||"").replace(/\\s+/g," ").trim())out.push(blocks[i]);
  }
  return out;
}
function collectParagraphs(doc){
  var out=[];
  if(!doc||!doc.body)return out;
  var blocks=textBlocks(doc);
  if(blocks.length){
    for(var i=0;i<blocks.length;i++){
      out.push((blocks[i].textContent||"").replace(/\\s+/g," ").trim());
    }
  }else{
    var body=(doc.body.textContent||"").replace(/\\r/g,"");
    var parts=body.split(/\\n\\s*\\n/);
    for(var k=0;k<parts.length;k++){
      var p=parts[k].replace(/\\s+/g," ").trim();
      if(p)out.push(p);
    }
  }
  return out;
}
function chapterParagraphs(){
  var paras=[],docs=currentDocs();
  for(var i=0;i<docs.length;i++){
    var got=collectParagraphs(docs[i]);
    for(var k=0;k<got.length;k++)paras.push(got[k]);
  }
  return paras;
}
function currentHref(){
  return (rendition&&rendition.location&&rendition.location.start&&rendition.location.start.href)||"";
}
/* Index of the word at (node,offset) inside a block, numbered the way
   wordRange numbers them. A position inside a word is that word. */
function wordsBefore(el,target,offset){
  var doc=el.ownerDocument,walker=doc.createTreeWalker(el,4,null),node,count=-1,open=false;
  while((node=walker.nextNode())){
    var txt=node.nodeValue||"",re=/\\S+/g,m;
    while((m=re.exec(txt))){
      if(!(m.index===0&&open))count++;
      if(node===target&&m.index+m[0].length>offset)return count;
    }
    if(node===target)return count+1;
    if(txt.length)open=/\\S$/.test(txt);
  }
  return Math.max(0,count);
}
/* Where the page on screen starts, as (text block, word in block), so speed
   reading can begin at the top of the page instead of the top of the chapter. */
function pageStart(){
  try{
    var cs=rendition.getContents();
    if(cs&&cs.document)cs=[cs];
    var c=cs&&cs[0];
    if(!c||!c.range||!currentCfi)return null;
    var r=c.range(currentCfi);
    if(!r)return null;
    var node=r.startContainer,blocks=textBlocks(c.document);
    for(var i=0;i<blocks.length;i++){
      if(blocks[i].contains(node))return {block:i,word:wordsBefore(blocks[i],node,r.startOffset)};
      if(node.compareDocumentPosition(blocks[i])&4)return {block:i,word:0};
    }
  }catch(e){}
  return null;
}
function getChapterText(){
  try{
    var h=currentHref();
    /* href identifies WHICH chapter these tokens are: a resume pointer without
       it can land part-way into a different, merely-long-enough chapter. */
    post("chapterText",{paragraphs:chapterParagraphs(),chapter:chapterOf(h),href:h,pageStart:pageStart()});
  }catch(e){post("chapterText",{paragraphs:[],chapter:"",href:""});}
}

/* Auto-advance when speed reading finishes a chapter: actually navigate the
   book to the next spine section with text, then hand its paragraphs back.
   Moving the rendition (rather than reading ahead invisibly) is what keeps the
   page underneath correct when the overlay is closed. Sections with no text —
   covers, nav pages — are skipped, so the reader never lands on a blank one. */
/* Generation counter: closing the overlay bumps it, so an advance already in
   flight goes quiet instead of racing the close and dragging the page forward
   a chapter. Every async continuation re-checks it before touching anything. */
var advGen=0;
/* A rendition that fails systematically would otherwise walk the entire spine,
   one real display() per section. Bound the skip run. */
var MAX_SKIP=20;

function nextChapter(){
  var gen=++advGen;
  var startHref=currentHref();
  function alive(){return gen===advGen;}
  function stop(){
    // Nothing further to read: put the book back where the walk started rather
    // than leaving it parked on whatever blank section we stopped at.
    if(!alive())return;
    if(startHref){try{rendition.display(startHref);}catch(e){}}
    post("chapterText",{paragraphs:[],chapter:"",endOfBook:true});
  }
  if(!book||!rendition||!book.spine){stop();return;}
  var cur=null;
  try{cur=book.spine.get(startHref);}catch(e){}
  if(!cur||typeof cur.index!=="number"){stop();return;}
  function step(n,skipped){
    if(!alive())return;
    if(skipped>=MAX_SKIP){stop();return;}
    var sec=null;
    try{sec=book.spine.get(n);}catch(e){}
    if(!sec){stop();return;}
    rendition.display(sec.href).then(function(){
      if(!alive())return;
      var paras=chapterParagraphs();
      if(!paras.length){step(n+1,skipped+1);return;}
      repaintContents();
      post("chapterText",{
        paragraphs:paras,
        chapter:chapterOf(sec.href),
        href:sec.href,
        spineIndex:n,
        advanced:true
      });
    }).catch(function(){
      // A rejected display is a failure, not an empty chapter. Keep walking,
      // but it counts against the skip budget so we cannot loop the book.
      step(n+1,skipped+1);
    });
  }
  step(cur.index+1,0);
}

/* Called before the overlay closes: invalidates any in-flight advance so the
   close-time seek is the last navigation to win. */
function cancelAdvance(){advGen++;}

/* Range around the w-th whitespace-delimited word of a block. A word can span
   text nodes ("<em>hel</em>lo"), so a run that starts flush against the end of
   the previous node continues that word instead of starting a new one. This
   counts the same way the RSVP tokeniser splits the block's text. */
function wordRange(el,w){
  try{
    var doc=el.ownerDocument,walker=doc.createTreeWalker(el,4,null),node,count=-1,open=false;
    while((node=walker.nextNode())){
      var txt=node.nodeValue||"",re=/\\S+/g,m;
      while((m=re.exec(txt))){
        if(!(m.index===0&&open))count++;
        if(count===w){
          var r=doc.createRange();
          r.setStart(node,m.index);r.setEnd(node,m.index+m[0].length);
          return r;
        }
      }
      if(txt.length)open=/\\S$/.test(txt);
    }
  }catch(e){}
  return null;
}
/* Mark the word the reader stopped on, then fade the mark out (opacity only). */
function flashWord(r){
  try{
    var doc=r.startContainer.ownerDocument,win=doc.defaultView||{},rect=r.getBoundingClientRect();
    var old=doc.getElementById("bb-flash");if(old&&old.parentNode)old.parentNode.removeChild(old);
    var el=doc.createElement("div");
    el.id="bb-flash";
    el.setAttribute("data-word",r.toString());
    el.style.cssText="position:absolute;pointer-events:none;border-radius:3px;opacity:.35;"
      +"transition:opacity .6s ease-out;background:"+palette().link+";"
      +"left:"+(rect.left+(win.scrollX||0)-2)+"px;top:"+(rect.top+(win.scrollY||0))+"px;"
      +"width:"+(rect.width+4)+"px;height:"+rect.height+"px;";
    doc.body.appendChild(el);
    setTimeout(function(){el.style.opacity="0";},1400);
    setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},2200);
  }catch(e){}
}

/* Move the page to where speed reading stopped: word w of the Nth text block
   of the current chapter (RSVP tokens carry both). Posts currentCfi afterwards
   so the caller can drop its marker on the page the reader actually landed on,
   not the stale one it was showing while the overlay was up. Without w, or if
   the word cannot be found, it lands on the start of the block. */
function goToBlock(n,w){
  function fallback(){post("currentCfi",{cfi:currentCfi});}
  try{
    var cs=rendition&&rendition.getContents&&rendition.getContents();
    if(cs&&cs.document)cs=[cs];
    if(!cs||!cs.length){fallback();return;}
    /* paragraphIndex is minted over the CONCATENATION of every doc in
       chapterParagraphs(), so consume it the same way: walk the docs in order,
       subtracting each one's block count, instead of clamping into doc 0. */
    var idx=Math.max(0,n),c=null,el=null;
    for(var i=0;i<cs.length;i++){
      if(!cs[i]||!cs[i].document)continue;
      var blocks=textBlocks(cs[i].document);
      if(!blocks.length)continue;
      if(idx<blocks.length){c=cs[i];el=blocks[idx];break;}
      idx-=blocks.length;
      c=cs[i];el=blocks[blocks.length-1];   // past the end → last block seen
    }
    if(!c||!el||!c.cfiFromNode){fallback();return;}
    var range=(typeof w==="number"&&w>=0)?wordRange(el,w):null;
    var cfi=(range&&c.cfiFromRange)?c.cfiFromRange(range):c.cfiFromNode(el);
    if(!cfi){fallback();return;}
    /* Post the CFI we computed, not currentCfi: relocated is not guaranteed to
       have run, and the marker must land on the block we asked for. */
    rendition.display(cfi)
      .then(function(){if(range)flashWord(range);post("currentCfi",{cfi:cfi});})
      .catch(fallback);
  }catch(e){fallback();}
}

/* ── caret (pick RSVP start word) ──────────────────────
   Draw a blinking caret at a tapped word and report its word index in the
   current chapter, so speed reading can start exactly there. Runs against the
   current section document (same handle epub.js styles); wrapped so a
   cross-origin failure just disables the caret. */
function caretDoc(){
  try{
    var cs=rendition.getContents();
    if(cs&&cs.document)cs=[cs];
    if(cs&&cs.length&&cs[0])return cs[0].document;
  }catch(e){}
  return null;
}
function bbCaretEl(doc){
  var el=doc.getElementById("bb-caret");
  if(!el){
    el=doc.createElement("div");
    el.id="bb-caret";
    el.style.cssText="position:absolute;width:2px;background:currentColor;opacity:.85;z-index:99999;pointer-events:none;border-radius:1px;";
    var st=doc.createElement("style");
    st.textContent="#bb-caret{animation:bbcaretblink 1s step-end infinite}@keyframes bbcaretblink{50%{opacity:0}}";
    (doc.head||doc.body).appendChild(st);
    doc.body.appendChild(el);
  }
  return el;
}
function caretRange(doc,x,y){
  if(doc.caretRangeFromPoint)return doc.caretRangeFromPoint(x,y);
  if(doc.caretPositionFromPoint){
    var p=doc.caretPositionFromPoint(x,y);
    if(p){var r=doc.createRange();r.setStart(p.offsetNode,p.offset);r.collapse(true);return r;}
  }
  return null;
}
/* Count whitespace words before (node,offset) in reading order — matches the
   RSVP tokeniser closely enough to land on the tapped word. */
function wordIndexBefore(root,node,offset){
  var count=0,done=false;
  (function walk(n){
    if(done||!n)return;
    if(n.nodeType===3){
      var txt=(n===node)?String(n.nodeValue).slice(0,offset):String(n.nodeValue||"");
      var m=txt.match(/\\S+/g);if(m)count+=m.length;
      if(n===node)done=true;
      return;
    }
    for(var i=0;i<n.childNodes.length&&!done;i++)walk(n.childNodes[i]);
  })(root);
  return count;
}
/* Draw only. Deliberately does NOT compute the word index: wordIndexBefore
   walks the whole chapter DOM, and during a drag this runs per touch-move
   event. The index is not needed until the finger lifts. */
function drawCaret(doc,x,y){
  var rng=caretRange(doc,x,y);
  if(!rng||!rng.startContainer)return null;
  try{
    var rect=rng.getBoundingClientRect();
    var win=doc.defaultView||{};
    var el=bbCaretEl(doc);
    el.style.left=(rect.left+(win.scrollX||0))+"px";
    el.style.top=(rect.top+(win.scrollY||0))+"px";
    el.style.height=((rect.height||18))+"px";
    el.style.display="block";
  }catch(e){}
  return rng;
}

/* ── public API ───────────────────────────────────── */
window.readerApi={
  nextPage:       function(){if(rendition)rendition.next();},
  prevPage:       function(){if(rendition)rendition.prev();},
  goToChapter:    function(href){if(rendition)rendition.display(href);},
  goToCfi:        function(cfi){if(rendition)rendition.display(cfi);},
  getCurrentCfi:  function(){post("currentCfi",{cfi:currentCfi});},
  goToPercentage: function(p){if(rendition&&book&&book.locations){var c=book.locations.cfiFromPercentage(Math.max(0,Math.min(1,p)));if(c)rendition.display(c);}},
  applySettings:  applySettings,
  getChapterText: getChapterText,
  nextChapter:    nextChapter,
  cancelAdvance:  cancelAdvance,
  goToBlock:      goToBlock,
  /* Draw the caret at a WebView-relative point. Cheap: call on every move. */
  caretAt:        function(mx,my){
    try{
      var doc=caretDoc();if(!doc)return;
      var ifr=document.querySelector("#viewer iframe");if(!ifr)return;
      var rect=ifr.getBoundingClientRect();
      drawCaret(doc,mx-rect.left,my-rect.top);
    }catch(e){}
  },
  /* Draw AND resolve the word index, posting it back. Call once, on release:
     this is the expensive path (a full DOM walk over the chapter). */
  caretCommit:    function(mx,my){
    try{
      var doc=caretDoc();if(!doc)return;
      var ifr=document.querySelector("#viewer iframe");if(!ifr)return;
      var rect=ifr.getBoundingClientRect();
      var rng=drawCaret(doc,mx-rect.left,my-rect.top);
      if(!rng)return;
      var idx=wordIndexBefore(doc.body,rng.startContainer,rng.startOffset||0);
      /* 0 is a real pick (first word of the chapter), so the guard is >= 0. */
      if(idx>=0)post("caret",{wordIndex:idx,href:currentHref()});
    }catch(e){}
  },
  caretHide:      function(){
    try{var doc=caretDoc();if(!doc)return;var el=doc.getElementById("bb-caret");if(el)el.style.display="none";}catch(e){}
  },
  /* Post the epub's own metadata (author etc.) so the library can fill blanks. */
  extractMeta:    function(){
    try{
      book.loaded.metadata.then(function(m){
        post("meta",{
          title:(m&&m.title)||"",
          creator:(m&&m.creator)||"",
          publisher:(m&&m.publisher)||"",
          pubdate:(m&&(m.pubdate||m.date))||"",
          language:(m&&m.language)||""
        });
      }).catch(function(){post("meta",{});});
    }catch(e){post("meta",{});}
  },
  /* Resolve the epub's cover to a base64 data URL and post it back. epub.js
     parses the OPF + inflates the image from the zip archive for us. */
  extractCover:   function(){
    try{
      if(!book){post("cover",{dataUrl:null});return;}
      book.coverUrl().then(function(url){
        if(!url){post("cover",{dataUrl:null});return;}
        return fetch(url).then(function(r){return r.blob();}).then(function(blob){
          var fr=new FileReader();
          fr.onload=function(){post("cover",{dataUrl:fr.result});};
          fr.onerror=function(){post("cover",{dataUrl:null});};
          fr.readAsDataURL(blob);
        });
      }).catch(function(){post("cover",{dataUrl:null});});
    }catch(e){post("cover",{dataUrl:null});}
  },
};
})();<\/script>
</body></html>`;
}
