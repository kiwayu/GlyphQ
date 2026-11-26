/* Opens the two broken files from fetch-books.sh in the reader page and prints what it reports. */
const fs=require("fs"),path=require("path"),ts=require("typescript");const{chromium,devices}=require("@playwright/test");
require.extensions[".ts"]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f);
const{buildReaderHtml,DEFAULT_SETTINGS}=require("../features/reader/readerHtml.ts");
(async()=>{const b=await chromium.launch();for(const book of ["malformed-truncated","malformed-notzip"]){const p=await(await b.newContext({...devices["Pixel 5"]})).newPage();
const html=buildReaderHtml("http://bench.local/books/"+book+".epub",null,DEFAULT_SETTINGS);
await p.route("http://bench.local/**",r=>{const u=new URL(r.request().url());return u.pathname==="/reader.html"?r.fulfill({contentType:"text/html",body:html}):r.fulfill({body:fs.readFileSync(path.join(__dirname,u.pathname))});});
await p.addInitScript(()=>{window.__m=[];window.ReactNativeWebView={postMessage:d=>window.__m.push(JSON.parse(d))};});
const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,120)));
await p.goto("http://bench.local/reader.html");await p.waitForTimeout(8000);
console.log(book,JSON.stringify(await p.evaluate(()=>({msgs:window.__m,loading:getComputedStyle(document.getElementById("loading")).display,err:document.getElementById("err-msg").textContent}))),errs);}
await b.close();})();
