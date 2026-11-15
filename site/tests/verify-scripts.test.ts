// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本檔要讀寫暫存資料夾並 spawn 子行程，改用 node 環境；
// 本檔測的是建置後驗證（Task 12）：壞連結檢查、私人檔案外洩檢查、敏感檔名檢查、大小檢查，以及串起它們的 scripts/verify.mjs（R32 的結束碼規則）；
// 所有測試都在暫存資料夾造「假的 out/」，不跑真正的建置；每個安全測試都真的把違規的東西放進去，拿掉檢查就會失敗；
// 匯入 vitest 的測試函式；
import { afterAll, describe, expect, it } from 'vitest';
// 匯入 spawnSync：同步執行子行程並取得結束碼與輸出；
import { spawnSync } from 'node:child_process';
// 匯入 fs 的同步版 API，造暫存資料夾與檔案；
import * as fs from 'node:fs';
// 匯入 os，取得系統暫存資料夾位置；
import * as os from 'node:os';
// 匯入 path 模組；
import * as path from 'node:path';
// 匯入 fileURLToPath，把 file:// 網址轉成路徑；
import { fileURLToPath } from 'node:url';
// 匯入被測的壞連結檢查；
import { checkLinks } from '../src/lib/verify/check-links';
// 匯入被測的外洩與敏感檔名檢查；
import { assertNoPrivate, assertNoSensitive, findPrivateLeaks, findSensitive } from '../src/lib/verify/assert-no-private';
// 匯入被測的大小檢查；
import { reportSize, topLevelSizes } from '../src/lib/verify/report-size';

// site/ 資料夾的路徑（本檔在 site/tests/ 底下）；
const siteDir = fileURLToPath(new URL('..', import.meta.url));
// 驗證腳本的絕對路徑；
const verifyScript = path.join(siteDir, 'scripts', 'verify.mjs');
// 登記所有暫存資料夾，結束時一併刪除；
const temps: string[] = [];

// 在暫存區造一個資料夾，files 是 { 相對路徑: 內容 }；回傳資料夾路徑；
function makeDir(files: Record<string, string | Buffer>): string {
  // mkdtempSync 在前綴後補亂數，保證不會撞名；
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-'));
  // 登記，結束時刪除；
  temps.push(dir);
  // 逐一寫檔；Object.entries 回傳 [鍵, 值] 陣列；
  for (const [rel, content] of Object.entries(files)) {
    // 目標路徑；
    const target = path.join(dir, ...rel.split('/'));
    // 先建上層資料夾；recursive 讓多層一次建好；
    fs.mkdirSync(path.dirname(target), { recursive: true });
    // 寫入內容（字串或位元組）；
    fs.writeFileSync(target, content);
  }
  // 回傳資料夾；
  return dir;
}

// 包出一頁最小的 html；body 是頁面內容；
function page(body: string, head = ''): string {
  // 用字串樣板組出完整文件；
  return `<!doctype html><html><head><meta charset="utf-8"><title>t</title>${head}</head><body>${body}</body></html>`;
}

// 所有測試結束後刪掉暫存資料夾；maxRetries 因應 Windows 上偶發的 EPERM；
afterAll(() => {
  // 逐一刪除；
  for (const dir of temps) fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

// ===== checkLinks =====
describe('checkLinks：站內連結是否存在', () => {
  // 正常樣本：互相連結、共用資源都在，沒有任何壞連結；
  it('正常樣本沒有壞連結，並回報掃描頁數與連結數', async () => {
    // 造輸出：首頁、一篇筆記、共用樣式；
    const out = makeDir({
      'index.html': page('<a href="/a/b">筆記</a><img src="/assets/x.png">', '<link rel="stylesheet" href="/assets/s.css">'),
      'a/b.html': page('<a href="/">首頁</a><a href="c.html">同層</a>'),
      'a/c.html': page('c'),
      'assets/x.png': 'png',
      'assets/s.css': 'body{}',
    });
    // 執行；
    const result = await checkLinks(out);
    // 沒有壞連結；
    expect(result.broken).toEqual([]);
    // 三個 html 頁；
    expect(result.pages).toBe(3);
    // 連結：index 3 個、b 2 個；
    expect(result.links).toBe(5);
  });

  // 故意的斷連結：必須被抓到，且指出是哪一頁的哪個連結；
  it('偵測到斷連結（回報頁面與原始 href）', async () => {
    // 造輸出：a/b 連到不存在的 /nope；
    const out = makeDir({ 'a/b.html': page('<a href="/nope">x</a>') });
    // 執行；
    const result = await checkLinks(out);
    // 精確比對結果；
    expect(result.broken).toEqual([{ page: 'a/b.html', href: '/nope' }]);
  });

  // 同一頁重複的同一個壞連結只回報一次；
  it('同一頁重複的壞連結只列一次', async () => {
    // 造輸出；
    const out = makeDir({ 'a.html': page('<a href="/nope">1</a><a href="/nope">2</a>') });
    // 執行；
    const result = await checkLinks(out);
    // 只有一筆；
    expect(result.broken).toHaveLength(1);
  });

  // 百分比編碼的中文與空白，以及沒編碼的中文，都要找得到檔案；
  it('百分比編碼的中文與空白、未編碼的中文都能解析到檔案', async () => {
    // 造輸出：檔名含中文與空白；
    const out = makeDir({
      '前端/日期 物件.html': page('x'),
      'index.html': page('<a href="/%E5%89%8D%E7%AB%AF/%E6%97%A5%E6%9C%9F%20%E7%89%A9%E4%BB%B6">編碼</a><a href="/前端/日期 物件">原樣</a><a href="前端/日期%20物件.html">相對</a>'),
    });
    // 執行；
    const result = await checkLinks(out);
    // 都找得到；
    expect(result.broken).toEqual([]);
  });

  // 中文檔名只差一個字就要判壞，避免「全部放行」的假通過；
  it('中文檔名不符時判為壞連結', async () => {
    // 造輸出；
    const out = makeDir({ '前端/日期 物件.html': page('x'), 'index.html': page('<a href="/前端/日期物件">少空白</a>') });
    // 執行；
    const result = await checkLinks(out);
    // 一筆壞連結；
    expect(result.broken).toEqual([{ page: 'index.html', href: '/前端/日期物件' }]);
  });

  // 路徑裡的 + 就是加號，不是空白；
  it('+ 在路徑裡是加號：C++ 找得到、a+b 不等於 "a b"', async () => {
    // 造輸出：C++.html 與 "a b.html"；
    const out = makeDir({
      'C++.html': page('x'),
      'a b.html': page('x'),
      'index.html': page('<a href="/C++">加號</a><a href="/C%2B%2B">編碼加號</a><a href="/a+b">不是空白</a><a href="/a%20b">空白</a>'),
    });
    // 執行；
    const result = await checkLinks(out);
    // 只有 /a+b 是壞的；
    expect(result.broken).toEqual([{ page: 'index.html', href: '/a+b' }]);
  });

  // #fragment 只用於頁內定位，檢查檔案是否存在時要去掉；檔名裡真正的 # 要寫成 %23；
  it('#fragment 在存在檢查時去掉；檔名含 # 要用 %23', async () => {
    // 造輸出：檔名含 # 的筆記；
    const out = makeDir({
      'x.html': page('<h2 id="sec">s</h2>'),
      'C# 筆記.html': page('x'),
      'index.html': page('<a href="/x#sec">錨點</a><a href="/C%23%20%E7%AD%86%E8%A8%98">編碼井號</a><a href="/C# 筆記">未編碼井號</a>'),
    });
    // 執行；
    const result = await checkLinks(out);
    // 未編碼的 # 會被瀏覽器當成 fragment，連到 /C（不存在）；
    expect(result.broken).toEqual([{ page: 'index.html', href: '/C# 筆記' }]);
  });

  // GitHub Pages 的三條規則：檔案本身、加 .html、資料夾的 index.html；
  it('無副檔名連結找得到 x.html，資料夾連結找得到 x/index.html，直接寫 x.html 也行', async () => {
    // 造輸出；
    const out = makeDir({
      'x.html': page('x'),
      'dir/index.html': page('d'),
      'empty/readme.txt': 'no index',
      'index.html': page('<a href="/x">無副檔名</a><a href="/x.html">有副檔名</a><a href="/dir">資料夾</a><a href="/dir/">資料夾斜線</a><a href="/empty/">沒有 index 的資料夾</a><a href="/empty">沒有 index 的資料夾二</a>'),
    });
    // 執行；
    const result = await checkLinks(out);
    // 沒有 index.html 的資料夾兩種寫法都是壞連結；
    expect(result.broken.map((b) => b.href).sort()).toEqual(['/empty', '/empty/']);
  });

  // 區分大小寫：本機 Windows 打得開、Pages 上 404 的連結要被抓到；
  it('只差大小寫的連結判為壞連結', async () => {
    // 造輸出：檔案是 Readme.html，連結寫 readme；
    const out = makeDir({ 'a/Readme.html': page('x'), 'index.html': page('<a href="/a/readme">小寫</a><a href="/a/Readme">對</a>') });
    // 執行；
    const result = await checkLinks(out);
    // 只有小寫那條是壞的；
    expect(result.broken).toEqual([{ page: 'index.html', href: '/a/readme' }]);
  });

  // 相對網址：依頁面檔案所在資料夾解析（與網站輸出的連結一致：網址 /a/b 與 /a/b.html 的基準資料夾都是 /a/）；
  it('相對連結以頁面所在資料夾為基準（同層、上層、下層、./、?query、空 href）', async () => {
    // 造輸出；
    const out = makeDir({
      'a/b.html': page('<a href="c.html">同層</a><a href="c">同層無副檔名</a><a href="../d.html">上層</a><a href="sub/e">下層</a><a href="./f">點</a><a href="c.html?x=1">query</a><a href="">自己</a><a href="?q=1">自己 query</a><a href="g">不存在</a>'),
      'a/c.html': page('c'),
      'd.html': page('d'),
      'a/sub/e.html': page('e'),
      'a/f.html': page('f'),
    });
    // 執行；
    const result = await checkLinks(out);
    // 只有 g 不存在；
    expect(result.broken).toEqual([{ page: 'a/b.html', href: 'g' }]);
  });

  // 根目錄首頁的相對連結；
  it('根目錄頁面的相對連結以根目錄為基準', async () => {
    // 造輸出；
    const out = makeDir({ 'index.html': page('<a href="a/b">好</a><a href="zzz">壞</a>'), 'a/b.html': page('b') });
    // 執行；
    const result = await checkLinks(out);
    // 一個壞的；
    expect(result.broken).toEqual([{ page: 'index.html', href: 'zzz' }]);
  });

  // basePath：絕對網址要先去掉前綴再找檔案；不帶前綴的絕對網址在部署後會 404，必須判壞；
  it('basePath：去掉前綴再找檔案，沒帶前綴的絕對連結判為壞連結', async () => {
    // 造輸出；
    const out = makeDir({
      'index.html': page('<a href="/Abby-notes/a/b">帶前綴</a><a href="/Abby-notes">根</a><a href="/Abby-notes/">根斜線</a><a href="/a/b">沒帶前綴</a><a href="/Abby-notesX/a/b">前綴相似</a>'),
      'a/b.html': page('b'),
    });
    // 執行，指定 basePath；
    const result = await checkLinks(out, { basePath: '/Abby-notes' });
    // 後兩個是壞的；
    expect(result.broken.map((b) => b.href).sort()).toEqual(['/Abby-notesX/a/b', '/a/b']);
  });

  // srcset 每個候選都要檢查；
  it('srcset 的每個候選網址都檢查', async () => {
    // 造輸出：只有 1x 那張存在；
    const out = makeDir({
      'index.html': page('<img src="/p1.png" srcset="/p1.png 1x, /missing.png 2x"><picture><source srcset="/p1.png 640w, /gone.webp 1280w"></picture>'),
      'p1.png': 'x',
    });
    // 執行；
    const result = await checkLinks(out);
    // 兩個候選缺檔；
    expect(result.broken.map((b) => b.href).sort()).toEqual(['/gone.webp', '/missing.png']);
  });

  // src、poster、object data、form action、link href 都要檢查；
  it('src、poster、object data、link href 等屬性也檢查', async () => {
    // 造輸出；
    const out = makeDir({
      'index.html': page('<video src="/v-missing.mp4" poster="/poster-missing.png"></video><object data="/obj-missing.pdf"></object><script src="/s-missing.js"></script><iframe src="/frame-missing"></iframe>', '<link rel="stylesheet" href="/css-missing.css">'),
    });
    // 執行；
    const result = await checkLinks(out);
    // 六個都缺；
    expect(result.broken.map((b) => b.href).sort()).toEqual(['/css-missing.css', '/frame-missing', '/obj-missing.pdf', '/poster-missing.png', '/s-missing.js', '/v-missing.mp4']);
  });

  // <script>、<style>、註解裡長得像連結的文字不是連結；
  it('忽略 script、style、註解裡的連結文字', async () => {
    // 造輸出：這些位置都有「看起來像連結」的字串；
    const out = makeDir({
      'index.html': page('<script>var s = \'<a href="/nope1">x</a>\'; self.__next_f.push([1, "<a href=\\"/nope2\\">"]);</script><style>@import url("/nope3.css"); a{background:url(/nope4.png)}</style><!-- <a href="/nope5">c</a> <img src="/nope6.png"> -->'),
    });
    // 執行；
    const result = await checkLinks(out);
    // 沒有任何壞連結；
    expect(result.broken).toEqual([]);
  });

  // 外部與非檔案協定、協定相對網址都不算站內連結；<base> 不是連結；
  it('略過 http(s)、//host、mailto、tel、javascript、data、blob，也不檢查 <base>', async () => {
    // 造輸出；
    const out = makeDir({
      'index.html': page('<a href="https://example.com/x">外</a><a href="http://example.com">外</a><a href="//cdn.example.com/x.js">協定相對</a><a href="mailto:a@b.c">m</a><a href="tel:123">t</a><a href="javascript:void(0)">j</a><img src="data:image/png;base64,AAAA"><a href="blob:https://x/1">b</a><a href="HTTPS://EXAMPLE.COM/">大寫協定</a>', '<base href="/missing-base/">'),
    });
    // 執行；
    const result = await checkLinks(out);
    // 沒有壞連結；
    expect(result.broken).toEqual([]);
  });

  // 沒有 .html 副檔名的非頁面檔案（圖片）也能被找到；多個頁面各自回報；
  it('多個頁面的壞連結各自回報頁面名稱（含中文與空白的頁面檔名）', async () => {
    // 造輸出；
    const out = makeDir({ '中文 資料夾/頁 面.html': page('<a href="/no1">1</a>'), 'b.html': page('<a href="/no2">2</a>') });
    // 執行；
    const result = await checkLinks(out);
    // 依頁面名稱排序後比較（用 < 比碼元，不依賴系統語系）；
    expect([...result.broken].sort((x, y) => (x.page < y.page ? -1 : 1))).toEqual([
      { page: 'b.html', href: '/no2' },
      { page: '中文 資料夾/頁 面.html', href: '/no1' },
    ]);
  });

  // 錯誤的百分比編碼不能讓檢查本身當掉；
  it('格式錯誤的百分比編碼不會丟錯，只判斷找不到', async () => {
    // 造輸出：檔名剛好含 %；
    const out = makeDir({ '100%.html': page('x'), 'index.html': page('<a href="/100%.html">單獨 %</a><a href="/50%zz">壞</a>') });
    // 執行；
    const result = await checkLinks(out);
    // 單獨 % 的連結對得到檔案；
    expect(result.broken).toEqual([{ page: 'index.html', href: '/50%zz' }]);
  });
});

// ===== fragments 模式 =====
describe('checkLinks：fragments（錨點）模式只警告、不算壞連結', () => {
  // 目標頁沒有該 id：列在 missingAnchors，不列在 broken；
  it('缺少的錨點列在 missingAnchors，不影響 broken', async () => {
    // 造輸出；
    const out = makeDir({
      'a.html': page('<h2 id="have">h</h2><a name="old">n</a>'),
      'index.html': page('<a href="/a#have">有</a><a href="/a#old">name 屬性</a><a href="/a#gone">沒有</a><a href="/a.html#also-gone">也沒有</a><a href="#self-gone">本頁沒有</a><a href="#top">top</a><a href="#">空</a><h1 id="self-have">x</h1><a href="#self-have">本頁有</a>'),
    });
    // 執行；
    const result = await checkLinks(out);
    // 沒有壞連結；
    expect(result.broken).toEqual([]);
    // 缺的錨點；
    expect(result.missingAnchors.map((m) => `${m.page}|${m.href}`).sort()).toEqual(['index.html|#self-gone', 'index.html|/a#gone', 'index.html|/a.html#also-gone']);
  });

  // 百分比編碼的中文 id 要解碼後比對；
  it('中文錨點解碼後比對', async () => {
    // 造輸出；
    const out = makeDir({ 'a.html': page('<h2 id="標題 一">h</h2>'), 'index.html': page('<a href="/a#%E6%A8%99%E9%A1%8C%20%E4%B8%80">有</a><a href="/a#標題 二">無</a>') });
    // 執行；
    const result = await checkLinks(out);
    // 只缺一個；
    expect(result.missingAnchors.map((m) => m.href)).toEqual(['/a#標題 二']);
  });

  // 目標不存在的連結只算壞連結，不重複算成缺錨點；目標不是 html 的不檢查錨點；
  it('目標不存在只算壞連結；目標不是 html 不檢查錨點', async () => {
    // 造輸出；
    const out = makeDir({ 'doc.pdf': 'pdf', 'index.html': page('<a href="/nope#x">壞</a><a href="/doc.pdf#page=2">pdf</a>') });
    // 執行；
    const result = await checkLinks(out);
    // 壞連結一筆；
    expect(result.broken).toEqual([{ page: 'index.html', href: '/nope#x' }]);
    // 沒有缺錨點；
    expect(result.missingAnchors).toEqual([]);
  });

  // fragments:false 關掉；
  it('fragments:false 不檢查錨點', async () => {
    // 造輸出；
    const out = makeDir({ 'a.html': page('x'), 'index.html': page('<a href="/a#gone">x</a>') });
    // 執行；
    const result = await checkLinks(out, { fragments: false });
    // 沒有缺錨點；
    expect(result.missingAnchors).toEqual([]);
  });
});

// ===== assertNoPrivate =====
describe('assertNoPrivate：被排除的路徑不得出現在輸出', () => {
  // 與真實 _config.yml 同形的排除清單；
  const exclude = ['private/', 'Git/', '*.sh', '*.bak', 'docs/*.md', 'secret-note.md', 'node_modules/'];

  // 正常樣本：包含 Next 自己的底線資料夾與 .nojekyll；
  it('正常輸出（含 _next、.nojekyll、_not-found.html）通過', () => {
    // 造輸出；
    const out = makeDir({ 'index.html': page('x'), 'a/b.html': page('x'), '_next/static/chunk.js': 'js', '.nojekyll': '', '_not-found.html': page('x'), 'assets/n.css': 'x', 'a/private/ok.html': page('非根層 private 不算') });
    // 不丟錯；
    expect(() => assertNoPrivate(out, exclude)).not.toThrow();
    // 洩漏清單為空；
    expect(findPrivateLeaks(out, exclude)).toEqual([]);
  });

  // 根層 private/ 底下任何檔案都是外洩；
  it('private/ 底下的檔案是外洩，錯誤訊息點名路徑', () => {
    // 造輸出，放進一個私人檔案；
    const out = makeDir({ 'index.html': page('x'), 'private/resume.png': 'secret' });
    // 丟錯，並點名路徑；
    expect(() => assertNoPrivate(out, exclude)).toThrow(/private\/resume\.png/);
  });

  // 大小寫不同也算外洩（不分大小寫的檔案系統上 Private 與 private 是同一個資料夾）；
  it('大小寫不同的 Private/ 也是外洩', () => {
    // 造輸出；
    const out = makeDir({ 'Private/x.png': 'secret' });
    // 丟錯；
    expect(() => assertNoPrivate(out, exclude)).toThrow(/Private\/x\.png/);
    // 全大寫；
    expect(findPrivateLeaks(makeDir({ 'PRIVATE/y.png': 's' }), exclude)).toEqual(['PRIVATE/y.png']);
  });

  // 根層語意：Git/ 只排除根層；a/Git/b.html 不是外洩；
  it('根層語意：Git/b.html 是外洩，a/Git/b.html 不是', () => {
    // 根層；
    expect(findPrivateLeaks(makeDir({ 'Git/b.html': page('x') }), exclude)).toEqual(['Git/b.html']);
    // 巢狀；
    expect(findPrivateLeaks(makeDir({ 'a/Git/b.html': page('x') }), exclude)).toEqual([]);
  });

  // 底線或點開頭的名稱在任何深度都不發布；
  it('任何深度的底線或點開頭的檔案與資料夾都是外洩（_next 與 .nojekyll 除外）', () => {
    // 逐一檢查幾種情況；
    for (const rel of ['_hidden/x.html', 'a/_hidden/x.html', 'a/.hidden/x.html', '.secret', 'a/_draft.html', '_next2/x.js', 'a/_next/x.js']) {
      // 造輸出；
      const out = makeDir({ [rel]: 'x' });
      // 應有外洩；
      expect(findPrivateLeaks(out, exclude).length, rel).toBeGreaterThan(0);
    }
  });

  // 副檔名與萬用字元：*.sh 在任何深度；路徑萬用字元 docs/*.md；
  it('萬用字元：任何深度的 .sh、.bak 是外洩；docs/*.md 對應的 docs/a.html 也是外洩', () => {
    // .sh 巢狀；
    expect(findPrivateLeaks(makeDir({ 'a/b/run.sh': '#!/bin/sh' }), exclude)).toEqual(['a/b/run.sh']);
    // .bak；
    expect(findPrivateLeaks(makeDir({ 'old.bak': 'x' }), exclude)).toEqual(['old.bak']);
    // docs/a.html 由 docs/a.md 輸出；
    expect(findPrivateLeaks(makeDir({ 'docs/a.html': page('x') }), exclude)).toEqual(['docs/a.html']);
    // 裸名稱 secret-note.md 輸出成 secret-note.html；
    expect(findPrivateLeaks(makeDir({ 'secret-note.html': page('x') }), exclude)).toEqual(['secret-note.html']);
    // 同名但在子資料夾不算（裸名稱只比對根層）；
    expect(findPrivateLeaks(makeDir({ 'a/secret-note.html': page('x') }), exclude)).toEqual([]);
  });

  // Unicode 正規化：NFD 與 NFC 的同一個名稱視為相同；
  it('NFC 與 NFD 的同名資料夾都視為被排除', () => {
    // NFC 寫法的樣式；
    const patterns = ['caf\u00e9/'];
    // NFD 寫法的輸出資料夾（e 加上組合重音符號）；
    const out = makeDir({ 'cafe\u0301/x.html': page('x') });
    // 應判為外洩；
    expect(findPrivateLeaks(out, patterns)).toHaveLength(1);
  });

  // 空的排除清單：只剩底線與點的規則，不丟錯；
  it('空的排除清單不丟錯', () => {
    // 造輸出；
    const out = makeDir({ 'private/x.png': 'x' });
    // 沒有樣式就沒有外洩；
    expect(() => assertNoPrivate(out, [])).not.toThrow();
  });

  // 不支援的樣式失敗即關閉；
  it('不支援的樣式（**）會丟錯而不是默默放行', () => {
    // 造輸出；
    const out = makeDir({ 'index.html': page('x') });
    // 丟錯；
    expect(() => assertNoPrivate(out, ['**/secret'])).toThrow(/\*\*/);
  });

  // 輸出資料夾不存在要丟錯，不能當成「沒有外洩」；
  it('輸出資料夾不存在會丟錯', () => {
    // 不存在的路徑；
    expect(() => assertNoPrivate(path.join(os.tmpdir(), 'verify-does-not-exist-xyz'), exclude)).toThrow();
  });
});

// ===== 敏感檔名 =====
describe('敏感檔名：輸出裡不得出現', () => {
  // 每個名稱都要被抓到（放在子資料夾裡也算）；
  it.each([
    '.env', '.env.local', '.ENV', 'a/.git/config', '.gitignore', 'a/.gitattributes', '.build-report.json', '.verify-report.json', 'server.pem', 'a/b/cert.PEM',
    'id_rsa', 'id_rsa.pub', 'deploy.key', '.DS_Store', 'a/Thumbs.db', 'thumbs.db', 'node_modules/x/index.js', 'a/node_modules/y.js', '.superpowers/sdd/x.md', '.npmrc', 'id_ed25519',
  ])('抓到 %s', (rel) => {
    // 造輸出，放進該檔案；
    const out = makeDir({ 'index.html': page('x'), [rel]: 'x' });
    // 至少一筆；
    expect(findSensitive(out).length, rel).toBeGreaterThan(0);
    // assertNoSensitive 丟錯；
    expect(() => assertNoSensitive(out)).toThrow();
  });

  // 看起來相似但無害的名稱不能誤報；
  it('無害名稱不誤報（.nojekyll、ENV_GUIDE.html、keynote.html、environment.html、key.html）', () => {
    // 造輸出；
    const out = makeDir({ '.nojekyll': '', 'ENV_GUIDE.html': page('x'), 'keynote.html': page('x'), 'environment.html': page('x'), 'key.html': page('x'), 'monkey.png': 'x', 'git-notes.html': page('x'), '_next/static/a.js': 'x' });
    // 沒有敏感檔名；
    expect(findSensitive(out)).toEqual([]);
  });

  // 錯誤訊息只含路徑，不含檔案內容（不洩漏秘密）；
  it('錯誤訊息點名路徑但不含檔案內容', () => {
    // 造輸出；
    const out = makeDir({ '.env': 'API_KEY=hunter2-super-secret' });
    // 取出錯誤；
    let message = '';
    // 捕捉；
    try {
      // 應丟錯；
      assertNoSensitive(out);
    } catch (error) {
      // 取訊息；
      message = (error as Error).message;
    }
    // 含路徑；
    expect(message).toContain('.env');
    // 不含內容；
    expect(message).not.toContain('hunter2');
  });
});

// ===== reportSize =====
describe('reportSize：輸出大小', () => {
  // 正常樣本在預設上限內；
  it('正常樣本通過，預設上限 950 MB，mb 以 MiB 計', () => {
    // 造輸出：剛好 1 MiB 的檔案加一個小檔；
    const out = makeDir({ 'a.bin': Buffer.alloc(1024 * 1024), 'sub/b.txt': 'hello' });
    // 執行（不給上限，用預設）；
    const result = reportSize(out);
    // mb 約為 1；
    expect(result.mb).toBeCloseTo(1, 3);
    // 在預設上限內；
    expect(result.ok).toBe(true);
  });

  // 超大檔被偵測；
  it('超過上限時 ok 為 false', () => {
    // 造輸出：2 MiB；
    const out = makeDir({ 'big.bin': Buffer.alloc(2 * 1024 * 1024) });
    // 上限 1 MB；
    expect(reportSize(out, 1).ok).toBe(false);
    // 上限 3 MB；
    expect(reportSize(out, 3).ok).toBe(true);
  });

  // 等於上限算通過；
  it('剛好等於上限算通過', () => {
    // 造輸出：1 MiB；
    const out = makeDir({ 'a.bin': Buffer.alloc(1024 * 1024) });
    // 上限 1；
    expect(reportSize(out, 1).ok).toBe(true);
  });

  // 輸出資料夾不存在要丟錯；
  it('輸出資料夾不存在會丟錯', () => {
    // 不存在的路徑；
    expect(() => reportSize(path.join(os.tmpdir(), 'verify-does-not-exist-xyz'))).toThrow();
  });

  // 頂層資料夾大小排行；
  it('topLevelSizes 依大小由大到小，頂層的資料夾與檔案各算一項', () => {
    // 造輸出；
    const out = makeDir({ 'big/a.bin': Buffer.alloc(3000), 'mid/b.bin': Buffer.alloc(2000), 'mid/c/d.bin': Buffer.alloc(500), 'small/e.bin': Buffer.alloc(10), 'index.html': 'x'.repeat(100) });
    // 取前 3；
    const top = topLevelSizes(out, 3);
    // 名稱順序；
    expect(top.map((t) => t.name)).toEqual(['big', 'mid', 'index.html']);
    // mid 含子資料夾，共 2500 位元組；
    expect(top[1].bytes).toBe(2500);
  });
});

// ===== scripts/verify.mjs（R32 的結束碼規則）=====
// 執行驗證腳本：root 是含 _config.yml 的筆記根目錄，outDir 是輸出資料夾；cwd 設成 root，報告檔因此寫進 root；
function runCli(root: string, outDir: string, extra: Record<string, string> = {}): { status: number | null; stdout: string; stderr: string; all: string } {
  // 複製目前環境，並清掉會影響結果的變數；
  const base: NodeJS.ProcessEnv = { ...process.env };
  // 刪掉嚴格模式、basePath、上限、錨點開關；
  for (const key of ['STRICT_LINKS', 'BASE_PATH', 'VERIFY_LIMIT_MB', 'VERIFY_FRAGMENTS', 'SITE_OUT_DIR', 'NOTES_ROOT']) delete base[key];
  // 同步執行；
  const result = spawnSync(process.execPath, [verifyScript], { cwd: root, env: { ...base, NOTES_ROOT: root, SITE_OUT_DIR: outDir, ...extra }, encoding: 'utf8' });
  // 回傳結束碼與輸出；
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, all: `${result.stdout}\n${result.stderr}` };
}

// 造一個含 _config.yml 的筆記根目錄與一個正常的 out/；回傳 { root, out }；
function makeSite(outFiles: Record<string, string | Buffer>, configExtra = ''): { root: string; out: string } {
  // 筆記根目錄：只放 _config.yml；
  const root = makeDir({ '_config.yml': `exclude:\n  - private/\n  - "*.sh"\n${configExtra}` });
  // 輸出資料夾放在 root 底下的 out/；
  const out = path.join(root, 'out');
  // 逐一寫檔；
  for (const [rel, content] of Object.entries(outFiles)) {
    // 目標路徑；
    const target = path.join(out, ...rel.split('/'));
    // 建上層資料夾；
    fs.mkdirSync(path.dirname(target), { recursive: true });
    // 寫入；
    fs.writeFileSync(target, content);
  }
  // 回傳；
  return { root, out };
}

// 一組正常的輸出；
const okFiles = (): Record<string, string> => ({ 'index.html': page('<a href="/a/b">b</a>'), 'a/b.html': page('<a href="/">home</a>'), '.nojekyll': '', '_next/static/x.js': 'js' });

// 第二個參數的 timeout：每個測試要 spawn node 並載入 TS 模組，整套測試平行執行時會變慢，預設的 5 秒不夠，放寬到 60 秒；
describe('scripts/verify.mjs：R32 的結束碼規則', { timeout: 60_000 }, () => {
  // 正常樣本全部通過；
  it('正常樣本：結束碼 0，並印出各項摘要', () => {
    // 造站；
    const { root, out } = makeSite(okFiles());
    // 執行；
    const r = runCli(root, out);
    // 結束碼 0；
    expect(r.status, r.all).toBe(0);
    // 摘要含頁數與私人檢查通過；
    expect(r.all).toContain('2 頁');
    // 私人檢查結果；
    expect(r.all).toContain('私人檔案：通過');
  });

  // 私人檔案外洩一律失敗；
  it('私人檔案外洩：結束碼非 0，點名路徑', () => {
    // 造站，放入 private/ 檔案；
    const { root, out } = makeSite({ ...okFiles(), 'private/resume.png': 'secret' });
    // 執行；
    const r = runCli(root, out);
    // 非 0；
    expect(r.status).not.toBe(0);
    // 點名外洩路徑；
    expect(r.all).toContain('private/resume.png');
    // 訊息說是外洩；
    expect(r.all).toContain('外洩');
  });

  // 大小寫不同的外洩也失敗；
  it('大小寫不同的外洩（Private/x.png）也失敗', () => {
    // 造站；
    const { root, out } = makeSite({ ...okFiles(), 'Private/x.png': 'secret' });
    // 執行；
    const r = runCli(root, out);
    // 非 0；
    expect(r.status).not.toBe(0);
  });

  // 壞連結：預設只警告；
  it('壞連結且未設 STRICT_LINKS：結束碼 0，印出壞連結並寫 .verify-report.json', () => {
    // 造站：b 頁有一個壞連結；
    const { root, out } = makeSite({ ...okFiles(), 'a/c.html': page('<a href="/dead-link">x</a>') });
    // 執行；
    const r = runCli(root, out);
    // 結束碼 0；
    expect(r.status, r.all).toBe(0);
    // 印出壞連結與所在頁面；
    expect(r.all).toContain('/dead-link');
    // 頁面名稱；
    expect(r.all).toContain('a/c.html');
    // 報告檔在 cwd（root）；
    const report = JSON.parse(fs.readFileSync(path.join(root, '.verify-report.json'), 'utf8')) as { broken: { page: string; href: string }[] };
    // 完整清單在報告裡；
    expect(report.broken).toEqual([{ page: 'a/c.html', href: '/dead-link' }]);
  });

  // 只印前 30 筆，完整清單在報告檔；
  it('壞連結超過 30 筆：畫面只列前 30 筆，報告檔有全部', () => {
    // 造一頁有 40 個壞連結；
    const links = Array.from({ length: 40 }, (_, i) => `<a href="/dead-${String(i).padStart(2, '0')}">x</a>`).join('');
    // 造站；
    const { root, out } = makeSite({ ...okFiles(), 'many.html': page(links) });
    // 執行；
    const r = runCli(root, out);
    // 結束碼 0；
    expect(r.status, r.all).toBe(0);
    // 第 30 個（索引 29）有印；
    expect(r.all).toContain('/dead-29');
    // 第 31 個（索引 30）沒印；
    expect(r.all).not.toContain('/dead-30');
    // 報告檔有 40 筆；
    const report = JSON.parse(fs.readFileSync(path.join(root, '.verify-report.json'), 'utf8')) as { broken: unknown[] };
    // 全部都在；
    expect(report.broken).toHaveLength(40);
  });

  // STRICT_LINKS=1 時壞連結讓腳本失敗；
  it('壞連結且 STRICT_LINKS=1：結束碼非 0', () => {
    // 造站；
    const { root, out } = makeSite({ ...okFiles(), 'a/c.html': page('<a href="/dead-link">x</a>') });
    // 執行；
    const r = runCli(root, out, { STRICT_LINKS: '1' });
    // 非 0；
    expect(r.status).not.toBe(0);
    // 仍印出壞連結；
    expect(r.all).toContain('/dead-link');
  });

  // STRICT_LINKS 其他值不算嚴格；
  it('STRICT_LINKS=0 或空字串不算嚴格模式', () => {
    // 造站；
    const { root, out } = makeSite({ ...okFiles(), 'a/c.html': page('<a href="/dead-link">x</a>') });
    // 值為 0；
    expect(runCli(root, out, { STRICT_LINKS: '0' }).status).toBe(0);
    // 值為空字串；
    expect(runCli(root, out, { STRICT_LINKS: '' }).status).toBe(0);
  });

  // 超過大小上限一律失敗；
  it('輸出超過上限：結束碼非 0，並列出頂層資料夾大小', () => {
    // 造站：放一個 2 KiB 的檔案，上限設成 0.001 MB（約 1 KiB）；
    const { root, out } = makeSite({ ...okFiles(), 'big/file.bin': Buffer.alloc(2048) });
    // 執行；
    const r = runCli(root, out, { VERIFY_LIMIT_MB: '0.001' });
    // 非 0；
    expect(r.status).not.toBe(0);
    // 訊息說超過；
    expect(r.all).toContain('超過上限');
    // 頂層資料夾排行含 big；
    expect(r.all).toContain('big');
  });

  // 上限環境變數不是數字要報錯，而不是默默用預設；
  it('VERIFY_LIMIT_MB 不是正數：結束碼非 0', () => {
    // 造站；
    const { root, out } = makeSite(okFiles());
    // 執行；
    const r = runCli(root, out, { VERIFY_LIMIT_MB: 'abc' });
    // 非 0；
    expect(r.status).not.toBe(0);
  });

  // 敏感檔名一律失敗，而且不印內容；
  it('敏感檔名：結束碼非 0，點名路徑、不印檔案內容、不寫進報告', () => {
    // 造站：.env 內含「秘密」；
    const { root, out } = makeSite({ ...okFiles(), 'a/.env': 'API_KEY=hunter2-super-secret' });
    // 執行；
    const r = runCli(root, out);
    // 非 0；
    expect(r.status).not.toBe(0);
    // 點名路徑；
    expect(r.all).toContain('a/.env');
    // 說是敏感檔名；
    expect(r.all).toContain('敏感檔名');
    // 不含內容；
    expect(r.all).not.toContain('hunter2');
    // 報告檔（若有寫）也不含內容；
    const reportPath = path.join(root, '.verify-report.json');
    // 有報告才檢查；
    if (fs.existsSync(reportPath)) expect(fs.readFileSync(reportPath, 'utf8')).not.toContain('hunter2');
  });

  // 錨點缺失只警告；
  it('缺少錨點：結束碼 0，列為警告並寫進報告', () => {
    // 造站：連到不存在的錨點；
    const { root, out } = makeSite({ ...okFiles(), 'a/c.html': page('<a href="/a/b#gone">x</a>') });
    // 執行；
    const r = runCli(root, out);
    // 結束碼 0；
    expect(r.status, r.all).toBe(0);
    // 畫面有錨點警告；
    expect(r.all).toContain('錨點');
    // 報告檔有 missingAnchors；
    const report = JSON.parse(fs.readFileSync(path.join(root, '.verify-report.json'), 'utf8')) as { missingAnchors: { page: string; href: string }[] };
    // 內容正確；
    expect(report.missingAnchors).toEqual([{ page: 'a/c.html', href: '/a/b#gone' }]);
  });

  // 錨點檢查可用環境變數關掉；
  it('VERIFY_FRAGMENTS=0 關掉錨點檢查', () => {
    // 造站；
    const { root, out } = makeSite({ ...okFiles(), 'a/c.html': page('<a href="/a/b#gone">x</a>') });
    // 執行；
    const r = runCli(root, out, { VERIFY_FRAGMENTS: '0' });
    // 結束碼 0；
    expect(r.status, r.all).toBe(0);
    // 報告檔的 missingAnchors 為空；
    const report = JSON.parse(fs.readFileSync(path.join(root, '.verify-report.json'), 'utf8')) as { missingAnchors: unknown[] };
    // 空；
    expect(report.missingAnchors).toEqual([]);
  });

  // BASE_PATH 會傳進連結檢查；
  it('BASE_PATH 生效：帶前綴的連結通過，沒帶前綴的算壞連結（仍為結束碼 0）', () => {
    // 造站：一個帶前綴、一個沒帶；
    const { root, out } = makeSite({ 'index.html': page('<a href="/x/a/b">帶前綴</a><a href="/a/b">沒帶</a>'), 'a/b.html': page('b'), '.nojekyll': '' });
    // 執行；
    const r = runCli(root, out, { BASE_PATH: '/x' });
    // 結束碼 0；
    expect(r.status, r.all).toBe(0);
    // 報告只有沒帶前綴的那條；
    const report = JSON.parse(fs.readFileSync(path.join(root, '.verify-report.json'), 'utf8')) as { broken: { href: string }[] };
    // 比對；
    expect(report.broken.map((b) => b.href)).toEqual(['/a/b']);
  });

  // 輸出資料夾不存在；
  it('輸出資料夾不存在：結束碼非 0', () => {
    // 只有 root；
    const root = makeDir({ '_config.yml': 'exclude:\n  - private/\n' });
    // 執行；
    const r = runCli(root, path.join(root, 'out'));
    // 非 0；
    expect(r.status).not.toBe(0);
  });

  // 讀不到 _config.yml 不能放行；
  it('找不到 _config.yml：結束碼非 0（排除清單讀不到就無法證明沒外洩）', () => {
    // 只有 out，沒有 _config.yml；
    const root = makeDir({ 'out/index.html': page('x') });
    // 執行；
    const r = runCli(root, path.join(root, 'out'));
    // 非 0；
    expect(r.status).not.toBe(0);
  });
});

// ===== package.json =====
describe('package.json 的 verify 指令', () => {
  // 讀 package.json；
  const pkg = JSON.parse(fs.readFileSync(path.join(siteDir, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
  // verify 指向 scripts/verify.mjs；
  it('verify 執行 scripts/verify.mjs', () => {
    // 比對指令；
    expect(pkg.scripts.verify).toBe('node scripts/verify.mjs');
  });
  // verify 不能串進 build（T14 的 workflow 在 build 之後才執行它）；
  it('build 指令不含 verify', () => {
    // 不含；
    expect(pkg.scripts.build).not.toContain('verify');
  });
});
