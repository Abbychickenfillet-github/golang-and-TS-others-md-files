// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本檔在 Node 環境執行（要用 fs 與 file: 網址）；
// 匯入 vitest 的測試函式；
import { describe, expect, it } from 'vitest';
// 匯入 fileURLToPath，把 file:// 網址轉成路徑；
import { fileURLToPath } from 'node:url';
// 匯入 fs 的 promise 版 API，用來造暫存筆記庫與暫存輸出資料夾；
import * as fs from 'node:fs/promises';
// 匯入 os，取得系統暫存資料夾位置；
import * as os from 'node:os';
// 匯入 path 模組；
import * as path from 'node:path';
// 匯入被測的網站函式；
import { applyReservedSlugs, emptyReport, loadSite } from '../src/lib/site';
// 匯入單篇渲染與 slug 查詢；
import { findNoteBySlug, renderNote } from '../src/lib/render-note';
// 匯入 basePath 驗證；
import { getBasePath } from '../src/lib/base-path';
// 匯入建置後的檔名修正（.mjs）；
import { fixExportNames } from '../scripts/fix-export-names.mjs';
// 匯入建置後的 RSC 產物清理與同名資料夾統計（.mjs）；
import { findCoexistingFolders, pruneExport } from '../scripts/prune-export.mjs';
// 匯入型別；
import type { NoteEntry } from '../src/lib/content';

// 測試用筆記庫；
const vault = fileURLToPath(new URL('./site-vault', import.meta.url));

// 造一篇假筆記；
function fake(relPath: string): NoteEntry {
  // 副檔名決定種類；
  const kind = relPath.endsWith('.md') ? 'md' : 'html';
  // slug 是去掉副檔名後依 / 切開；
  const slug = relPath.replace(/\.(md|html)$/, '').split('/');
  // 回傳物件；
  return { kind, relPath, slug, title: slug.at(-1) as string, frontmatter: {} };
}

// 在暫存區造一個筆記庫：files 是 { 相對路徑: 內容 }；回傳根目錄；
async function tempVault(files: Record<string, string>): Promise<string> {
  // mkdtemp 在前綴後補亂數；
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vault-'));
  // 每個筆記庫都要有 _config.yml；
  await fs.writeFile(path.join(root, '_config.yml'), 'exclude:\n  - private/\n');
  // Object.entries 逐一寫檔；
  for (const [rel, text] of Object.entries(files)) {
    // 先建資料夾；dirname 取上層；recursive 一次建好多層；
    await fs.mkdir(path.dirname(path.join(root, rel)), { recursive: true });
    // 寫檔；
    await fs.writeFile(path.join(root, rel), text);
  }
  // 回傳；
  return root;
}

// R29：保留的 slug；
describe('applyReservedSlugs（R29）', () => {
  // 根目錄的 index 被排除並列入 reserved；
  it('根目錄的 index.html 不發布，列入 reserved', () => {
    // 執行；
    const { published, reserved } = applyReservedSlugs([fake('index.html'), fake('a.md'), fake('docs/index.md')]);
    // 只有根層的 index 被拿掉，子資料夾的 index 照常發布；
    expect(published.map((n) => n.relPath)).toEqual(['a.md', 'docs/index.md']);
    // 列入 reserved；
    expect(reserved).toEqual(['index.html']);
  });
  // 其他保留名稱丟錯並點名路徑；each 對每個路徑跑一次；
  it.each(['404.md', '_next/x.md', 'assets/x.html', 'Assets/y.md'])('保留的 slug %s 丟錯並點名路徑', (relPath) => {
    // toThrow 的參數是字串時，訊息要包含它；
    expect(() => applyReservedSlugs([fake(relPath)])).toThrow(relPath);
  });
  // loadSite：site-vault 的根目錄 index.html 被排除；
  it('loadSite 把 site-vault 根目錄的 index.html 列入 reserved 且不發布', async () => {
    // 載入；
    const site = await loadSite(vault);
    // 不在發布清單；
    expect(site.notes.some((n) => n.relPath === 'index.html')).toBe(false);
    // 在報告；
    expect(site.report.reserved).toEqual(['index.html']);
  });
  // loadSite：404 與 assets 底下的筆記讓載入失敗；
  it.each([['404.md'], ['assets/readme.md']])('loadSite 遇到 %s 丟錯', async (rel) => {
    // 造筆記庫；
    const root = await tempVault({ [rel]: '# x\n', 'ok.md': '# ok\n' });
    // rejects.toThrow 斷言 Promise 失敗且訊息含路徑；
    await expect(loadSite(root)).rejects.toThrow(rel);
    // 清掉；
    await fs.rm(root, { recursive: true, force: true });
  });
});

// 小修 (c)：BASE_PATH 不可是協定相對網址或含 //、scheme；
describe('getBasePath 拒絕 // 與 scheme', () => {
  // each 對每個值跑一次；
  it.each(['//host', '//host/x', '/a//b', '/http:', '/a/', 'https://x.y'])('%s 丟錯', (value) => {
    // 斷言丟錯；
    expect(() => getBasePath({ BASE_PATH: value })).toThrow(/BASE_PATH/);
  });
  // 多層路徑仍可；
  it('多層路徑 /a/b 可以', () => {
    // 斷言；
    expect(getBasePath({ BASE_PATH: '/a/b' })).toBe('/a/b');
  });
});

// 小修 (a)：直接跑 next build 也不能繞過 STRICT_LINKS；
describe('renderNote 的 strictLinks', () => {
  // 開了嚴格模式、遇到歧義連結就丟錯，訊息點名筆記與連結；
  it('strictLinks 為 true 且有歧義連結時丟錯', async () => {
    // 載入；
    const site = await loadSite(vault);
    // 取出含 [[說明]] 的筆記；
    const note = findNoteBySlug(site, ['前端', '日期 物件']) as NoteEntry;
    // 斷言 Promise 失敗；正規式要求同時出現筆記路徑與連結；
    await expect(renderNote(site, note, '', emptyReport(), { strictLinks: true })).rejects.toThrow(/前端\/日期 物件\.md[\s\S]*\[\[說明\]\]/);
    // 沒開就不丟錯；
    await expect(renderNote(site, note, '', emptyReport(), { strictLinks: false })).resolves.toBeTruthy();
  });
});

// 小修 (b)：fixExportNames 不可默默略過；
describe('fixExportNames 衝突時丟錯', () => {
  // 原名與跳脫名同時存在；
  it('原名與跳脫後的名稱同時存在時丟錯並點名兩個路徑', async () => {
    // 暫存輸出資料夾；
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fix-'));
    // 兩個都存在；
    await fs.writeFile(path.join(dir, 'C#.html'), 'a');
    // 同上；
    await fs.writeFile(path.join(dir, 'C%23.html'), 'b');
    // 斷言丟錯且訊息含兩個名稱；
    await expect(fixExportNames(dir, [['C#']])).rejects.toThrow(/C#\.html[\s\S]*C%23\.html|C%23\.html[\s\S]*C#\.html/);
    // 清掉；
    await fs.rm(dir, { recursive: true, force: true });
  });
  // 兩篇筆記修正後會對到同一個檔名（字面上就叫 C%23 的筆記與 C# 筆記）；
  it('兩篇筆記會寫到同一個輸出檔名時丟錯', async () => {
    // 暫存輸出資料夾；
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fix-'));
    // 斷言丟錯並點名兩篇；
    await expect(fixExportNames(dir, [['C#'], ['C%23']])).rejects.toThrow(/C#[\s\S]*C%23/);
    // 清掉；
    await fs.rm(dir, { recursive: true, force: true });
  });
});

// R30：清掉 RSC 產物；
describe('pruneExport（R30）', () => {
  // 造一個像 Next 輸出的資料夾，清理後檢查；
  it('刪掉頁面旁的 .txt、__next.*、__PAGE__.txt 與因此變空的資料夾，其餘不動，而且可重跑', async () => {
    // 暫存輸出資料夾；
    const out = await fs.mkdtemp(path.join(os.tmpdir(), 'prune-'));
    // 要寫的檔案：Next 產物與真正的內容；
    const files = [
      'index.html', // 首頁，保留；
      'index.txt', // 首頁的 RSC，刪；
      '404.html', // 保留；
      '__next._full.txt', // 根層 RSC，刪；
      '_next/static/chunks/a.js', // 靜態資源，保留；
      '_next/static/x/__next.keep.txt', // _next 底下一律不動；
      'a.html', // 頁面 a，保留；
      'a.txt', // 刪；
      'a/__next._tree.txt', // 刪；
      'a/__next.$c$slug/__PAGE__.txt', // 刪，資料夾跟著變空而刪；
      'a/b.html', // a 底下的真頁面，保留，所以 a/ 保留；
      'a/b.txt', // 刪；
      'a/b/__next._full.txt', // 刪，b/ 變空而刪；
      'c.html', // 頁面 c，保留；
      'c/__next._full.txt', // 刪，c/ 變空而刪；
      'notes.txt', // 不是頁面的 .txt（沒有對應的頁面），保留；
      'assets/x.txt', // 保留；
    ];
    // 逐一建立；
    for (const rel of files) {
      // 建上層資料夾；
      await fs.mkdir(path.dirname(path.join(out, rel)), { recursive: true });
      // 寫內容；
      await fs.writeFile(path.join(out, rel), 'x');
    }
    // 頁面清單（slug）；
    const pages = [['a'], ['a', 'b'], ['c']];
    // 第一次清理；
    const stats = await pruneExport(out, pages);
    // 刪掉的檔案數：index.txt、__next._full.txt、a.txt、a/__next._tree.txt、__PAGE__.txt、a/b.txt、a/b/__next._full.txt、c/__next._full.txt；
    expect(stats.files).toBe(8);
    // 刪掉的資料夾：a/__next.$c$slug、a/b、c；
    expect(stats.folders).toBe(3);
    // 留下的檔案；讀出整棵樹（recursive 列出所有子項目），只留檔案並換成正斜線；
    const left = (await fs.readdir(out, { recursive: true, withFileTypes: true }))
      .filter((e) => e.isFile())
      .map((e) => path.relative(out, path.join(e.parentPath, e.name)).replace(/\\/g, '/'))
      .sort();
    // 斷言；
    expect(left).toEqual(['404.html', '_next/static/chunks/a.js', '_next/static/x/__next.keep.txt', 'a.html', 'a/b.html', 'assets/x.txt', 'c.html', 'index.html', 'notes.txt']);
    // 再跑一次什麼都不刪（可重跑）；
    expect(await pruneExport(out, pages)).toMatchObject({ files: 0, folders: 0 });
    // 同名資料夾統計：只有 a.html 與 a/ 並存（a/ 底下有真頁面）；
    expect(await findCoexistingFolders(out)).toEqual(['a']);
    // 清掉；
    await fs.rm(out, { recursive: true, force: true });
  });
});
