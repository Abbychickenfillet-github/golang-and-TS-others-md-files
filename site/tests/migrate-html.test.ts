// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本檔只測字串處理與讀檔，不需要 jsdom，改用 node 環境；
// 從 vitest 匯入測試骨架：describe 分組、it 定義單一案例、expect 斷言；
import { describe, expect, it } from 'vitest';
// 匯入 Node 內建的同步讀檔函式，測試要讀真實的共用樣式與樣板頁；
import { readFileSync } from 'node:fs';
// 匯入 path 模組，用 resolve 組出絕對路徑；
import * as path from 'node:path';
// 匯入被測模組：遷移函式、相對路徑計算與共用集合載入；
import { assetsRelPath, migrateHtml } from '../src/lib/migrate-html';
// 匯入顏色統一函式：已提交的樣板頁是「遷移＋顏色統一」兩步的結果；
import { unifyHtmlColors } from '../src/lib/unify-colors';
// 匯入 parse-html 的修剪函式與共用集合工具，測「保留註解」選項與預設行為不變；
import { pruneSharedRules, pruneSharedRulesDetailed, sharedSelectorsOf } from '../src/lib/parse-html';

// vitest 從 site/ 執行，所以 `..` 是 repo 根目錄；
const repoRoot = path.resolve(process.cwd(), '..');
// 真實共用集合：note-theme.css 與 notes.css 的聯集（與網站建置相同）；
const realShared = sharedSelectorsOf(['note-theme.css', 'notes.css'].map((name) => readFileSync(path.join(repoRoot, 'assets', name), 'utf8')));
// 合成共用集合：讓大部分測試不依賴真實主題的內容；
const shared = new Set(['.card', '.toc', '--bg', '--ink']);
// 兩個固定的相對路徑前綴，測試常用；
const REL = '../assets/';
// 連結與腳本標籤的產生器，讓期望字串不用重複寫；
const themeLink = `<link rel="stylesheet" href="${REL}note-theme.css">`;
const notesLink = `<link rel="stylesheet" href="${REL}notes.css">`;
const notesScript = `<script src="${REL}notes.js"></script>`;
const maskScript = `<script src="${REL}note-mask.js"></script>`;

// 工具：組出一份最小的 html 筆記；head 與 body 由參數決定，換行符號可選（預設 LF）；
function page(head: string, body = '<p>x</p>\n', eol = '\n'): string {
  // 用陣列逐行組出，最後以 eol 連接並補結尾換行；head 與 body 的行內換行也一併換成 eol；
  const text = ['<!DOCTYPE html>', '<html lang="zh-TW">', '<head>', '<meta charset="utf-8">', `${head}</head>`, '<body>', `${body}</body>`, '</html>', ''].join('\n');
  // 把全部的 \n 換成指定的換行符號；
  return eol === '\n' ? text : text.replace(/\n/g, eol);
}

// 第一組：相對路徑計算；
describe('assetsRelPath', () => {
  // 深度 0 到 3；
  it('依檔案所在深度算出 ../ 鏈', () => {
    // 根目錄的檔案直接是 assets/；
    expect(assetsRelPath('a.html')).toBe('assets/');
    // 一層資料夾；
    expect(assetsRelPath('x/a.html')).toBe('../assets/');
    // 兩層；
    expect(assetsRelPath('x/y/a.html')).toBe('../../assets/');
    // 三層；
    expect(assetsRelPath('x/y/z/a.html')).toBe('../../../assets/');
  });

  // 反斜線與開頭的 ./ 也要處理；
  it('接受反斜線與開頭的 ./', () => {
    // Windows 路徑；
    expect(assetsRelPath('x\\y\\a.html')).toBe('../../assets/');
    // 開頭的 ./ 不算一層；
    expect(assetsRelPath('./x/a.html')).toBe('../assets/');
  });
});

// 第二組：保留註解的修剪選項（migrateHtml 的基礎）；
describe('pruneSharedRulesDetailed（keepComments）', () => {
  // 預設行為不變：註解全部丟掉；
  it('pruneSharedRules 預設仍丟掉註解', () => {
    // 同一份輸入；
    const out = pruneSharedRules('/* a */\n.card{x:1}\n.mine{y:2} /* b */', shared);
    // 沒有任何註解；
    expect(out).toBe('.mine{y:2}');
  });

  // 開啟 keepComments：原格式與註解保留，被移除規則的區段標題註解一併拿掉；
  it('keepComments 保留倖存規則的格式與註解，孤兒區段標題註解被丟掉', () => {
    // 兩個區段：第一段全是共用規則，第二段有頁面獨有規則與行尾註解；
    const css = '\n/* ===== 版面 ===== */\n.card{color:red}\n/* ===== 我的 ===== */\n.mine{color:blue} /* 行尾 */\n.card .x{margin:0}\n';
    // 修剪；
    const result = pruneSharedRulesDetailed(css, shared, { keepComments: true });
    // 解析成功；
    expect(result).not.toBeNull();
    // 倖存的文字逐字相同（含前後換行與註解）；
    expect(result?.css).toBe('\n/* ===== 我的 ===== */\n.mine{color:blue} /* 行尾 */\n.card .x{margin:0}\n');
    // 移除了一條規則，名稱是 .card；
    expect(result?.tally.rulesRemoved).toBe(1);
    expect(result?.tally.selectorsRemoved).toEqual(['.card']);
  });

  // 無法解析回傳 null；
  it('無法解析回傳 null', () => {
    // 少一個右大括號；
    expect(pruneSharedRulesDetailed('.a{color:red', shared, { keepComments: true })).toBeNull();
  });
});

// 第三組：<style> 的修剪；
describe('migrateHtml：style 區塊', () => {
  // 基本：共用規則被移除、頁面獨有的留下，且插入連結與腳本；
  it('移除共用規則、保留獨有規則，並補上連結與腳本', () => {
    // 輸入；
    const input = page('<style>\n.card{color:red}\n.mine{color:blue}\n</style>\n');
    // 遷移；
    const result = migrateHtml(input, REL, shared);
    // 預期輸出：連結在 style 之前、腳本在 </body> 之前；
    expect(result.html).toBe(
      page(`${themeLink}\n${notesLink}\n<style>\n.mine{color:blue}\n</style>\n`, `<p>x</p>\n${notesScript}\n${maskScript}\n`),
    );
    // 有變更；
    expect(result.changed).toBe(true);
    // 統計：移除一條規則；連結與腳本的清單；
    expect(result.stats.rulesRemoved).toBe(1);
    expect(result.stats.linksAdded).toEqual([`${REL}note-theme.css`, `${REL}notes.css`]);
    expect(result.stats.scriptsAdded).toEqual([`${REL}notes.js`, `${REL}note-mask.js`]);
    // 位元組統計：前 33 位元組、後 18 位元組（以 UTF-8 計）；
    expect(result.stats.styleBytesBefore).toBe(Buffer.byteLength('\n.card{color:red}\n.mine{color:blue}\n', 'utf8'));
    expect(result.stats.styleBytesAfter).toBe(Buffer.byteLength('\n.mine{color:blue}\n', 'utf8'));
  });

  // 作者的註解與縮排保留；
  it('保留倖存規則的註解與原格式', () => {
    // 含註解與多行格式；
    const style = '<style>\n/* 我的樣式 */\n.mine{\n  color:blue; /* 藍 */\n}\n.card{color:red}\n</style>\n';
    // 遷移；
    const result = migrateHtml(page(style), REL, shared);
    // style 區塊只少了 .card 那行；
    expect(result.html).toContain('<style>\n/* 我的樣式 */\n.mine{\n  color:blue; /* 藍 */\n}\n</style>\n');
  });

  // :root 逐宣告修剪：共用的自訂屬性拿掉，頁面獨有的留下，第一個倖存宣告換到新的一行；
  it(':root 只拿掉共用自訂屬性，保留頁面獨有的（例如 --mine）', () => {
    // 兩個共用屬性（--bg、--ink）與兩個獨有（--mine、--other）；
    const style = '<style>\n:root{\n  --bg:#fff; --ink:#000; --mine:#123;\n  --other:#456;\n}\n</style>\n';
    // 遷移；
    const result = migrateHtml(page(style), REL, shared);
    // 預期：--mine 換到第一行、縮排與原本第一行相同；
    expect(result.html).toContain('<style>\n:root{\n  --mine:#123;\n  --other:#456;\n}\n</style>\n');
    // 統計：兩個自訂屬性，名稱按文件順序；
    expect(result.stats.customPropsRemoved).toBe(2);
    expect(result.stats.removedCustomProps).toEqual(['--bg', '--ink']);
    // :root 本身沒被整條移除；
    expect(result.stats.rulesRemoved).toBe(0);
  });

  // 全是共用屬性的 :root 整條移除；
  it(':root 內宣告全是共用的，整條規則移除', () => {
    // 只有一條 :root 與一條獨有規則；
    const result = migrateHtml(page('<style>\n:root{--bg:#fff;--ink:#000}\n.mine{a:b}\n</style>\n'), REL, shared);
    // :root 不見了；
    expect(result.html).toContain('<style>\n.mine{a:b}\n</style>\n');
    // 算一條規則被移除；
    expect(result.stats.rulesRemoved).toBe(1);
  });

  // data-override 區塊原封不動，即使內含共用規則；
  it('data-override 區塊逐位元組保留', () => {
    // 一般區塊 + 覆寫區塊；
    const override = '<style data-override>\n.card{color:green}\n</style>\n';
    // 遷移；
    const result = migrateHtml(page(`<style>\n.card{a:b}\n.mine{c:d}\n</style>\n${override}`), REL, shared);
    // 覆寫區塊整段仍在；
    expect(result.html).toContain(override);
    // 覆寫區塊算在前後位元組內，沒有改變；
    expect(result.stats.styleBytesBefore - result.stats.styleBytesAfter).toBe(Buffer.byteLength('.card{a:b}\n', 'utf8'));
  });

  // 無法解析的區塊保留原樣，不丟錯，其他區塊照常處理；
  it('無法解析的 style 原樣保留且不丟錯', () => {
    // 第一個區塊壞掉（少右大括號），第二個正常；
    const bad = '<style>\n.card{color:red\n</style>\n';
    // 遷移；
    const result = migrateHtml(page(`${bad}<style>\n.card{a:b}\n.mine{c:d}\n</style>\n`), REL, shared);
    // 壞區塊原樣；
    expect(result.html).toContain(bad);
    // 好區塊被修剪；
    expect(result.html).toContain('<style>\n.mine{c:d}\n</style>\n');
  });

  // 修剪後沒有任何規則的 style 整個移除（含標籤與它佔的那一行），不留空行；
  it('清空的 style 連標籤與換行一起移除', () => {
    // 只有共用規則；
    const result = migrateHtml(page('<style>\n.card{a:b}\n.toc{c:d}\n</style>\n'), REL, shared);
    // 連結取代了 style 的位置，沒有空行；
    expect(result.html).toBe(page(`${themeLink}\n${notesLink}\n`, `<p>x</p>\n${notesScript}\n${maskScript}\n`));
    // 結尾位元組為 0；
    expect(result.stats.styleBytesAfter).toBe(0);
  });

  // 縮排的 style 被移除時，連行首縮排一起拿掉；連結沿用同樣縮排；
  it('縮排的清空 style 移除後，連結沿用相同縮排', () => {
    // 兩格縮排的 head 內容；
    const head = '  <style>\n  .card{a:b}\n  </style>\n';
    // 遷移；
    const result = migrateHtml(page(head), REL, shared);
    // 連結帶兩格縮排；
    expect(result.html).toContain(`<meta charset="utf-8">\n  ${themeLink}\n  ${notesLink}\n</head>`);
  });

  // 有 media 屬性的 style 保留屬性；
  it('<style media> 保留 media 屬性', () => {
    // 含 media 的區塊；共用集合帶 print 條件的 .card（R37：<style media> 內以該條件比對，頂層的 .card 不算）；
    const result = migrateHtml(page('<style media="print">\n.card{a:b}\n.mine{c:d}\n</style>\n'), REL, new Set(['media print|.card']));
    // 標籤原樣、內容被修剪；
    expect(result.html).toContain('<style media="print">\n.mine{c:d}\n</style>\n');
  });

  // 沒有可移除的規則時，style 逐位元組不變；
  it('沒有共用規則的 style 不變', () => {
    // 輸入；
    const style = '<style>\n.mine{a:b}\n</style>\n';
    // 遷移；
    const result = migrateHtml(page(style), REL, shared);
    // 原樣還在；
    expect(result.html).toContain(style);
    // 沒移除任何規則；
    expect(result.stats.rulesRemoved).toBe(0);
  });
});

// 第三之二組：修剪的細節；
describe('migrateHtml：修剪細節', () => {
  // 選擇器清單只有一部分是共用的：只拿掉共用的那個；
  it('選擇器清單部分共用時只拿掉共用的選擇器', () => {
    // `.card, .mine` 只有 .card 是共用；
    const result = migrateHtml(page('<style>\n.card, .mine{a:b}\n</style>\n'), REL, shared);
    // 剩 .mine，規則本身沒被整條移除；
    expect(result.html).toContain('<style>\n.mine{a:b}\n</style>\n');
    expect(result.stats.rulesRemoved).toBe(0);
    expect(result.stats.removedSelectors).toEqual(['.card']);
  });

  // 只剩註解的 style 視為沒有規則，整個移除；
  it('修剪後只剩註解的 style 整個移除', () => {
    // 註解加共用規則；
    const result = migrateHtml(page('<style>\n/* 版面 */\n.card{a:b}\n</style>\n'), REL, shared);
    // 沒有 style；
    expect(result.html).not.toContain('<style');
    // 沒有殘留註解；
    expect(result.html).not.toContain('版面');
  });

  // 原本就沒有規則的 style（只有註解或空白）不動；
  it('原本就沒有規則的 style 原樣保留', () => {
    // 只有註解；
    const style = '<style>\n/* 只有註解 */\n</style>\n';
    // 遷移；
    const result = migrateHtml(page(style), REL, shared);
    // 原樣；
    expect(result.html).toContain(style);
  });

  // @media 內全被移除就連 @media 一起移除；@keyframes 保留；授權註解保留；
  it('@media 清空後移除、@keyframes 與授權註解保留', () => {
    // 輸入；
    const css = '/*! license */\n@media print{.card{a:b}}\n@keyframes k{from{a:b}to{a:c}}\n.mine{x:y}\n';
    // 遷移；
    const result = migrateHtml(page(`<style>\n${css}</style>\n`), REL, new Set(['media print|.card']));
    // 授權註解、keyframes、獨有規則都在；@media 不見了（R37 調整：共用集合要有 print 條件的 .card 才會被抽掉）；
    expect(result.html).toContain('<style>\n/*! license */\n@keyframes k{from{a:b}to{a:c}}\n.mine{x:y}\n</style>\n');
  });

  // 缺結尾標籤的 style 不處理也不丟錯；
  it('缺結尾標籤的 <style> 原樣保留', () => {
    // 沒有 </style>；
    const input = '<html>\n<head>\n<style>\n.card{a:b}\n</head>\n<body>\n</body>\n</html>\n';
    // 遷移；
    const result = migrateHtml(input, REL, shared);
    // 內容沒被改；
    expect(result.html).toContain('<style>\n.card{a:b}\n</head>');
  });
});

// 第四組：連結的位置與去重；
describe('migrateHtml：link 標籤', () => {
  // 已有 notes.css（在 style 之前）：它留在原處，只在它前面補主題連結；
  it('已有 notes.css 連結時只補主題連結，放在它前面', () => {
    // head：notes.css 連結 + style + defer 的 notes.js；
    const head = `${notesLink}\n<style>\n.mine{a:b}\n</style>\n<script src="${REL}notes.js" defer></script>\n`;
    // 遷移；
    const result = migrateHtml(page(head), REL, shared);
    // 主題連結在 notes.css 之前，其餘不動；
    expect(result.html).toContain(`<meta charset="utf-8">\n${themeLink}\n${notesLink}\n<style>`);
    // 統計只有主題連結；
    expect(result.stats.linksAdded).toEqual([`${REL}note-theme.css`]);
    // notes.js（有 defer）已存在，不重複補；note-mask.js 補上；
    expect(result.stats.scriptsAdded).toEqual([`${REL}note-mask.js`]);
    // 整份只有一個 notes.js；
    expect(result.html.match(/notes\.js/g)?.length).toBe(1);
  });

  // notes.css 連結在 style 之後：主題連結仍放在第一個 style 之前；
  it('notes.css 在 style 之後時，主題連結放在第一個 style 之前', () => {
    // head：style 在前、notes.css 在後；
    const result = migrateHtml(page(`<style>\n.mine{a:b}\n</style>\n${notesLink}\n`), REL, shared);
    // 主題連結在 style 前，notes.css 在原位；
    expect(result.html).toContain(`<meta charset="utf-8">\n${themeLink}\n<style>\n.mine{a:b}\n</style>\n${notesLink}\n</head>`);
  });

  // 以檔名辨識已存在的連結，不管路徑、查詢字串與大小寫；
  it('以檔名辨識既有連結（含查詢字串與不同路徑）', () => {
    // 兩個連結都用不同寫法；
    const head = '<link rel="stylesheet" href="/x/y/Notes.CSS?v=3">\n<style>\n.mine{a:b}\n</style>\n';
    // 遷移；
    const result = migrateHtml(page(head), REL, shared);
    // 只補主題連結；
    expect(result.stats.linksAdded).toEqual([`${REL}note-theme.css`]);
  });

  // 沒有任何 style：連結放在 </head> 之前；
  it('沒有 style 時連結放在 </head> 之前', () => {
    // 空 head；
    const result = migrateHtml(page(''), REL, shared);
    // 連結在 </head> 之前一行；
    expect(result.html).toContain(`<meta charset="utf-8">\n${themeLink}\n${notesLink}\n</head>`);
  });

  // 沒有 head：連結放在 <body 之前；
  it('沒有 head 時連結放在 <body 之前', () => {
    // 有 html 與 body、沒有 head；
    const input = '<html lang="zh-TW">\n<body>\n<p>x</p>\n</body>\n</html>\n';
    // 遷移；
    const result = migrateHtml(input, REL, shared);
    // 連結在 <body> 之前；
    expect(result.html).toBe(`<html lang="zh-TW">\n${themeLink}\n${notesLink}\n<body>\n<p>x</p>\n${notesScript}\n${maskScript}\n</body>\n</html>\n`);
  });

  // 全部都已存在：沒有新增連結；
  it('連結都已存在時 linksAdded 為空', () => {
    // 主題連結已存在會被視為「已遷移」；改測 notes.css 已在、主題缺的反例在上面，這裡測 note-interactive.css 不被當成共用連結；
    const head = `<link rel="stylesheet" href="${REL}note-interactive.css">\n<style>\n.mine{a:b}\n</style>\n`;
    // 遷移；
    const result = migrateHtml(page(head), REL, shared);
    // 兩個連結都補（note-interactive.css 不算 notes.css 或 note-theme.css）；
    expect(result.stats.linksAdded).toHaveLength(2);
    // note-interactive.css 的連結沒被動到；
    expect(result.html).toContain(`<link rel="stylesheet" href="${REL}note-interactive.css">`);
  });
});

// 第五組：腳本的位置與去重；
describe('migrateHtml：script 標籤', () => {
  // 縮排的 </body>：腳本沿用 </body> 的縮排；
  it('腳本沿用 </body> 的縮排', () => {
    // 自己組含縮排的文件；
    const input = '<!DOCTYPE html>\n<html>\n<head>\n</head>\n<body>\n<p>x</p>\n  </body>\n</html>\n';
    // 遷移；
    const result = migrateHtml(input, REL, shared);
    // 兩行腳本帶兩格縮排；
    expect(result.html).toContain(`<p>x</p>\n  ${notesScript}\n  ${maskScript}\n  </body>`);
  });

  // 已有同檔名腳本（含查詢字串與 defer）不重複；note-quiz.js 與 wikilink.js 絕不補；
  it('已存在的腳本不重複，且不補 note-quiz.js 與 wikilink.js', () => {
    // body 內已有 notes.js 與 note-mask.js（其一帶查詢字串）；
    const body = `<p>x</p>\n<script src="../../assets/notes.js" defer></script>\n<script src="${REL}note-mask.js?v=2"></script>\n`;
    // 遷移（head 是空的，所以連結仍會被加）；
    const result = migrateHtml(page('', body), REL, shared);
    // 沒補任何腳本；
    expect(result.stats.scriptsAdded).toEqual([]);
    // 輸出不含 note-quiz 與 wikilink；
    expect(result.html).not.toMatch(/note-quiz|wikilink/);
  });

  // 沒有 </body> 但有 </html>：插在 </html> 之前；
  it('沒有 </body> 時腳本插在 </html> 之前', () => {
    // 缺 </body>；
    const input = '<html>\n<head>\n</head>\n<body>\n<p>x</p>\n</html>\n';
    // 遷移；
    const result = migrateHtml(input, REL, shared);
    // 腳本在 </html> 之前；
    expect(result.html).toContain(`<p>x</p>\n${notesScript}\n${maskScript}\n</html>`);
  });

  // 什麼結尾標籤都沒有：附加在文件結尾；
  it('沒有 </body> 與 </html> 時附加在文件結尾', () => {
    // 結尾有換行與沒換行兩種；
    const withNewline = migrateHtml('<html>\n<head>\n</head>\n<body>\n<p>x</p>\n', REL, shared);
    // 結尾有換行：每個標籤後面都接換行；
    expect(withNewline.html.endsWith(`<p>x</p>\n${notesScript}\n${maskScript}\n`)).toBe(true);
    // 結尾沒換行：標籤前面補一個換行、最後不補；
    const without = migrateHtml('<html>\n<head>\n</head>\n<body>\n<p>x</p>', REL, shared);
    // 結尾；
    expect(without.html.endsWith(`<p>x</p>\n${notesScript}\n${maskScript}`)).toBe(true);
  });

  // 內嵌腳本逐位元組不動，即使裡面有看起來像標籤的字串；
  it('內嵌腳本逐位元組不動', () => {
    // 腳本含 </style> 字樣、反斜線與中文；
    const inline = '<script>\nvar s = "</style> <style>.card{a:b}</style>"; // 註解 中文\n</script>\n';
    // 遷移；
    const result = migrateHtml(page('<style>\n.card{a:b}\n.mine{c:d}\n</style>\n', `<p>x</p>\n${inline}`), REL, shared);
    // 內嵌腳本原樣；
    expect(result.html).toContain(inline);
  });
});

// 第六組：位元組層級的保真（換行、BOM、大小寫）；
describe('migrateHtml：保真', () => {
  // CRLF：插入的文字用 CRLF，整份沒有單獨的 LF；
  it('CRLF 檔案：插入的文字用 CRLF，沒有單獨的 LF', () => {
    // 以 CRLF 組出文件；
    const input = page('<style>\n.card{a:b}\n.mine{c:d}\n</style>\n', '<p>x</p>\n', '\r\n');
    // 遷移；
    const result = migrateHtml(input, REL, shared);
    // 有變更；
    expect(result.changed).toBe(true);
    // 負向後顧 (?<!\r)\n 找出前面不是 \r 的 \n；
    expect(/(?<!\r)\n/.test(result.html)).toBe(false);
    // 預期的完整內容；
    expect(result.html).toBe(page(`${themeLink}\n${notesLink}\n<style>\n.mine{c:d}\n</style>\n`, `<p>x</p>\n${notesScript}\n${maskScript}\n`, '\r\n'));
  });

  // LF 為主的檔案不會被插入 CRLF；
  it('LF 檔案不會出現 CR', () => {
    // 遷移 LF 文件；
    const result = migrateHtml(page('<style>\n.card{a:b}\n.mine{c:d}\n</style>\n'), REL, shared);
    // 沒有 \r；
    expect(result.html.includes('\r')).toBe(false);
  });

  // BOM：保留且只有一個；
  it('BOM 保留且只出現在開頭一次', () => {
    // BOM 字元（U+FEFF）：用 String.fromCharCode 產生，不在原始碼放看不見的字面字元；
    const bom = String.fromCharCode(0xfeff);
    // 前面加 BOM；
    const input = `${bom}${page('<style>\n.card{a:b}\n.mine{c:d}\n</style>\n')}`;
    // 遷移；
    const result = migrateHtml(input, REL, shared);
    // 以 BOM 開頭；
    expect(result.html.startsWith(`${bom}<!DOCTYPE`)).toBe(true);
    // 只有一個；
    expect(result.html.split(bom)).toHaveLength(2);
    // 去掉 BOM 之後與沒有 BOM 的結果相同；
    expect(result.html.slice(1)).toBe(migrateHtml(page('<style>\n.card{a:b}\n.mine{c:d}\n</style>\n'), REL, shared).html);
  });

  // 大寫標籤與單行文件；
  it('大寫標籤、單行文件也能處理，標籤大小寫保持', () => {
    // 全大寫、全部在同一行；
    const input = '<HTML><HEAD><STYLE>.card{a:b}.mine{c:d}</STYLE></HEAD><BODY><P>x</P></BODY></HTML>';
    // 遷移；
    const result = migrateHtml(input, REL, shared);
    // 同一行的插入不帶換行；
    expect(result.html).toBe(`<HTML><HEAD>${themeLink}${notesLink}<STYLE>.mine{c:d}</STYLE></HEAD><BODY><P>x</P>${notesScript}${maskScript}</BODY></HTML>`);
  });

  // body 的實體、屬性與腳本逐位元組不變；
  it('body 內的實體與屬性不被改寫', () => {
    // body 帶實體、自閉合標籤與特殊屬性；
    const body = '<p class=a data-x=\'1\'>&copy; &lt;b&gt; <br/> 中文</p>\n<pre>\n  keep</pre>\n';
    // 遷移；
    const result = migrateHtml(page('<style>\n.card{a:b}\n</style>\n', body), REL, shared);
    // body 原文仍在輸出裡；
    expect(result.html).toContain(body);
  });
});

// 第七組：冪等與非筆記頁面；
describe('migrateHtml：冪等與跳過', () => {
  // 已連結 note-theme.css 的頁面原樣回傳；
  it('已連結 note-theme.css 的頁面不變（changed:false）', () => {
    // 先遷移一次；
    const first = migrateHtml(page('<style>\n.card{a:b}\n.mine{c:d}\n</style>\n'), REL, shared);
    // 再遷移一次；
    const second = migrateHtml(first.html, REL, shared);
    // 沒有變更且文字相同；
    expect(second.changed).toBe(false);
    expect(second.html).toBe(first.html);
    // 統計為零；
    expect(second.stats.linksAdded).toEqual([]);
    expect(second.stats.scriptsAdded).toEqual([]);
  });

  // 不同相對路徑的主題連結也算已遷移（以檔名辨識）；
  it('以檔名辨識已遷移，路徑不同也算', () => {
    // 連到別的路徑；
    const input = page('<link rel="stylesheet" href="../../assets/note-theme.css">\n<style>\n.card{a:b}\n</style>\n');
    // 遷移；
    const result = migrateHtml(input, REL, shared);
    // 原樣；
    expect(result.changed).toBe(false);
    expect(result.html).toBe(input);
  });

  // 片段（沒有 <html>）不是筆記頁面：跳過並說明原因；
  it('沒有 <html> 的片段跳過且不丟錯', () => {
    // 一小段 html；
    const input = '<style>.card{a:b}</style><p>hi</p>';
    // 遷移；
    const result = migrateHtml(input, REL, shared);
    // 未變更並附原因；
    expect(result.changed).toBe(false);
    expect(result.html).toBe(input);
    expect(result.stats.skipped).toMatch(/html/);
  });

  // 空字串與殘缺 html 不丟錯；
  it('空字串與殘缺的 html 不丟錯', () => {
    // 空字串；
    expect(migrateHtml('', REL, shared).changed).toBe(false);
    // 殘缺：只有開頭標籤；
    expect(() => migrateHtml('<html><head><style>.card{', REL, shared)).not.toThrow();
  });
});

// 第八組：真實樣板頁；
describe('migrateHtml：真實樣板頁', () => {
  // 樣板頁的相對位置與內容；
  const samplePath = 'backend/Session-Token-Cookie-認證系列/1-Cookie-與-Session-互動版.html';
  // 讀遷移前的原文（固定樣本 tests/fixtures/sample-cookie-session-original.html，取自 ca9f033 之前的版本；樣板頁本身已被遷移）；
  // 工作目錄的樣板頁是 CRLF（git 的 autocrlf 在檢出時轉換），這裡把換行統一成 CRLF 以重現同樣的條件；
  const original = readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'sample-cookie-session-original.html'), 'utf8').replace(/\r?\n/g, '\r\n');

  // 樣板頁在兩層資料夾底下，相對路徑前綴是 ../../assets/；
  const rel = assetsRelPath(samplePath);

  // 相對路徑是兩層；
  it('樣板頁的相對路徑前綴是 ../../assets/', () => {
    // 斷言；
    expect(rel).toBe('../../assets/');
  });

  // 樣式與腳本以外的位元組完全相同；
  it('style 區塊與插入的標籤以外，位元組逐一相同', () => {
    // 執行；
    const result = migrateHtml(original, rel, realShared);
    // 有變更；
    expect(result.changed).toBe(true);
    // 找 <style>…</style> 區塊（含它後面的換行）的正規式；
    const styleRe = /<style>[\s\S]*?<\/style>\r\n/;
    // 原文有一個 style 區塊；
    expect(styleRe.test(original)).toBe(true);
    // 從輸出拿掉插入的連結與腳本行（每個都是整行、CRLF 結尾）；
    const stripped = result.html
      .replace(`<link rel="stylesheet" href="${rel}note-theme.css">\r\n`, '')
      .replace(`<link rel="stylesheet" href="${rel}notes.css">\r\n`, '')
      .replace(`<script src="${rel}notes.js"></script>\r\n`, '')
      .replace(`<script src="${rel}note-mask.js"></script>\r\n`, '');
    // 兩邊都把 style 區塊拿掉（區塊本身被修剪過、不比對內容；若整個被移除，輸出裡沒有區塊，原文的區塊也拿掉）；
    const normalize = (text: string): string => text.replace(styleRe, '');
    // 逐位元組相同；若失敗，vitest 會印出兩邊的差異；
    expect(normalize(stripped)).toBe(normalize(original));
    // 一個換行都不能是單獨的 LF；
    expect(/(?<!\r)\n/.test(result.html)).toBe(false);
  });

  // 頁面獨有的樣式留下、共用的拿掉；
  it('統計有移除的規則與自訂屬性名稱，內嵌腳本逐位元組保留', () => {
    // 遷移；
    const result = migrateHtml(original, rel, realShared);
    // 前後位元組都有值，後者較小；
    expect(result.stats.styleBytesBefore).toBeGreaterThan(result.stats.styleBytesAfter);
    // 有移除規則與自訂屬性；
    expect(result.stats.rulesRemoved).toBeGreaterThan(0);
    expect(result.stats.removedCustomProps).toContain('--bg');
    // 內嵌腳本（測驗與遮罩）逐位元組保留；
    const inline = /<script>[\s\S]*?<\/script>/.exec(original)?.[0] as string;
    expect(result.html).toContain(inline);
  });

  // 資料與工具不能默默分家：已提交的樣板頁必須等於「用目前的工具遷移原檔」的結果（換行統一成 LF 再比，避免檢出時的 autocrlf 影響）；
  // 這個測試失敗代表工具改了但樣板頁沒有重新遷移（或反過來），要用工具重新產生樣板頁並另外 commit；
  it('已提交的樣板頁等於目前工具遷移原檔的結果', () => {
    // 已提交的樣板頁（遷移後的檔案）；
    const committed = readFileSync(path.join(repoRoot, samplePath), 'utf8');
    // 目前工具對原檔的輸出：先遷移，再把寫死的顏色統一成主題變數（兩步都跑過才是已提交的樣子）；
    const expected = unifyHtmlColors(migrateHtml(original, rel, realShared).html).text;
    // 逐字相同（換行正規化）；
    expect(committed.replace(/\r\n/g, '\n')).toBe(expected.replace(/\r\n/g, '\n'));
  });

  // R37：print 規則中共用樣式沒有對應版本的（.toc）要留下；有對應的（.toolbar、.quiz）才抽掉；
  it('樣板頁的 @media print 保留共用樣式沒有 print 版本的 .toc', () => {
    // 遷移；
    const result = migrateHtml(original, rel, realShared);
    // 輸出含 print 區塊與 .toc，不含 .quiz 的 print 規則；
    expect(result.html).toContain('@media print{.toc{display:none}}');
  });

  // 冪等；
  it('樣板頁第二次遷移不再變更', () => {
    // 第一次；
    const first = migrateHtml(original, rel, realShared);
    // 第二次；
    const second = migrateHtml(first.html, rel, realShared);
    // 不變；
    expect(second.changed).toBe(false);
    expect(second.html).toBe(first.html);
  });
});
