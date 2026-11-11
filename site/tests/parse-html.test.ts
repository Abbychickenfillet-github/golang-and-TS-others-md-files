// @vitest-environment node
// 上一行是 vitest 的檔案層級指令註解：這個檔案改用 node 環境，因為只測純字串處理與讀檔，不需要 jsdom；
// 從 vitest 匯入測試骨架：describe 分組、it 定義單一案例、expect 斷言；
import { describe, expect, it } from 'vitest';
// 匯入 Node 內建的同步讀檔函式，測試要讀真實的 note-theme.css 與樣板 html；
import { readFileSync } from 'node:fs';
// 匯入 path 模組，用 resolve 把相對路徑組成絕對路徑；
import * as path from 'node:path';
// 匯入 postcss 的預設匯出，用它驗證輸出的 CSS 還能被重新解析；
import postcss from 'postcss';
// 匯入被測模組的三個函式；
import { parseHtmlNote, pruneSharedRules, sharedSelectors } from '../src/lib/parse-html';

// vitest 從 site/ 執行，所以 `..` 就是 repo 根目錄；用 process.cwd() 定位，不靠 import.meta.url；
const repoRoot = path.resolve(process.cwd(), '..');
// 讀出真實的共用主題樣式，後面幾個測試用它驗證「真的會抽掉共用規則」；
const themeCss = readFileSync(path.join(repoRoot, 'assets', 'note-theme.css'), 'utf8');

// 合成用的共用集合：含兩個選擇器與一個自訂屬性，讓純 CSS 測試不依賴真實主題的內容；
const shared = new Set(['.card', '.toc', '.card>h2:first-child', '--bg']);

// 工具函式：把 CSS 解析一次，解析不出錯就代表輸出是合法 CSS；回傳語法樹方便查詢；
function reparse(css: string) {
  // postcss.parse 遇到語法錯誤會丟 CssSyntaxError，測試就會失敗；
  return postcss.parse(css);
}

// 第一組：sharedSelectors 從真實主題收集選擇器與自訂屬性；
describe('sharedSelectors', () => {
  // 取一次真實主題的集合，後面案例共用；
  const set = sharedSelectors(themeCss);

  // 主題裡出現的選擇器都要在集合內；
  it('收錄主題內的選擇器（含 .card、.pill、.quiz-head）', () => {
    // 逐個斷言；
    expect(set.has('.card')).toBe(true);
    expect(set.has('.pill')).toBe(true);
    expect(set.has('.quiz-head')).toBe(true);
  });

  // 選擇器清單要拆開、組合子兩側空白要正規化；
  it('選擇器清單拆開收錄，組合子兩側空白被收掉', () => {
    // `.fig,.card>svg` 是清單，要拆成兩個；
    expect(set.has('.fig')).toBe(true);
    expect(set.has('.card>svg')).toBe(true);
    // `.snap-deck > *` 原文有空白，正規化後沒有；
    expect(set.has('.snap-deck>*')).toBe(true);
    // 後代選擇器只留單一空白；
    expect(set.has('header.hero h1')).toBe(true);
  });

  // @media 裡的選擇器也要收錄（例如 print 區塊的 .toolbar）；
  it('遞迴收錄 @media 內的選擇器', () => {
    // `.toolbar,.quiz` 在 @media print 內；
    expect(set.has('.toolbar')).toBe(true);
    expect(set.has('.quiz')).toBe(true);
  });

  // 自訂屬性名稱來自 :root，淺色與深色兩個區塊都算；
  it('收錄 :root 宣告的自訂屬性名稱（淺色與深色）', () => {
    // 淺色區塊的變數；
    expect(set.has('--bg')).toBe(true);
    expect(set.has('--card')).toBe(true);
    expect(set.has('--ls-body')).toBe(true);
    // 只在深色區塊也宣告的變數仍屬於同一批（這裡 --hl-core 兩邊都有，確認至少存在）；
    expect(set.has('--hl-core')).toBe(true);
  });

  // :root 本身不能當選擇器收進去，否則所有 :root 規則會被整條刪掉；
  it('不把 :root 當選擇器收錄', () => {
    expect(set.has(':root')).toBe(false);
  });
});

// 第二組：pruneSharedRules 的規則修剪；
describe('pruneSharedRules', () => {
  // 全部選擇器都共用的規則整條移除，頁面獨有的保留；
  it('移除 .card 規則、保留 .my-chart 規則', () => {
    // 輸入兩條規則；
    const out = pruneSharedRules('.card{color:red}\n.my-chart{color:blue}', shared);
    // .card 規則消失；
    expect(out).not.toContain('.card');
    // .my-chart 規則還在；
    expect(out).toContain('.my-chart');
    // 輸出仍是合法 CSS；
    reparse(out);
  });

  // 選擇器清單只丟共用的那幾個；
  it('選擇器清單 `.card, .my-chart` 只留下 .my-chart', () => {
    // 輸入清單規則；
    const out = pruneSharedRules('.card, .my-chart{color:red}', shared);
    // 解析後只有一條規則、一個選擇器；
    const rules = reparse(out).nodes;
    expect(rules).toHaveLength(1);
    // 規則的選擇器字串只剩 .my-chart；
    expect((rules[0] as postcss.Rule).selector).toBe('.my-chart');
    // 宣告內容原樣保留；
    expect(out).toContain('color:red');
  });

  // 組合子兩側空白不同也要視為同一個選擇器；
  it('空白不同的同一選擇器也視為共用', () => {
    // 輸入用 `.card > h2:first-child`（有空白），集合內是 `.card>h2:first-child`；
    const out = pruneSharedRules('.card > h2:first-child{margin:0}', shared);
    // 整條規則被移除；
    expect(out.trim()).toBe('');
  });

  // :root 規則只移除共用變數，保留頁面獨有變數；
  it(':root 只移除共用的自訂屬性，保留 --brick', () => {
    // 輸入同一個 :root 內有一個共用變數與一個獨有變數；
    const out = pruneSharedRules(':root{--bg:#000;--brick:#a94438}', shared);
    // --bg 被移除；
    expect(out).not.toContain('--bg');
    // --brick 保留；
    expect(out).toContain('--brick:#a94438');
    // :root 規則本身還在；
    expect(out).toContain(':root');
    // 合法 CSS；
    reparse(out);
  });

  // :root 內的宣告全是共用變數時，整條規則要消失；
  it(':root 的宣告全被抽掉時整條規則移除', () => {
    // 只有共用變數；
    const out = pruneSharedRules(':root{--bg:#000}', shared);
    // 沒有任何內容留下；
    expect(out.trim()).toBe('');
  });

  // 深色模式區塊裡的 :root 也一樣處理；清空後 @media 也要消失；
  it('深色 @media 內的 :root 清空後連 @media 一起移除', () => {
    // 輸入深色模式覆寫共用變數；
    const out = pruneSharedRules('@media (prefers-color-scheme: dark){:root{--bg:#111}}', shared);
    // 整個區塊不見；
    expect(out.trim()).toBe('');
  });

  // @media 內遞迴處理，同一個區塊裡共用的移除、獨有的留下；
  it('@media 區塊遞迴修剪，剩下的規則保留', () => {
    // 輸入窄螢幕區塊，一條共用 .toc、一條獨有 .my；
    const out = pruneSharedRules('@media (max-width:860px){.toc{display:none}.my{color:red}}', shared);
    // @media 還在；
    expect(out).toContain('@media (max-width:860px)');
    // .my 還在；
    expect(out).toContain('.my');
    // .toc 消失；
    expect(out).not.toContain('.toc');
    // 合法 CSS；
    reparse(out);
  });

  // @media 內全部共用時整個區塊移除；
  it('@media 內規則全被抽掉時整個區塊移除', () => {
    // 只有共用規則；
    const out = pruneSharedRules('@media (max-width:860px){.toc{display:none}}', shared);
    // 輸出為空；
    expect(out.trim()).toBe('');
  });

  // @supports 與 @media 一樣遞迴；
  it('@supports 區塊也遞迴修剪', () => {
    // 輸入 @supports 內含共用與獨有規則；
    const out = pruneSharedRules('@supports (display:grid){.card{a:b}.my{c:d}}', shared);
    // 獨有規則留下；
    expect(out).toContain('.my');
    // 共用規則消失；
    expect(out).not.toContain('.card');
  });

  // @keyframes 內的 from/to 不是選擇器，整段原樣保留；
  it('@keyframes 原樣保留，即使關鍵影格長得像共用選擇器', () => {
    // 輸入；
    const css = '@keyframes spin{from{opacity:0}to{opacity:1}}';
    // 輸出仍含完整的 keyframes；
    const out = pruneSharedRules(css, new Set(['from', 'to']));
    expect(out).toContain('@keyframes spin');
    expect(out).toContain('from{opacity:0}');
    expect(out).toContain('to{opacity:1}');
  });

  // @font-face 與 @import 原樣保留；
  it('@font-face 與 @import 保留不動', () => {
    // 輸入；
    const css = '@import url("x.css");\n@font-face{font-family:Foo;src:url(foo.woff2)}';
    // 輸出仍含兩者；
    const out = pruneSharedRules(css, shared);
    expect(out).toContain('@import url("x.css")');
    expect(out).toContain('@font-face');
    expect(out).toContain('font-family:Foo');
  });

  // 註解一律丟掉（一致的政策），包含規則內部與規則之間的；
  it('註解一律移除', () => {
    // 輸入有兩處註解；
    const out = pruneSharedRules('/* top */.my{/* in */color:red}', shared);
    // 沒有註解符號；
    expect(out).not.toContain('/*');
    // 規則還在；
    expect(out).toContain('color:red');
  });

  // 用真實主題：對齊示範用的 .align-demo 與 .seg 都是共用規則，會被移除；
  it('以真實主題修剪：.align-demo 與 .seg 被移除、.my-chart 保留', () => {
    // 建立真實集合；
    const real = sharedSelectors(themeCss);
    // 輸入三條規則；
    const out = pruneSharedRules('.align-demo{color:red}.seg{color:red}.my-chart{color:red}', real);
    // 只剩 .my-chart；
    expect(out).toContain('.my-chart');
    expect(out).not.toContain('.align-demo');
    expect(out).not.toContain('.seg');
  });

  // 壞掉的 CSS 不丟錯，原樣交還；
  it('無法解析的 CSS 不丟錯', () => {
    // 缺右大括號；
    expect(() => pruneSharedRules('.a{color:red', shared)).not.toThrow();
  });
});

// 第三組：parseHtmlNote 的整頁解析；
describe('parseHtmlNote', () => {
  // 建立一頁常見結構的 html，後面多個案例共用；
  const page = [
    '<!DOCTYPE html>',
    '<html lang="zh-Hant">',
    '<head>',
    '<meta charset="utf-8">',
    '<title>  我的 \n 筆記  </title>',
    '<link rel="stylesheet" href="../../assets/note-theme.css?v=2">',
    '<link rel="stylesheet" href="https://fonts.example/a.css">',
    '<style>.card{color:red}.my-chart{color:blue}</style>',
    '<script src="https://cdn.example/lib.js" defer crossorigin="anonymous" integrity="sha384-abc"></script>',
    '<script>window.headFirst = 1;</script>',
    '</head>',
    '<body class="note dark" data-x="1">',
    '<div class="wrap"><h1>H1 標題</h1><p>內文</p></div>',
    '<script src="../../assets/notes.js?v=2"></script>',
    '<script src="/assets/note-mask.js"></script>',
    '<script>window.bodySecond = 2;</script>',
    '</body>',
    '</html>',
  ].join('\n');

  // 標題取 <title> 並收斂空白；
  it('title 取 <title> 並收斂空白', () => {
    expect(parseHtmlNote(page).title).toBe('我的 筆記');
  });

  // 沒有 <title> 時退而用第一個 h1；
  it('沒有 <title> 時用第一個 h1', () => {
    expect(parseHtmlNote('<body><h1> 第一 <b>個</b> </h1><h1>第二</h1></body>').title).toBe('第一 個');
  });

  // 連 h1 都沒有就是空字串；
  it('沒有 <title> 也沒有 h1 時為空字串', () => {
    expect(parseHtmlNote('<body><p>x</p></body>').title).toBe('');
  });

  // 內嵌 SVG 的 <title> 不是文件標題；
  it('SVG 內的 <title> 不當文件標題', () => {
    expect(parseHtmlNote('<body><svg><title>圖說</title></svg><h1>真標題</h1></body>').title).toBe('真標題');
  });

  // lang 取自 html 標籤，沒有就空字串；
  it('lang 取自 <html lang>，缺少時為空字串', () => {
    expect(parseHtmlNote(page).lang).toBe('zh-Hant');
    expect(parseHtmlNote('<body></body>').lang).toBe('');
  });

  // body 屬性原樣取出；
  it('bodyAttrs 取出 <body> 的屬性', () => {
    expect(parseHtmlNote(page).bodyAttrs).toEqual({ class: 'note dark', 'data-x': '1' });
  });

  // bodyHtml 不含 script 與 style，但保留其餘標記；
  it('bodyHtml 是 body 內層、不含 <script> 與 <style>', () => {
    // 解析；
    const note = parseHtmlNote(page);
    // 內容在；
    expect(note.bodyHtml).toContain('<div class="wrap"><h1>H1 標題</h1><p>內文</p></div>');
    // script 不在；
    expect(note.bodyHtml).not.toContain('<script');
    expect(note.bodyHtml).not.toContain('bodySecond');
    // body 標籤本身不在；
    expect(note.bodyHtml).not.toContain('<body');
    expect(note.bodyHtml).not.toContain('</body>');
  });

  // 共用樣式規則被抽掉、頁面獨有的留下；
  it('pageCss 移除 .card、保留 .my-chart', () => {
    // 解析（預設讀真實主題）；
    const note = parseHtmlNote(page);
    // 獨有規則留下；
    expect(note.pageCss).toContain('.my-chart');
    // 共用規則消失；
    expect(note.pageCss).not.toContain('.card');
  });

  // 也可以明確傳入共用集合；
  it('第二個參數可傳入自訂的共用集合', () => {
    // 這次 .my-chart 當共用；
    const note = parseHtmlNote(page, new Set(['.my-chart']));
    // .card 因為不在集合內而保留；
    expect(note.pageCss).toContain('.card');
    expect(note.pageCss).not.toContain('.my-chart');
  });

  // data-override 區塊整段保留、不修剪、排在最後；
  it('data-override 區塊不修剪且排在所有一般樣式之後', () => {
    // 覆寫區塊在文件中間，一般樣式在它前後各一個；
    const html =
      '<head><style>.my-a{x:1}</style><style data-override>.card{color:green}</style><style>.my-b{y:2}</style></head><body></body>';
    // 解析；
    const css = parseHtmlNote(html).pageCss;
    // .card 在覆寫區塊內不被修剪；
    expect(css).toContain('.card{color:green}');
    // 順序：兩個一般樣式都在覆寫之前；
    expect(css.indexOf('.my-a')).toBeLessThan(css.indexOf('.card{color:green}'));
    expect(css.indexOf('.my-b')).toBeLessThan(css.indexOf('.card{color:green}'));
  });

  // 多個一般 <style> 依文件順序串接；
  it('多個 <style> 依文件順序串接', () => {
    // 輸入兩個樣式；
    const css = parseHtmlNote('<head><style>.my-a{x:1}</style></head><body><style>.my-b{y:2}</style></body>').pageCss;
    // a 在 b 前面；
    expect(css.indexOf('.my-a')).toBeLessThan(css.indexOf('.my-b'));
  });

  // 有 media 屬性的 <style> 要包回 @media，不然會變成永遠生效；
  it('<style media="print"> 包成 @media print', () => {
    // 解析；
    const css = parseHtmlNote('<head><style media="print">.my{x:1}</style></head><body></body>').pageCss;
    // 含 @media print；
    expect(css).toContain('@media print');
    expect(css).toContain('.my');
    // 合法 CSS；
    reparse(css);
  });

  // 全是共用規則的頁面，pageCss 為空字串；
  it('所有規則都共用時 pageCss 為空字串', () => {
    expect(parseHtmlNote('<head><style>.card{a:b}</style></head><body></body>').pageCss.trim()).toBe('');
  });

  // 非共用樣式表連結才進 pageStylesheets；
  it('pageStylesheets 只含非共用的樣式表連結', () => {
    expect(parseHtmlNote(page).pageStylesheets).toEqual(['https://fonts.example/a.css']);
  });

  // 共用腳本被濾掉（任意路徑前綴、有無查詢字串）；
  it('共用腳本依檔名過濾，不論路徑前綴與查詢字串', () => {
    // 解析；
    const scripts = parseHtmlNote(page).pageScripts;
    // 剩 3 個：CDN、head inline、body inline；
    expect(scripts).toHaveLength(3);
    // 沒有任何一個 src 指向共用腳本；
    expect(scripts.some((s) => s.src?.includes('notes.js'))).toBe(false);
    expect(scripts.some((s) => s.src?.includes('note-mask.js'))).toBe(false);
  });

  // 五個共用腳本檔名都要被過濾；
  it('notes.js、note-mask.js、note-quiz.js、toc.js、wikilink.js 都被過濾', () => {
    // 各用不同前綴與查詢字串；
    const html =
      '<body><script src="a/notes.js"></script><script src="./note-mask.js?v=1"></script>' +
      '<script src="/x/y/note-quiz.js#h"></script><script src="toc.js"></script><script src="../wikilink.js?a=b"></script>' +
      '<script src="page-notes.js"></script></body>';
    // 只剩名字不同的 page-notes.js；
    expect(parseHtmlNote(html).pageScripts.map((s) => s.src)).toEqual(['page-notes.js']);
  });

  // CDN 腳本保留，屬性完整；
  it('CDN 腳本保留並帶著 defer、crossorigin、integrity', () => {
    // 找出 CDN 那個；
    const cdn = parseHtmlNote(page).pageScripts.find((s) => s.src === 'https://cdn.example/lib.js');
    // 存在；
    expect(cdn).toBeDefined();
    // 屬性完整；
    expect(cdn?.attrs).toEqual({
      src: 'https://cdn.example/lib.js',
      defer: '',
      crossorigin: 'anonymous',
      integrity: 'sha384-abc',
    });
    // 外部腳本沒有 inline；
    expect(cdn?.inline).toBeUndefined();
  });

  // head 的腳本在 body 之前，各自維持文件順序；
  it('pageScripts 順序：head（外部、inline）在前，body 的在後', () => {
    // 解析並取每個腳本的辨識文字；
    const labels = parseHtmlNote(page).pageScripts.map((s) => s.src ?? s.inline);
    // 順序固定；
    expect(labels).toEqual(['https://cdn.example/lib.js', 'window.headFirst = 1;', 'window.bodySecond = 2;']);
  });

  // inline 腳本內容逐字保留（CRLF、像標籤的字串、註解都不能動）；
  it('inline 腳本內容逐位元組保留', () => {
    // 內容刻意放 CRLF、字串中的 </p>、<!-- 與 && ；
    const code = '\r\nconst a = "</p>";\r\nif (a && 1 < 2) { /* <!-- */ }\r\n';
    // 包進 body；
    const scripts = parseHtmlNote(`<body><script type="module">${code}</script></body>`).pageScripts;
    // 內容與屬性都在；
    expect(scripts).toHaveLength(1);
    expect(scripts[0].inline).toBe(code);
    expect(scripts[0].attrs).toEqual({ type: 'module' });
  });

  // 同一頁多個 inline 腳本都保留且順序不變（R23：絕不刪除）；
  it('多個 inline 腳本全數保留並維持順序', () => {
    // 三個 inline，穿插在 body 內容之間；
    const html = '<body><script>one()</script><p>x</p><script>two()</script><script>three()</script></body>';
    // 取出內容；
    expect(parseHtmlNote(html).pageScripts.map((s) => s.inline)).toEqual(['one()', 'two()', 'three()']);
  });

  // bodyHtml 逐字保真：實體、CRLF、自閉合標籤、屬性引號、pre 空白、內嵌 SVG；
  it('bodyHtml 保留作者原本的標記（實體、CRLF、自閉合、pre、SVG）', () => {
    // 內層原文；
    const inner =
      "\r\n<p>&copy; &lt;x&gt; &amp; &nbsp;</p>\r\n<br/><img src='a.png' alt=x>\r\n" +
      '<pre>\n  keep   spaces\n</pre>\r\n<svg viewBox="0 0 1 1"><title>t</title><path d="M0 0"/></svg>\r\n';
    // 包上 body 與一個要被移除的 script；
    const note = parseHtmlNote(`<html><body>${inner}<script>x()</script></body></html>`);
    // 去掉 script 後應與原文完全一致；
    expect(note.bodyHtml).toBe(inner);
  });

  // script 在中間時，只切掉 script 本身，前後文字原樣相連；
  it('移除中間的 script 與 style 後，前後內容原樣相連', () => {
    // 輸入；
    const note = parseHtmlNote('<body><p>前</p><script>a()</script><style>.my{x:1}</style><p>後</p></body>');
    // 輸出；
    expect(note.bodyHtml).toBe('<p>前</p><p>後</p>');
  });

  // body 內的共用樣式連結也移除，由 layout 供應，避免重複載入；
  it('body 內的樣式表連結不留在 bodyHtml，並收進 pageStylesheets 或被忽略', () => {
    // 一個共用、一個非共用；
    const note = parseHtmlNote(
      '<body><link rel="stylesheet" href="notes.css"><link rel="stylesheet" href="x.css"><p>a</p></body>',
    );
    // bodyHtml 只剩段落；
    expect(note.bodyHtml).toBe('<p>a</p>');
    // 非共用的收進 pageStylesheets；
    expect(note.pageStylesheets).toEqual(['x.css']);
  });

  // 缺 </body> 與 </html>；
  it('缺 </body> 不丟錯，bodyHtml 取到文件結尾', () => {
    // 輸入；
    const note = parseHtmlNote('<html><body class="a"><p>y</p><script>z()</script>');
    // 內容；
    expect(note.bodyHtml).toBe('<p>y</p>');
    expect(note.bodyAttrs).toEqual({ class: 'a' });
    expect(note.pageScripts.map((s) => s.inline)).toEqual(['z()']);
  });

  // 有 </html> 但沒有 </body>，結尾標籤不該混進 bodyHtml；
  it('缺 </body> 但有 </html> 時，</html> 不混進 bodyHtml', () => {
    expect(parseHtmlNote('<html><body><p>y</p></html>').bodyHtml).toBe('<p>y</p>');
  });

  // 沒有 head；
  it('沒有 <head> 的文件可解析', () => {
    // 輸入；
    const note = parseHtmlNote('<html><body><h1>T</h1></body></html>');
    // 標題退回 h1；
    expect(note.title).toBe('T');
    expect(note.bodyHtml).toBe('<h1>T</h1>');
  });

  // 沒有 doctype；
  it('沒有 doctype 的文件可解析', () => {
    expect(parseHtmlNote('<html lang="en"><head><title>A</title></head><body><p>x</p></body></html>').title).toBe('A');
  });

  // 沒有 body 的片段：整段扣掉 script 與 style；
  it('沒有 <body> 的片段：bodyHtml 是整段扣掉 script 與 style', () => {
    // 輸入；
    const note = parseHtmlNote('<div class="wrap"><p>a</p></div><style>.my{x:1}</style><script>s()</script>');
    // 輸出；
    expect(note.bodyHtml).toBe('<div class="wrap"><p>a</p></div>');
    expect(note.pageCss).toContain('.my');
    expect(note.pageScripts.map((s) => s.inline)).toEqual(['s()']);
    expect(note.bodyAttrs).toEqual({});
  });

  // 有 head 但沒有 body：head 與外層標籤不當成內容；
  it('有 <head> 但沒有 <body>：head、doctype 與 html 外殼不進 bodyHtml', () => {
    // 輸入；
    const note = parseHtmlNote('<!DOCTYPE html><html lang="en"><head><title>A</title></head><p>內容</p></html>');
    // 只剩內容；
    expect(note.bodyHtml.trim()).toBe('<p>內容</p>');
    expect(note.title).toBe('A');
  });

  // BOM 與空字串；
  it('開頭有 BOM 或輸入為空字串都不丟錯', () => {
    // BOM 開頭；
    const withBom = parseHtmlNote('﻿<body><p>x</p></body>');
    expect(withBom.bodyHtml).toBe('<p>x</p>');
    // 空字串；
    const empty = parseHtmlNote('');
    expect(empty).toEqual({
      title: '',
      lang: '',
      bodyAttrs: {},
      bodyHtml: '',
      pageCss: '',
      pageStylesheets: [],
      pageScripts: [],
    });
  });

  // 純文字、只有開標籤、沒關的 script 與 style 等亂輸入；
  it('各種殘缺輸入都不丟錯', () => {
    // 準備一批壞輸入；
    const inputs = ['just text', '<', '<body', '<body><p>', '<script>unclosed(', '<style>.a{', '</body></html>', '<<<>>>'];
    // 逐一確認；
    for (const input of inputs) {
      expect(() => parseHtmlNote(input), input).not.toThrow();
    }
  });

  // 用真實樣板頁：確認結構、共用規則被抽掉、頁面自己的 inline script 仍在；
  it('真實樣板頁：結構正確、script 保留', () => {
    // 讀樣板檔；
    const html = readFileSync(
      path.join(repoRoot, 'backend', 'Session-Token-Cookie-認證系列', '1-Cookie-與-Session.html'),
      'utf8',
    );
    // 解析；
    const note = parseHtmlNote(html);
    // 標題非空；
    expect(note.title.length).toBeGreaterThan(0);
    // 主結構在 bodyHtml；
    expect(note.bodyHtml).toContain('class="wrap"');
    expect(note.bodyHtml).not.toContain('<script');
    // 該頁至少有一個 inline script，且原文逐字等於來源中的那段；
    const inline = note.pageScripts.filter((s) => s.inline !== undefined);
    expect(inline.length).toBeGreaterThan(0);
    for (const script of inline) {
      expect(html).toContain(script.inline as string);
    }
    // pageCss 不再含共用的 .card 規則；
    expect(reparse(note.pageCss).nodes.some((n) => n.type === 'rule' && n.selector === '.card')).toBe(false);
  });
});
