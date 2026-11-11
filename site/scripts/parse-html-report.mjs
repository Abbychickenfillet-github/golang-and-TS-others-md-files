// 匯入 fs 的 promise 版 API，用來讀每一篇 html 筆記；`import * as` 把整個模組收進命名空間 fs；
import * as fs from 'node:fs/promises';
// 匯入 path 模組，用來把相對路徑解析成絕對路徑與組合檔案路徑；
import * as path from 'node:path';
// 匯入 postcss 的預設匯出，用它解析 pageCss 來統計還剩哪些選擇器與自訂屬性；
import postcss from 'postcss';
// 匯入 content.ts 的函式；Node 24 內建「型別剝除」，可直接匯入 .ts 檔，所以副檔名要寫完整；
import { listNotes, loadExclude } from '../src/lib/content.ts';
// 匯入本任務的解析函式；
import { parseHtmlNote } from '../src/lib/parse-html.ts';

// 筆記根目錄：優先讀環境變數 NOTES_ROOT，沒有就用上一層（repo 根目錄）；`??` 只在左邊是 undefined 或 null 時才取右邊；
const root = path.resolve(process.env.NOTES_ROOT ?? '..');
// 排除清單取自根目錄的 _config.yml，不另寫一份；
const exclude = await loadExclude(path.join(root, '_config.yml'));
// 掃描整個筆記庫，只留下已發布的 .html；filter 保留回傳 true 的元素；
const notes = (await listNotes(root, exclude)).filter((n) => n.kind === 'html');

// 失敗清單，每筆是 { file, message }；
const failures = [];
// 成功解析的篇數；
let parsed = 0;
// pageCss 非空與為空的篇數；
let cssNonEmpty = 0;
let cssEmpty = 0;
// 修剪前後的 <style> 總位元組數；
let bytesBefore = 0;
let bytesAfter = 0;
// 含 data-override 的篇數；
let withOverride = 0;
// 頁面腳本的總數：內嵌與外部；
let inlineScripts = 0;
let externalScripts = 0;
// 修剪後 pageCss 仍含 :root 規則的篇數（代表該頁有自己獨有的變數）；
let withOwnRoot = 0;
// 統計「有幾頁含這個選擇器」與「有幾頁含這個自訂屬性」；Map 的鍵是字串、值是篇數；
const selectorPages = new Map();
const propPages = new Map();

// 比對 <style ...>內容</style> 的正規表示式；`[\s\S]*?` 是跨行的最短比對，flag g 讓 matchAll 找出全部，i 不分大小寫；
const STYLE_RE = /<style\b([^>]*)>([\s\S]*?)<\/style>/gi;

// 逐篇處理；for...of 搭配 await 會依序讀檔；
for (const note of notes) {
  // 組出檔案的絕對路徑；
  const file = path.join(root, ...note.relPath.split('/'));
  // try/catch：單篇失敗只記錄，不中斷整體統計；
  try {
    // 讀檔成 UTF-8 字串；
    const html = await fs.readFile(file, 'utf8');
    // 解析（預設共用集合從 NOTES_ROOT 的 assets/note-theme.css 讀）；
    const result = parseHtmlNote(html);
    // 成功篇數加一；
    parsed += 1;
    // 統計原始 <style> 位元組與是否有 data-override；
    let hasOverride = false;
    // matchAll 回傳每個符合的 <style> 區塊；match[1] 是屬性字串，match[2] 是內容；
    for (const match of html.matchAll(STYLE_RE)) {
      // Buffer.byteLength 算 UTF-8 位元組數（中文一字 3 個位元組）；
      bytesBefore += Buffer.byteLength(match[2], 'utf8');
      // 屬性字串含 data-override 就標記；
      if (/\bdata-override\b/i.test(match[1])) hasOverride = true;
    }
    // 含覆寫的篇數；
    if (hasOverride) withOverride += 1;
    // 修剪後的位元組數（含 data-override 與 media 包裝）；
    bytesAfter += Buffer.byteLength(result.pageCss, 'utf8');
    // pageCss 是否為空；
    if (result.pageCss.trim() === '') cssEmpty += 1;
    else cssNonEmpty += 1;
    // 腳本分類統計；
    for (const script of result.pageScripts) {
      // 有 src 算外部，否則算內嵌；
      if (script.src !== undefined) externalScripts += 1;
      else inlineScripts += 1;
    }
    // 解析 pageCss 統計殘留的選擇器與自訂屬性；每頁每個鍵只算一次，所以用 Set 去重；
    const selectorsHere = new Set();
    const propsHere = new Set();
    // 解析失敗（例如 media 包裝後的壞 CSS）也不丟出來，視為這頁沒有統計；
    try {
      // 解析成語法樹；
      const tree = postcss.parse(result.pageCss);
      // 走訪每條規則；
      tree.walkRules((rule) => {
        // @keyframes 裡的 from／to 不是選擇器，跳過；
        if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
        // rule.selectors 已依逗號拆好；
        for (const selector of rule.selectors) {
          // 收空白後記錄；
          selectorsHere.add(selector.trim().replace(/\s+/g, ' '));
          // :root 規則存在就記下來並統計它宣告的自訂屬性；
          if (selector.trim() === ':root') {
            // 走訪宣告；
            rule.walkDecls((decl) => {
              // 自訂屬性以 -- 開頭；
              if (decl.prop.startsWith('--')) propsHere.add(decl.prop);
            });
          }
        }
      });
      // 有 :root 規則就算「有自己的變數」；
      if (selectorsHere.has(':root')) withOwnRoot += 1;
    } catch {
      // 忽略單頁的 CSS 解析失敗；
    }
    // 把這頁的鍵累加進全域統計；
    for (const s of selectorsHere) selectorPages.set(s, (selectorPages.get(s) ?? 0) + 1);
    for (const p of propsHere) propPages.set(p, (propPages.get(p) ?? 0) + 1);
  } catch (error) {
    // 記錄失敗檔與訊息；`error instanceof Error` 判斷是不是 Error 物件才能讀 message；
    failures.push({ file: note.relPath, message: error instanceof Error ? error.message : String(error) });
  }
}

// 工具函式：把 Map 依次數由大到小排序後取前 n 筆；`[...map]` 展開成 [鍵, 值] 陣列；
function top(map, n) {
  // sort 的比較函式回傳負數表示 a 排前面，所以用 b 減 a 做遞減；次數相同時依字母順序穩定輸出；
  return [...map].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}

// 印出摘要；
console.log(`root: ${root}`);
console.log(`published html notes: ${notes.length}`);
console.log(`parsed: ${parsed}`);
console.log(`threw: ${failures.length}`);
// 最多列出前 5 筆失敗；
for (const f of failures.slice(0, 5)) console.log(`  - ${f.file}: ${f.message}`);
console.log(`pageCss non-empty: ${cssNonEmpty}`);
console.log(`pageCss empty: ${cssEmpty}`);
console.log(`<style> bytes before pruning: ${bytesBefore}`);
console.log(`<style> bytes after pruning: ${bytesAfter}`);
// 縮減比例，避免除以零；toFixed(1) 取小數一位；
console.log(`reduction: ${bytesBefore === 0 ? 'n/a' : (((bytesBefore - bytesAfter) / bytesBefore) * 100).toFixed(1)}%`);
console.log(`notes with data-override: ${withOverride}`);
console.log(`notes whose pageCss still has its own :root: ${withOwnRoot}`);
console.log(`pageScripts inline: ${inlineScripts}`);
console.log(`pageScripts external: ${externalScripts}`);
console.log(`distinct remaining selectors: ${selectorPages.size}`);
// 前 15 名殘留選擇器（以「含它的頁數」排序）；
console.log('top 15 remaining selectors (pages):');
for (const [selector, count] of top(selectorPages, 15)) console.log(`  ${String(count).padStart(4)}  ${selector}`);
// 前 10 名殘留自訂屬性；
console.log('top 10 remaining custom properties (pages):');
for (const [prop, count] of top(propPages, 10)) console.log(`  ${String(count).padStart(4)}  ${prop}`);
