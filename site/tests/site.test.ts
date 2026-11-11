// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本檔改用 Node 環境（jsdom 下的 import.meta.url 不是 file: 網址，fileURLToPath 會失敗）；
// 匯入 vitest 的測試函式：describe 分組、it 定義案例、expect 斷言、beforeAll 在整組前執行一次；
import { beforeAll, describe, expect, it } from 'vitest';
// 匯入 fileURLToPath，把 file:// 網址轉成作業系統路徑；
import { fileURLToPath } from 'node:url';
// 匯入被測的函式；
import { dropSuperseded, emptyReport, findCaseCollisions, loadSite } from '../src/lib/site';
// 匯入型別；
import type { LoadedSite } from '../src/lib/site';
// 匯入渲染與網址工具；
import { encodeSitePath, findNoteBySlug, renderNote } from '../src/lib/render-note';
// 匯入報告工具；
import { assertStrictLinks, formatReport } from '../src/lib/report';
// 匯入 basePath 驗證；
import { getBasePath } from '../src/lib/base-path';
// 匯入型別；
import type { NoteEntry } from '../src/lib/content';

// 測試用筆記庫的絕對路徑；new URL 以本檔為基準解析相對路徑；
const vault = fileURLToPath(new URL('./site-vault', import.meta.url));

// 造一篇假筆記的小工具；relPath 決定 kind 與 slug；
function fake(relPath: string): NoteEntry {
  // 副檔名決定種類；
  const kind = relPath.endsWith('.md') ? 'md' : 'html';
  // slug 是去掉副檔名後依 / 切開；replace 用正規式去掉結尾副檔名；
  const slug = relPath.replace(/\.(md|html)$/, '').split('/');
  // 回傳物件；
  return { kind, relPath, slug, title: slug.at(-1) as string, frontmatter: {} };
}

// 純函式：被取代的舊 html；
describe('dropSuperseded（R25）', () => {
  // 三方並存時舊 html 被拿掉；
  it('X.md、X.html、X-互動版.html 並存時舊的 X.html 不發布並列入清單', () => {
    // 執行；
    const { published, superseded } = dropSuperseded([fake('a/X.md'), fake('a/X.html'), fake('a/X-互動版.html'), fake('b.md')]);
    // 發布清單不含舊 html；map 取出 relPath；
    expect(published.map((n) => n.relPath)).toEqual(['a/X.md', 'a/X-互動版.html', 'b.md']);
    // 清單記下取代者；
    expect(superseded).toEqual([{ relPath: 'a/X.html', replacedBy: 'a/X-互動版.html' }]);
  });
  // 沒有互動版時不動（之後 assertUniqueSlugs 會丟錯）；
  it('沒有互動版的 md／html 配對不算被取代', () => {
    // 執行；
    const { published, superseded } = dropSuperseded([fake('X.md'), fake('X.html')]);
    // 兩篇都還在；
    expect(published).toHaveLength(2);
    // 沒有被取代的；
    expect(superseded).toEqual([]);
  });
  // 只有 html 與互動版、沒有 md：不符合規則；
  it('沒有 md 時舊 html 照常發布', () => {
    // 執行；
    const { superseded } = dropSuperseded([fake('X.html'), fake('X-互動版.html')]);
    // 沒有被取代的；
    expect(superseded).toEqual([]);
  });
});

// 純函式：大小寫與 NFC 衝突；
describe('findCaseCollisions', () => {
  // 大小寫不同；
  it('只差大小寫的 slug 列為一組', () => {
    // 執行並斷言；
    expect(findCaseCollisions([fake('Foo/A.md'), fake('foo/a.html'), fake('b.md')])).toEqual([['Foo/A.md', 'foo/a.html']]);
  });
  // NFD 與 NFC：é 可以寫成單一字元或 e 加組合重音；
  it('NFD 與 NFC 寫法相同的 slug 列為一組', () => {
    // 'é' 是 e 加組合重音（NFD），'é' 是預組的 é（NFC）；
    expect(findCaseCollisions([fake('café.md'), fake('café.html')])).toHaveLength(1);
  });
  // 沒有衝突；
  it('沒有衝突時回傳空陣列', () => {
    // 斷言；
    expect(findCaseCollisions([fake('a.md'), fake('b.md')])).toEqual([]);
  });
});

// basePath 驗證；
describe('getBasePath', () => {
  // 沒設定是空字串；
  it('沒設定時是空字串', () => {
    // 傳入空的環境物件；
    expect(getBasePath({})).toBe('');
  });
  // 合法值原樣回傳；
  it('合法值原樣回傳', () => {
    // 斷言；
    expect(getBasePath({ BASE_PATH: '/Abby-notes' })).toBe('/Abby-notes');
  });
  // 不合法值丟錯；each 對每個值跑一次；
  it.each(['Abby-notes', '/Abby-notes/', '/', '/a b', '/a#b'])('不合法的 %s 丟錯', (value) => {
    // toThrow 斷言會丟錯；
    expect(() => getBasePath({ BASE_PATH: value })).toThrow(/BASE_PATH/);
  });
});

// 網址編碼；
describe('encodeSitePath', () => {
  // 每段各自編碼；
  it('中文、空白、#、+、括號、% 都逐段編碼', () => {
    // 斷言；
    expect(encodeSitePath('特殊/C++ (入門) 100%.png', '/b')).toBe('/b/%E7%89%B9%E6%AE%8A/C%2B%2B%20(%E5%85%A5%E9%96%80)%20100%25.png');
  });
});

// 用測試筆記庫實際載入；
describe('loadSite（site-vault）', () => {
  // 整組共用的網站物件；
  let site: LoadedSite;
  // 整組前載入一次；
  beforeAll(async () => {
    // 載入；
    site = await loadSite(vault);
  });
  // 發布清單；
  it('排除 private、底線資料夾與被取代的舊 html', () => {
    // 取出所有 relPath；
    const paths = site.notes.map((n) => n.relPath);
    // 被取代的舊 html 不在；
    expect(paths).not.toContain('舊/對照.html');
    // 互動版與 md 都在；
    expect(paths).toEqual(expect.arrayContaining(['舊/對照.md', '舊/對照-互動版.html', '前端/日期 物件.md', '前端/日期 物件-互動版.html']));
    // 被排除的不在；some 只要一個符合就是 true；
    expect(paths.some((p) => p.startsWith('private/') || p.startsWith('_hidden/'))).toBe(false);
    // 報告列出被取代者；
    expect(site.report.superseded).toEqual([{ relPath: '舊/對照.html', replacedBy: '舊/對照-互動版.html' }]);
  });
  // 圖片索引不含被排除的圖；
  it('圖片索引不含被排除資料夾的圖片', () => {
    // 有 pic.png；
    expect(site.images.get('pic.png')).toEqual(['前端/pic.png']);
    // 沒有 secret.png；
    expect(site.images.has('secret.png')).toBe(false);
  });
  // md 渲染與報告；
  it('md 渲染：wikilink 與圖片網址編碼正確，找不到與歧義都記進報告', async () => {
    // 新報告，避免與其他案例互相影響；
    const report = emptyReport();
    // 取出筆記；
    const note = findNoteBySlug(site, ['前端', '日期 物件']) as NoteEntry;
    // 渲染；
    const r = await renderNote(site, note, '/base', report);
    // 只有 md 才有 html 欄位；
    if (r.kind !== 'md') throw new Error('應該是 md');
    // 連到含特殊字元的筆記；
    expect(r.html).toContain('href="/base/%E7%89%B9%E6%AE%8A/C%2B%2B%20(%E5%85%A5%E9%96%80)%20100%25"');
    // 圖片網址；
    expect(r.html).toContain('src="/base/%E5%89%8D%E7%AB%AF/pic.png"');
    // 被引用的圖記下來；
    expect(Array.from(report.images)).toEqual(['前端/pic.png']);
    // 找不到的圖（含被排除的）記下來且以名稱當 src；
    expect(Array.from(report.missingImages.keys()).sort()).toEqual(['nope.png', 'secret.png']);
    // 被排除的圖片名稱原樣，沒有任何 private 路徑外洩；
    expect(r.html).not.toContain('private');
    // 找不到的 wikilink 記下來並附上來源筆記；
    expect(report.missingLinks.get('不存在的筆記')).toEqual(new Set(['前端/日期 物件.md']));
    // 連到被排除筆記的也是找不到；
    expect(report.missingLinks.has('secret')).toBe(true);
    // 歧義的 wikilink 列出兩個候選；
    expect(report.ambiguousLinks.get('說明')?.candidates.sort()).toEqual(['a/說明.md', 'b/說明.md']);
  });
  // html 渲染；
  it('html 渲染：body 的 wikilink 被改寫、note-quiz 需求被偵測', async () => {
    // 新報告；
    const report = emptyReport();
    // 互動版；
    const r = await renderNote(site, findNoteBySlug(site, ['前端', '日期 物件-互動版']) as NoteEntry, '', report);
    // 只有 html 才有 parsed；
    if (r.kind !== 'html') throw new Error('應該是 html');
    // wikilink 改寫成連結；
    expect(r.parsed.bodyHtml).toContain('href="/%E5%89%8D%E7%AB%AF/%E6%97%A5%E6%9C%9F%20%E7%89%A9%E4%BB%B6"');
    // 共用腳本被濾掉，只剩三段 inline；
    expect(r.parsed.pageScripts.map((s) => s.src ?? 'inline')).toEqual(['inline', 'inline', 'inline']);
    // 不需要 note-quiz；
    expect(r.needsQuiz).toBe(false);
    // 測驗頁需要；
    const quiz = await renderNote(site, findNoteBySlug(site, ['quiz', '測驗']) as NoteEntry, '', report);
    // 斷言；
    expect(quiz.kind === 'html' && quiz.needsQuiz).toBe(true);
  });
  // slug 查詢可接受編碼過的片段；
  it('findNoteBySlug 接受已解碼或百分比編碼的片段，單獨的 % 不會丟錯', () => {
    // 已解碼；
    expect(findNoteBySlug(site, ['特殊', 'C++ (入門) 100%'])?.relPath).toBe('特殊/C++ (入門) 100%.md');
    // 編碼過；map 逐段編碼；
    expect(findNoteBySlug(site, ['特殊', 'C++ (入門) 100%'].map(encodeURIComponent))?.relPath).toBe('特殊/C++ (入門) 100%.md');
  });
});

// 報告與嚴格模式；
describe('report', () => {
  // 摘要與嚴格模式；
  it('摘要列出歧義連結；STRICT_LINKS=1 才丟錯', () => {
    // 造一份有歧義的報告；
    const report = emptyReport();
    // 加一筆歧義；
    report.ambiguousLinks.set('說明', { candidates: ['a/說明.md', 'b/說明.md'], from: new Set(['x.md']) });
    // 摘要含目標與候選；
    expect(formatReport(report)).toMatch(/\[\[說明\]\][\s\S]*a\/說明\.md、b\/說明\.md/);
    // 沒開嚴格模式不丟錯；
    expect(() => assertStrictLinks(report, {})).not.toThrow();
    // 開了就丟錯；
    expect(() => assertStrictLinks(report, { STRICT_LINKS: '1' })).toThrow(/STRICT_LINKS/);
    // 沒有歧義時開嚴格模式也不丟錯；
    expect(() => assertStrictLinks(emptyReport(), { STRICT_LINKS: '1' })).not.toThrow();
  });
});
