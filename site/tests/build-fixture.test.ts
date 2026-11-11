// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本檔在 Node 環境執行（要開子行程跑真正的 npm run build）；
// 匯入 vitest 的測試函式；
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// 匯入 spawnSync：同步執行子行程並取得結束碼與輸出；
import { spawnSync } from 'node:child_process';
// 匯入同步檔案 API（existsSync 判斷存在、readFileSync 讀檔、rmSync 刪資料夾、readdirSync 列目錄）；
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
// 匯入 path 模組；
import * as path from 'node:path';
// 匯入 fileURLToPath，把 file:// 網址轉成路徑；
import { fileURLToPath } from 'node:url';
// 匯入 createRequire：用 CommonJS 的 require 載入 jsdom（專案沒有 @types/jsdom，靜態 import 會讓 next build 的型別檢查失敗）；
import { createRequire } from 'node:module';

// jsdom 的最小型別：只描述這裡用到的建構子與 window；
type JsdomCtor = new (html: string, options: { runScripts: 'dangerously' }) => { window: Record<string, unknown> };
// 載入 jsdom，用來在測試裡真正執行頁面的 inline 腳本；`as` 把 require 回傳的 any 指定成上面的型別；
const { JSDOM } = createRequire(import.meta.url)('jsdom') as { JSDOM: JsdomCtor };

// site/ 資料夾的絕對路徑（本檔在 site/tests/）；
const siteDir = fileURLToPath(new URL('..', import.meta.url));
// 建置測試的輸出資料夾（next.config.ts 依 SITE_OUT_DIR 設 distDir），不會蓋掉開發者的 out/；
const outDir = path.join(siteDir, 'out-fixture');
// 建置用的環境變數：測試筆記庫、輸出資料夾；STRICT_LINKS 明確清掉，避免外部環境影響；
const baseEnv = { ...process.env, NOTES_ROOT: 'tests/site-vault', SITE_OUT_DIR: 'out-fixture', STRICT_LINKS: '' };

// 執行 npm run build；shell: true 讓 Windows 找得到 npm.cmd；encoding 讓輸出是字串；
function runBuild(env: NodeJS.ProcessEnv) {
  // 回傳子行程結果（status 是結束碼，stdout／stderr 是輸出）；
  return spawnSync('npm', ['run', 'build'], { cwd: siteDir, env, shell: true, encoding: 'utf8' });
}

// 讀輸出資料夾裡的檔案；relPath 用正斜線；
function readOut(relPath: string): string {
  // 讀成 UTF-8 字串；
  return readFileSync(path.join(outDir, relPath), 'utf8');
}

// 讀建置報告裡的頁面清單（slug 用 / 接起來）；每次呼叫都重讀，因為 STRICT 測試會覆寫報告檔；
function pageList(): string[] {
  // 讀 JSON 並把每個 slug 陣列接成字串；
  return (JSON.parse(readFileSync(path.join(siteDir, '.build-report.json'), 'utf8')).pages as string[][]).map((s) => s.join('/'));
}

// 模擬 GitHub Pages 對沒有副檔名的網址的處理：解碼路徑後找「路徑.html」；回傳是否找得到檔案；
// GitHub Pages 遇到同名資料夾時行為未查證（可能轉址到 X/ 而 404），所以：同名資料夾 X/ 存在時，
// 只有在 X/ 底下確實有真頁面（合理的並存，例如 簡報.md 與 簡報/deck.md）才算可開，Next 的 RSC 殘留資料夾一律不算；
function servable(href: string): boolean {
  // 去掉錨點與查詢字串，再解碼百分比編碼，並去掉開頭的 /；
  const decoded = decodeURIComponent(href.replace(/[?#].*$/, '')).replace(/^\//, '');
  // 沒有 .html 檔就不可開；
  if (!existsSync(path.join(outDir, `${decoded}.html`))) return false;
  // 沒有同名資料夾就可開；
  if (!existsSync(path.join(outDir, decoded))) return true;
  // 有同名資料夾：必須有頁面在它底下；startsWith 比對前綴；
  return pageList().some((p) => p.startsWith(`${decoded}/`));
}

// 整組只建置一次（真正的 next build 很慢）；
describe('npm run build（tests/site-vault）', () => {
  // 第一次建置的子行程結果；
  let build: ReturnType<typeof runBuild>;
  // 整組前執行；
  beforeAll(() => {
    // 先清掉舊的輸出，確保斷言看到的是這次的結果；force 讓不存在時不丟錯；
    // maxRetries 與 retryDelay 讓 Windows 上暫時被佔用（防毒軟體或剛結束的行程還握著檔案，會丟 EPERM）時自動重試；
    rmSync(outDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    // 建置；
    build = runBuild(baseEnv);
  }, 600_000);
  // 整組結束後：建置時 sync-assets 把測試筆記庫的極簡 assets 複製進了 public/assets，這裡用真正的 assets 再同步一次，免得 next dev 拿到假的；
  afterAll(() => {
    // 解構把 NOTES_ROOT 取出丟掉，其餘環境變數收進 rest（設成空字串不行：sync-assets 只在 undefined 時才用預設的上一層）；
    const { NOTES_ROOT: _drop, ...rest } = process.env;
    // 印出被丟掉的值，同時讓 _drop 有被使用（lint 不允許宣告了不用）；
    if (_drop) console.log(`還原 public/assets：忽略測試外的 NOTES_ROOT=${_drop}`);
    // 不帶 NOTES_ROOT，sync-assets 預設讀 repo 根目錄的 assets；process.execPath 是目前 node 的路徑；
    spawnSync(process.execPath, ['scripts/sync-assets.mjs'], { cwd: siteDir, env: rest });
  });

  // 建置成功；
  it('沒開 STRICT_LINKS 時建置成功，歧義連結只出現在警告摘要', () => {
    // 失敗時把輸出印出來方便除錯；
    if (build.status !== 0) console.error(build.stdout, build.stderr);
    // 結束碼 0；
    expect(build.status).toBe(0);
    // 摘要列出歧義連結；
    expect(build.stdout).toContain('有歧義的 wikilink：1 個不同目標');
    // 摘要列出被取代的舊 html；
    expect(build.stdout).toContain('舊/對照.html → 舊/對照-互動版.html');
  });

  // 檔名；
  it('中文、空白、#、+、括號、% 的筆記都輸出成原名的 .html', () => {
    // 逐一檢查；
    for (const p of ['前端/日期 物件.html', '前端/日期 物件-互動版.html', '特殊/C++ (入門) 100%.html', '特殊/C# 筆記.html']) {
      // 第二個參數是失敗時的訊息；
      expect(existsSync(path.join(outDir, p)), p).toBe(true);
    }
    // 被 Next 跳脫的 %23 檔名已改回原名，不留殘骸；
    expect(readdirSync(path.join(outDir, '特殊')).some((n) => n.includes('%23'))).toBe(false);
  });

  // R29：根目錄的 index 不發布；
  it('根目錄的 index.html 不發布：out/index.html 是網站首頁，沒有 out/index/，摘要列出 reserved', () => {
    // 首頁不是舊的根目錄索引；
    expect(readOut('index.html')).not.toContain('OLD-ROOT-INDEX');
    // 首頁是網站首頁（Hero 的標題是 Abby Notes）；
    expect(readOut('index.html')).toContain('<h1>Abby Notes</h1>');
    // 沒有 index 資料夾；
    expect(existsSync(path.join(outDir, 'index'))).toBe(false);
    // 摘要列出；
    expect(build.stdout).toContain('網址是保留名稱而不發布的筆記：1 個');
  });

  // R30：RSC 產物被清掉；
  it('建置後沒有 RSC 產物（.txt、__next.*），_next/ 與頁面都還在，合理並存的資料夾被列出', () => {
    // 列出 _next 以外的所有檔案；recursive 列出整棵樹；
    const files = readdirSync(outDir, { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => path.relative(outDir, path.join(e.parentPath, e.name)).replace(/\\/g, '/'))
      .filter((p) => !p.startsWith('_next/'));
    // 沒有 RSC 的 .txt；唯一的 .txt 是被筆記引用、由 copy-local-assets 複製進來的附件 簡報.txt（見下方附件測試）；
    expect(files.filter((p) => p.endsWith('.txt'))).toEqual(['簡報.txt']);
    // 沒有 __next. 開頭的檔案；
    expect(files.filter((p) => p.split('/').at(-1)?.startsWith('__next.'))).toEqual([]);
    // _next 靜態資源還在；
    expect(existsSync(path.join(outDir, '_next', 'static'))).toBe(true);
    // 頁面還在、讀得到；
    expect(readOut('簡報/deck.html')).toContain('snap-deck');
    // 頁面的 RSC 同名資料夾已刪；
    expect(existsSync(path.join(outDir, '前端', '日期 物件'))).toBe(false);
    // 合理並存：簡報.html 與 簡報/（裡面有 deck.html）；兩個網址都可開；
    expect(servable('/%E7%B0%A1%E5%A0%B1')).toBe(true);
    // 同上；
    expect(servable('/%E7%B0%A1%E5%A0%B1/deck')).toBe(true);
    // 摘要列出並存數；
    expect(build.stdout).toContain('並存（X/ 裡有真頁面）：1 個');
  });

  // 排除；
  it('被排除的資料夾與筆記不輸出', () => {
    // private 與 _hidden 都不存在；
    expect(existsSync(path.join(outDir, 'private'))).toBe(false);
    // 同上；
    expect(existsSync(path.join(outDir, '_hidden'))).toBe(false);
  });

  // 被取代的舊 html；
  it('被取代的舊 html 不發布：舊/對照.html 是 md 頁，內容不是舊 html', () => {
    // 這個檔是 舊/對照.md 的頁面；
    const page = readOut('舊/對照.html');
    // 舊 html 的標記字串不在；
    expect(page).not.toContain('SUPERSEDED-OLD-HTML');
    // 是 md 頁的結構；
    expect(page).toContain('class="hero"');
    // 報告檔列出被取代者；
    const report = JSON.parse(readFileSync(path.join(siteDir, '.build-report.json'), 'utf8'));
    // 斷言；
    expect(report.superseded).toEqual([{ relPath: '舊/對照.html', replacedBy: '舊/對照-互動版.html' }]);
  });

  // wikilink；
  it('md 頁的 wikilink 都是 <a href>，而且依 GitHub Pages 的規則找得到目標檔案', () => {
    // 讀頁面；
    const page = readOut('前端/日期 物件.html');
    // 取出所有 wikilink 的 href；matchAll 回傳所有比對結果，m[1] 是捕獲的網址；
    const hrefs = Array.from(page.matchAll(/<a href="([^"]+)" class="wikilink"/g), (m) => m[1]);
    // 三個可解析的連結；
    expect(hrefs).toHaveLength(3);
    // 每個都找得到檔案；
    for (const href of hrefs) expect(servable(href), href).toBe(true);
    // 找不到、歧義、被排除的都保留純文字；
    expect(page).toContain('[[不存在的筆記]]');
    // 同上；
    expect(page).toContain('[[說明]]');
    // 被排除的筆記沒有連結，也沒有洩漏路徑；
    expect(page).not.toMatch(/href="[^"]*private/);
  });

  // 首頁的連結也都能開，而且正好是「已發布」的全部筆記；
  it('首頁為每篇已發布的筆記列出一個連結，href 解碼後找得到輸出檔，沒有被排除或被取代的', () => {
    // 讀首頁；
    const home = readOut('index.html');
    // 取出清單裡的連結（略過 _next 等資源）；
    const hrefs = Array.from(home.matchAll(/<li><a href="([^"]+)"/g), (m) => m[1]);
    // 發布清單（根目錄的 index.html 依 R29 不發布、被取代的舊 html 與互動版同網址所以不另列）；
    const pages = pageList();
    // 發布 11 篇；
    expect(pages).toHaveLength(11);
    // 解碼後的連結路徑；
    const decoded = hrefs.map((h) => decodeURIComponent(h).replace(/^\//, ''));
    // 與發布清單完全一致（每篇一個、不多不少、沒有重複）；
    expect([...decoded].sort()).toEqual([...pages].sort());
    // 每個都找得到檔案（模擬 GitHub Pages）；
    for (const href of hrefs) expect(servable(href), href).toBe(true);
    // 被排除的資料夾與筆記沒有出現在首頁的連結或文字裡；
    expect(home).not.toMatch(/private|_hidden|secret/);
    // 舊的根目錄索引沒有留下痕跡；
    expect(home).not.toContain('OLD-ROOT-INDEX');
    // 去掉 React 在相鄰文字節點之間插入的註解標記，方便比對文字；
    const text = home.replace(/<!-- -->/g, '');
    // 頁首的篇數；
    expect(text).toContain('共 11 篇筆記');
    // 每個資料夾一個 h2（含篇數），依碼點順序：根目錄在最前，其後 a、b、quiz、前端、特殊、簡報、舊；
    expect(Array.from(text.matchAll(/<h2>(.*?)<span class="meta">（(\d+)）<\/span><\/h2>/g), (m) => `${m[1]}${m[2]}`)).toEqual(['根目錄1', 'a1', 'b1', 'quiz1', '前端2', '特殊2', '簡報1', '舊2']);
    // 首頁自己也有 notes.js 要用的結構：一個 article.card 裝全部區塊；
    expect(text.match(/<article class="card"/g)).toHaveLength(1);
    // 互動版筆記旁邊有可見的「互動版」標記，一般筆記沒有；
    expect(text).toMatch(/日期物件互動版<\/a> <span class="pill">互動版<\/span>/);
    // 標記只出現兩次（前端的與舊的兩篇互動版）；
    expect(text.match(/<span class="pill">互動版<\/span>/g)).toHaveLength(2);
  });

  // html 頁的腳本；
  it('html 頁：inline 腳本在 body 內容之後依原順序執行，共用腳本只出現一次', () => {
    // 讀頁面；
    const page = readOut('前端/日期 物件-互動版.html');
    // 內容的最後一段在第一段 inline 腳本之前；indexOf 回傳位置；
    expect(page.indexOf('id="last-para"')).toBeLessThan(page.indexOf("window.__order = ['head']"));
    // 用 jsdom 真正執行 inline 腳本（不載入外部資源，所以 Next 的 chunk 不會跑）；
    const dom = new JSDOM(page, { runScripts: 'dangerously' });
    // 執行順序與原頁相同，而且都看得到內容；
    expect(dom.window.__order).toEqual(['head', 'middle:true', 'end:true']);
    // 共用腳本沒有被當成頁面腳本輸出成 <script src>；
    expect(page).not.toMatch(/<script[^>]*src="[^"]*\/assets\/(notes|note-mask)\.js"/);
    // 由 next/script 載入：各有一個 preload；match 加 g 旗標回傳所有比對；
    expect(page.match(/<link rel="preload" href="\/assets\/notes\.js" as="script"\/>/g)).toHaveLength(1);
    // 同上；
    expect(page.match(/<link rel="preload" href="\/assets\/note-mask\.js" as="script"\/>/g)).toHaveLength(1);
    // html 頁不需要 note-quiz.js；
    expect(page).not.toContain('note-quiz.js');
    // body 的 class 與 data-* 搬到外層 div；
    expect(page).toContain('<div class="interactive-page" data-kind="demo">');
    // 頁面自己的樣式保留；
    expect(page).toContain('.only-here{color:oklch(0.6 0.2 30)}');
  });

  // 測驗頁；
  it('原頁載入 note-quiz.js 的頁面：note-quiz.js 同步載入且排在頁面腳本之前', () => {
    // 讀頁面；
    const page = readOut('quiz/測驗.html');
    // 只出現一個 note-quiz 的 script；
    expect(page.match(/<script src="\/assets\/note-quiz\.js"><\/script>/g)).toHaveLength(1);
    // 在呼叫 NoteQuiz.mount 的 inline 腳本之前；
    expect(page.indexOf('<script src="/assets/note-quiz.js">')).toBeLessThan(page.indexOf('NoteQuiz.mount('));
  });

  // 卡片牆；
  it('deck: true 的筆記有 snap-deck，其他沒有', () => {
    // 有；
    expect(readOut('簡報/deck.html')).toContain('class="snap-deck"');
    // 沒有；
    expect(readOut('前端/日期 物件.html')).not.toContain('snap-deck');
  });

  // 標題；
  it('每頁的 <title> 是筆記標題', () => {
    // frontmatter 標題；
    expect(readOut('前端/日期 物件.html')).toContain('<title>日期物件筆記｜Abby 的筆記</title>');
    // 沒有 frontmatter 也沒有 h1：退回檔名；
    expect(readOut('特殊/C# 筆記.html')).toContain('<title>C# 筆記｜Abby 的筆記</title>');
    // html 筆記取 <title>；
    expect(readOut('前端/日期 物件-互動版.html')).toContain('<title>日期物件互動版｜Abby 的筆記</title>');
  });

  // 本地附件（B）：md 的圖片網址與 out/ 的檔案位置一致；
  it('md 頁 <img src> 指到的圖片都在 out/ 的同一路徑（絕對網址與相對網址都找得到），找不到的與被排除的圖不輸出', () => {
    // 讀 md 頁；
    const page = readOut('前端/日期 物件.html');
    // 取出所有 <img> 的 src；
    const srcs = Array.from(page.matchAll(/<img[^>]*?src="([^"]+)"/g), (m) => m[1]);
    // 嵌入的 pic.png（絕對網址）、相對路徑的圖檔、找不到的 nope.png、被排除而找不到的 secret.png；
    expect(srcs).toEqual(['/%E5%89%8D%E7%AB%AF/pic.png', 'nope.png', 'secret.png', '%E5%9C%96%20%E6%AA%94.png']);
    // 解析成 out/ 內的相對路徑：/ 開頭是從站台根目錄算，否則相對於頁面所在資料夾 前端/；
    const resolve = (src: string) => (src.startsWith('/') ? decodeURIComponent(src).slice(1) : `前端/${decodeURIComponent(src)}`);
    // 找得到圖的兩個都存在（模擬瀏覽器請求）；
    for (const src of ['/%E5%89%8D%E7%AB%AF/pic.png', '%E5%9C%96%20%E6%AA%94.png']) expect(existsSync(path.join(outDir, resolve(src))), src).toBe(true);
    // 嵌入的圖與原檔位元組相同；
    expect(readFileSync(path.join(outDir, '前端', 'pic.png')).equals(readFileSync(path.join(siteDir, 'tests', 'site-vault', '前端', 'pic.png')))).toBe(true);
    // 找不到的圖沒有被造出來；
    expect(existsSync(path.join(outDir, resolve('nope.png')))).toBe(false);
    // 全站輸出裡沒有任何叫 secret.png 的檔案，也沒有 private 資料夾（被排除的圖絕不外洩）；
    const all = readdirSync(outDir, { recursive: true, encoding: 'utf8' }).map((p) => p.replace(/\\/g, '/'));
    // 沒有 secret.png；
    expect(all.filter((p) => p.endsWith('secret.png'))).toEqual([]);
    // 沒有 private；
    expect(all.filter((p) => p === 'private' || p.startsWith('private/'))).toEqual([]);
  });

  // 本地附件（B）：html 頁與 md 連結的附件；
  it('html 頁與 md 連結引用的附件複製進 out/ 且位元組相同，被排除的 private 不複製且列入警告，找不到的列入報告', () => {
    // 讀報告；
    const local = JSON.parse(readFileSync(path.join(siteDir, '.build-report.json'), 'utf8')).localAssets;
    // 複製的檔案：md 嵌入、md 相對圖與連結、html 的 img／a／link／script、md 連結的 txt（排序後比對）；
    expect([...local.files].sort()).toEqual(['前端/docs/手冊.pdf', '前端/pic.png', '前端/互動.js', '前端/圖 檔.png', '前端/頁面.css', '簡報.txt'].sort());
    // 逐檔位元組相同；
    for (const rel of local.files as string[]) {
      // 來源在測試筆記庫，輸出在 out-fixture；
      expect(readFileSync(path.join(outDir, ...rel.split('/'))).equals(readFileSync(path.join(siteDir, 'tests', 'site-vault', ...rel.split('/')))), rel).toBe(true);
    }
    // 被排除的檔案：兩篇已發布的筆記指到它，不複製；
    expect(local.excludedReferenced).toEqual({ '簡報.md': ['private/secret.png'], '前端/日期 物件-互動版.html': ['private/secret.png'] });
    // 找不到的本地檔案；
    expect(local.missingLocal).toEqual({ '前端/日期 物件.md': ['前端/missing-file.zip'] });
    // 沒有跑出根目錄的引用；
    expect(local.outsideRoot).toEqual({});
    // 摘要印出三類資訊；
    expect(build.stdout).toContain('複製的本地附件：6 個檔案');
    // 警告被排除；
    expect(build.stdout).toContain('已發布的筆記指到「不發布」的檔案：2 個引用、2 篇筆記');
    // 列出筆記與目標；
    expect(build.stdout).toContain('簡報.md → private/secret.png');
    // 找不到；
    expect(build.stdout).toContain('找不到的本地檔案引用：1 個');
    // 輸出裡的 html 頁面仍引用原本的相對網址（page-relative 網址在輸出的同一路徑找得到）；
    const html = readOut('前端/日期 物件-互動版.html');
    // 頁面樣式表與腳本都以相對網址保留；
    expect(html).toContain('href="頁面.css"');
    // 腳本；
    expect(html).toContain('src="互動.js"');
  });

  // 順序（C 與 B）：copy 在 prune 之後；
  it('檔名與頁面同名的 .txt 附件（簡報.txt）在建置後仍在：prune-export 早於 copy-local-assets', () => {
    // 內容與來源檔完全相同（以來源檔為準，而不是寫死字串：Windows 的 git autocrlf 檢出時會把來源檔的換行改成 CRLF）；
    expect(readOut('簡報.txt')).toBe(readFileSync(path.join(siteDir, 'tests', 'site-vault', '簡報.txt'), 'utf8'));
    // 而且是我們放的那個檔；
    expect(readOut('簡報.txt')).toContain('ATTACHED-TXT-SAME-STEM-AS-PAGE');
    // 同層頁面還在；
    expect(existsSync(path.join(outDir, '簡報.html'))).toBe(true);
  });

  // .nojekyll（C）；
  it('out/.nojekyll 存在且是空檔案（在 prune 與 copy 之後仍在）', () => {
    // 存在；
    expect(existsSync(path.join(outDir, '.nojekyll'))).toBe(true);
    // 空檔案；
    expect(readOut('.nojekyll')).toBe('');
  });

  // 嚴格模式：在 next build 之前的 site-report.mjs 就失敗，所以很快；
  it('STRICT_LINKS=1 且有歧義連結時 npm run build 失敗', () => {
    // 建置；
    const strict = runBuild({ ...baseEnv, STRICT_LINKS: '1' });
    // 非 0 結束碼；
    expect(strict.status).not.toBe(0);
    // 錯誤訊息點名 STRICT_LINKS；
    expect(`${strict.stdout}${strict.stderr}`).toContain('STRICT_LINKS=1：有 1 個有歧義的 wikilink');
  }, 120_000);

  // 小修 (a)：跳過 site-report.mjs、直接跑 next build 也繞不過 STRICT_LINKS（放最後，因為失敗的建置可能弄亂輸出資料夾）；
  it('STRICT_LINKS=1 時直接執行 next build 也會失敗並點名筆記與連結', () => {
    // npx next build；shell: true 讓 Windows 找得到 npx.cmd；
    const direct = spawnSync('npx', ['next', 'build'], { cwd: siteDir, env: { ...baseEnv, STRICT_LINKS: '1' }, shell: true, encoding: 'utf8' });
    // 非 0 結束碼；
    expect(direct.status).not.toBe(0);
    // 錯誤訊息點名筆記與連結；
    expect(`${direct.stdout}${direct.stderr}`).toMatch(/前端\/日期 物件\.md 的 \[\[說明\]\] 有歧義/);
  }, 600_000);
});
