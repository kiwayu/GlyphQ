/* Does CSS smooth scrolling keep pages aligned? Turns twice in quick succession with and without the rule. */
const fs=require("fs"),ts=require("typescript");const{chromium,devices}=require("@playwright/test");
require.extensions[".ts"]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f);
const{buildReaderHtml,DEFAULT_SETTINGS}=require("../features/reader/readerHtml.ts");
(async()=>{const b=await chromium.launch();for(const css of ["",".epub-container{scroll-behavior:smooth}"]){const p=await(await b.newContext({...devices["Pixel 5"]})).newPage();
const html=buildReaderHtml("http://bench.local/b.epub",null,DEFAULT_SETTINGS).replace("</style>",css+"</style>");
await p.route("http://bench.local/**",r=>{const u=new URL(r.request().url());return u.pathname==="/reader.html"?r.fulfill({contentType:"text/html",body:html}):r.fulfill({body:fs.readFileSync("perf/books/small-alice.epub")});});
await p.addInitScript(()=>{window.__m=[];window.ReactNativeWebView={postMessage:d=>{const m=JSON.parse(d);m.t=performance.now();window.__m.push(m)}};});
await p.goto("http://bench.local/reader.html");await p.waitForFunction(()=>window.__m.find(m=>m.type==="locationsGenerated"));
for(let i=0;i<4;i++){await p.evaluate(()=>window.readerApi.nextPage());await p.waitForTimeout(700);}
const res=await p.evaluate(()=>new Promise(res=>{const c=document.querySelector(".epub-container");const s=[];const t0=performance.now();const n0=window.__m.length;window.readerApi.nextPage();
 const tick=()=>{s.push([Math.round(performance.now()-t0),Math.round(c.scrollLeft)]);if(performance.now()-t0<700)requestAnimationFrame(tick);else res({cls:c.className,w:c.clientWidth,samples:s.filter((x,i)=>i<3||i%4===0),loc:window.__m.slice(n0).filter(m=>m.type==="locationChanged").map(m=>[Math.round(m.t-t0),m.chapterPage])});};requestAnimationFrame(tick);}));
// rapid double turn
const rapid=await p.evaluate(()=>new Promise(res=>{const c=document.querySelector(".epub-container");const a=c.scrollLeft;window.readerApi.nextPage();setTimeout(()=>window.readerApi.nextPage(),80);setTimeout(()=>res({from:a,to:c.scrollLeft,w:c.clientWidth,aligned:(c.scrollLeft%c.clientWidth)===0}),1500);}));
console.log(css?"SMOOTH":"PLAIN",JSON.stringify(res),JSON.stringify(rapid));}
await b.close();})();
