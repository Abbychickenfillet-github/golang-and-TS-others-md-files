// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本檔在 Node 環境執行；
// 匯入 vitest 的測試函式；
import { describe, expect, it } from 'vitest';
// 匯入 fileURLToPath，把 file:// 網址轉成路徑；
import { fileURLToPath } from 'node:url';
// 匯入被測的函式：產生改寫函式、改寫 html 的連結；
import { makeNoteHrefRewriter, rewriteNoteLinksInHtml } from '../src/lib/note-links';
// 匯入 Markdown 渲染；
import { renderMarkdown } from '../src/lib/markdown';
// 匯入網站載入與空報告；
import { emptyReport, loadSite } from '../src/lib/site';
// 匯入單篇渲染與 slug 查詢；
import { findNoteBySlug, renderNote } from '../src/lib/render-note';
// 匯入型別；
import type { NoteEntry } from '../src/lib/content';

// 測試用筆記庫；
const vault = fileURLToPath(new URL('./site-vault', import.meta.url));

// 已發布的筆記原始檔（relPath）；
const published = new Set(['a/note.md', 'a/other.md', 'a/sub/other.md', 'up/other.md', 'a/my note.md', 'a/h.html', 'a/中文 筆記.md', 'a/old.md', 'a/renamed.md']);
// 被取代的舊 html（R25）；
const superseded = new Set(['a/old.html']);

// 造一個改寫函式與它的計數；from 預設是 a/note.md；
function setup(from = 'a/note.md') {
  // 計數與未發布清單；
  const seen = { rewritten: 0, unpublished: [] as string[] };
  // 產生改寫函式；
  const rewrite = makeNoteHrefRewriter({
    from, // 目前筆記；
    published, // 已發布集合；
    superseded, // 被取代集合；
    onRewrite: () => (seen.rewritten += 1), // 每改寫一個加一；
    onUnpublished: (target: string) => seen.unpublished.push(target), // 記下未發布的目標；
  });
  // 回傳；
  return { rewrite, seen };
}

// 改寫函式本身；
describe('makeNoteHrefRewriter（R33）', () => {
  // 會被改寫的；each 的每一列是 [輸入, 預期]；
  it.each([
    ['other.md', 'other.html'],
    ['./sub/other.md#sec', './sub/other.html#sec'],
    ['../up/other.md?a=1', '../up/other.html?a=1'],
    ['../up/other.md?a=1#b', '../up/other.html?a=1#b'],
    ['my note.md', 'my note.html'],
    ['my%20note.md', 'my%20note.html'],
    ['%E4%B8%AD%E6%96%87%20%E7%AD%86%E8%A8%98.md', '%E4%B8%AD%E6%96%87%20%E7%AD%86%E8%A8%98.html'],
    ['中文 筆記.md', '中文 筆記.html'],
  ])('%s → %s', (input, expected) => {
    // 建立；
    const { rewrite, seen } = setup();
    // 斷言改寫結果；
    expect(rewrite(input)).toBe(expected);
    // 計數加一；
    expect(seen.rewritten).toBe(1);
    // 沒有未發布；
    expect(seen.unpublished).toEqual([]);
  });
  // 不動也不計數的；
  it.each(['h.html', 'old.html', 'https://x.y/other.md', 'mailto:a@b.c', 'tel:123', 'javascript:void(0)', 'data:text/plain,x.md', '#sec', '/a/other.md', '//host/other.md', 'pic.png', 'other.MD', ''])('%s 不改寫、不計入', (input) => {
    // 建立；
    const { rewrite, seen } = setup();
    // 回傳 null 代表不改；
    expect(rewrite(input)).toBeNull();
    // 沒計數；
    expect(seen.rewritten).toBe(0);
    // 沒有未發布；
    expect(seen.unpublished).toEqual([]);
  });
  // R34：html 原始檔不存在（或被排除），即使 renamed.md 已發布，也不算有效：不改、記為未發布；
  it('renamed.html 的原始檔沒發布、renamed.md 已發布：不改寫並記為未發布', () => {
    // 建立；
    const { rewrite, seen } = setup();
    // 不改；
    expect(rewrite('renamed.html#x')).toBeNull();
    // 記為未發布；
    expect(seen.unpublished).toEqual(['a/renamed.html']);
  });
  // R34：寫成 h.md，但 h.md 沒發布（不存在或被排除），發布的是無關的 h.html 筆記：不能改寫成 h.html；
  it('h.md 沒發布、無關的 h.html 筆記已發布：不改寫並記為未發布', () => {
    // 建立；
    const { rewrite, seen } = setup();
    // 不改；
    expect(rewrite('h.md')).toBeNull();
    // 沒有改寫；
    expect(seen.rewritten).toBe(0);
    // 記為未發布；
    expect(seen.unpublished).toEqual(['a/h.md']);
  });
  // R34：被取代的舊 X.html 只靠 superseded 判斷：這裡的已發布集合刻意不含 old.md，同名頁面規則抓不到它；
  it('被取代的舊 old.html：不改寫、不算未發布（走 superseded 分支）', () => {
    // 計數；
    const seen = { rewritten: 0, unpublished: [] as string[] };
    // 已發布集合不含 a/old.md；
    const rewrite = makeNoteHrefRewriter({
      from: 'a/note.md', // 目前筆記；
      published: new Set(['a/note.md']), // 只有自己；
      superseded: new Set(['a/old.html']), // 被取代的舊 html；
      onRewrite: () => (seen.rewritten += 1), // 計數；
      onUnpublished: (t: string) => seen.unpublished.push(t), // 記下；
    });
    // 不改；
    expect(rewrite('old.html')).toBeNull();
    // 不算未發布；
    expect(seen.unpublished).toEqual([]);
  });
  // 前後的 ASCII 空白先去掉再判斷；改寫後保留原本的空白；
  it('前後有空白的 href：去掉空白再判斷，改寫結果保留原空白；外部網址不動', () => {
    // 建立；
    const { rewrite, seen } = setup();
    // 改寫並保留空白；
    expect(rewrite(' other.md\n')).toBe(' other.html\n');
    // 外部網址不動也不計入；
    expect(rewrite(' https://x/y.md')).toBeNull();
    // 計數只有一次；
    expect(seen.rewritten).toBe(1);
    // 沒有未發布；
    expect(seen.unpublished).toEqual([]);
  });
  // 其他邊界；
  it.each(['a.md/b', 'x.markdown', 'pic.png?v=a.md', 'pic.png#a.md'])('%s 不是筆記原始檔：不改寫、不計入', (input) => {
    // 建立；
    const { rewrite, seen } = setup();
    // 不改；
    expect(rewrite(input)).toBeNull();
    // 沒計數；
    expect(seen.rewritten + seen.unpublished.length).toBe(0);
  });
  // 跑出根目錄；
  it('../../x.md（從 a/ 跑出根目錄）不改寫並記為未發布', () => {
    // 建立；
    const { rewrite, seen } = setup();
    // 不改；
    expect(rewrite('../../x.md')).toBeNull();
    // 記下原始連結；
    expect(seen.unpublished).toEqual(['../../x.md']);
  });
  // 指到沒發布的筆記：不改、記入；
  it.each([
    ['missing.md', 'a/missing.md'],
    ['../private/x.md', 'private/x.md'],
    ['gone.html', 'a/gone.html'],
  ])('%s 指到沒發布的筆記：不改寫並記下 %s', (input, target) => {
    // 建立；
    const { rewrite, seen } = setup();
    // 不改；
    expect(rewrite(input)).toBeNull();
    // 記下解析後的目標；
    expect(seen.unpublished).toEqual([target]);
  });
});

// md：remark 外掛；
describe('renderMarkdown 的 rewriteHref', () => {
  // 一份含各種寫法的 Markdown，用 CRLF 換行；
  const source = [
    '[a](other.md) [b](./sub/other.md#sec) [c](../up/other.md?a=1) [d](<my note.md>) [e](my%20note.md)', // 行內連結；
    '', // 空行；
    '[參考][r] ![圖](other.md) [外](https://x.y/other.md) [信](mailto:a@b.c) [錨](#sec) [絕](/a/other.md) [缺](missing.md)', // 參考式、圖片形式與不動的；
    '', // 空行；
    '`[i](other.md)`', // 行內程式碼；
    '', // 空行；
    '```', // 程式碼圍欄開始；
    '[f](other.md)', // 圍欄內；
    '```', // 圍欄結束；
    '', // 空行；
    '[r]: other.md', // 參考定義；
  ].join('\r\n');
  // 渲染並檢查；
  it('只改寫指到已發布筆記原始檔的連結，程式碼內不改，其他不動', async () => {
    // 建立改寫函式；
    const { rewrite, seen } = setup();
    // 渲染；其他回呼給空函式；
    const { html } = await renderMarkdown(source, { index: new Map(), onMissing: () => {}, onAmbiguous: () => {}, onImage: (n) => n, rewriteHref: rewrite });
    // 行內連結；
    expect(html).toContain('<a href="other.html">a</a>');
    // 帶錨點；
    expect(html).toContain('<a href="./sub/other.html#sec">b</a>');
    // 帶查詢；
    expect(html).toContain('<a href="../up/other.html?a=1">c</a>');
    // 角括號包起來、含空白的目標（輸出時空白被編成 %20）；
    expect(html).toContain('<a href="my%20note.html">d</a>');
    // 原本就編碼的；
    expect(html).toContain('<a href="my%20note.html">e</a>');
    // 參考式；
    expect(html).toContain('<a href="other.html">參考</a>');
    // 圖片形式；
    expect(html).toContain('<img src="other.html" alt="圖">');
    // 外部、信箱、錨點、絕對路徑不動；
    expect(html).toContain('href="https://x.y/other.md"');
    // 同上；
    expect(html).toContain('href="mailto:a@b.c"');
    // 同上；
    expect(html).toContain('href="#sec"');
    // 同上；
    expect(html).toContain('href="/a/other.md"');
    // 沒發布的不動；
    expect(html).toContain('href="missing.md"');
    // 程式碼裡的不動；
    expect(html).toContain('<code>[i](other.md)</code>');
    // 圍欄裡的不動；
    expect(html).toContain('[f](other.md)\n</code>');
    // 改寫次數：a、b、c、d、e、參考定義、圖片；
    expect(seen.rewritten).toBe(7);
    // 未發布：missing；
    expect(seen.unpublished).toEqual(['a/missing.md']);
  });
});

// html：只改 a／area 的 href，其餘位元組不動；
describe('rewriteNoteLinksInHtml', () => {
  // 改寫並比對整串；
  it('a 與 area 的 href 被改寫，其他屬性、引號、空白、link 與外部網址一律不動', () => {
    // 建立；
    const { rewrite, seen } = setup();
    // 輸入；含單引號、無引號、大寫標籤、link、外部網址與 script 內的字串；
    const input = `<p class=x><A  HREF="other.md#s" data-x='1'>甲</A>\n<area href='../up/other.md'><a href=my%20note.md>乙</a>\n<link rel="next" href="other.md"><a href="https://x.y/other.md">外</a><a href="missing.md">缺</a></p><script>var a = '<a href="other.md">';</script>`;
    // 預期：只有三個 href 換掉；
    const expected = `<p class=x><A  HREF="other.html#s" data-x='1'>甲</A>\n<area href='../up/other.html'><a href=my%20note.html>乙</a>\n<link rel="next" href="other.md"><a href="https://x.y/other.md">外</a><a href="missing.md">缺</a></p><script>var a = '<a href="other.md">';</script>`;
    // 斷言；
    expect(rewriteNoteLinksInHtml(input, rewrite)).toBe(expected);
    // 計數；
    expect(seen.rewritten).toBe(3);
    // 未發布；
    expect(seen.unpublished).toEqual(['a/missing.md']);
  });
  // 實體：原始路徑與解碼後不同、無法在原文上安全替換時不改，也不計數；可以替換的才計數；
  it('href 含實體：&#63; 讓原文的路徑與解碼值不同 → 不改不計數；&amp; 在路徑裡 → 照常改寫並計數', () => {
    // 計數；
    const seen = { rewritten: 0, unpublished: [] as string[] };
    // 已發布集合多一個檔名含 & 的筆記；
    const rewrite = makeNoteHrefRewriter({
      from: 'a/note.md', // 目前筆記；
      published: new Set(['a/other.md', 'a/a&b.md']), // 已發布；
      superseded: new Set(), // 沒有被取代的；
      onRewrite: () => (seen.rewritten += 1), // 計數；
      onUnpublished: (t: string) => seen.unpublished.push(t), // 記下；
    });
    // 輸入；
    const input = '<a href="other.md&#63;x=1">甲</a><a href="a&amp;b.md">乙</a>';
    // 第一個不動，第二個改；
    expect(rewriteNoteLinksInHtml(input, rewrite)).toBe('<a href="other.md&#63;x=1">甲</a><a href="a&amp;b.html">乙</a>');
    // 只計第二個；
    expect(seen.rewritten).toBe(1);
  });
  // 空白：保留屬性值前後原本的空白，其餘位元組不動；外部網址不動；
  it('href 前後有空白：改寫路徑並保留原空白；外部網址不動', () => {
    // 建立；
    const { rewrite, seen } = setup();
    // 輸入；
    const input = '<a href=" other.md ">甲</a><a href=" https://x/y.md">乙</a>';
    // 預期；
    expect(rewriteNoteLinksInHtml(input, rewrite)).toBe('<a href=" other.html ">甲</a><a href=" https://x/y.md">乙</a>');
    // 計數；
    expect(seen.rewritten).toBe(1);
  });
  // CRLF：換行位元組完全保留；
  it('CRLF 換行的 html：只換 href，CRLF 原樣保留', () => {
    // 建立；
    const { rewrite } = setup();
    // 輸入；
    const input = '<p>\r\n<a\r\n href="other.md">甲</a>\r\n</p>\r\n';
    // 斷言；
    expect(rewriteNoteLinksInHtml(input, rewrite)).toBe('<p>\r\n<a\r\n href="other.html">甲</a>\r\n</p>\r\n');
  });
  // 沒有可改的就原樣回傳同一個字串；
  it('沒有連結時原樣回傳', () => {
    // 建立；
    const { rewrite } = setup();
    // 斷言；
    expect(rewriteNoteLinksInHtml('<p>無</p>', rewrite)).toBe('<p>無</p>');
  });
});

// 整合：renderNote 對 md 與 html 筆記都套用同一個改寫，並寫進報告；
describe('renderNote 套用 R33', () => {
  // site-vault 的 簡報/deck.md 與 前端/日期 物件-互動版.html 都有指到原始檔的連結；
  it('md 與 html 筆記的原始檔連結被改寫，報告計數', async () => {
    // 載入；
    const site = await loadSite(vault);
    // 新報告；
    const report = emptyReport();
    // md；
    const md = await renderNote(site, findNoteBySlug(site, ['簡報', 'deck']) as NoteEntry, '', report);
    // 只有 md 有 html 欄位；
    if (md.kind !== 'md') throw new Error('應該是 md');
    // 改寫成頁面；
    expect(md.html).toContain('<a href="../%E7%B0%A1%E5%A0%B1.html">總覽</a>');
    // html；
    const page = await renderNote(site, findNoteBySlug(site, ['前端', '日期 物件-互動版']) as NoteEntry, '', report);
    // 只有 html 有 parsed；
    if (page.kind !== 'html') throw new Error('應該是 html');
    // 改寫成頁面；
    expect(page.parsed.bodyHtml).toContain('<a href="日期%20物件.html">md 版</a>');
    // 報告計數；
    expect(report.noteLinksRewritten).toBe(2);
  });
});
