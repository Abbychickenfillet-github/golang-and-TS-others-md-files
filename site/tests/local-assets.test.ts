// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本檔在 Node 環境執行（要用 fs 造暫存筆記庫）；
// 匯入 vitest 的測試函式；
import { describe, expect, it } from 'vitest';
// 匯入 fs 的 promise 版 API，用來造暫存筆記庫、讀回複製結果；
import * as fs from 'node:fs/promises';
// 匯入 os，取得系統暫存資料夾位置；
import * as os from 'node:os';
// 匯入 path 模組；
import * as path from 'node:path';
// 匯入 fileURLToPath，把 file:// 網址轉成路徑；
import { fileURLToPath } from 'node:url';
// 匯入被測的函式；
import { collectLocalAssets, copyLocalAssets, dirSize, formatLocalAssetsReport, isPathExcluded, rawReferences, resolveReference } from '../src/lib/local-assets';
// 匯入網站載入與排除清單讀取；
import { loadSite } from '../src/lib/site';
// 匯入排除清單讀取；
import { loadExclude } from '../src/lib/content';
// 匯入 .nojekyll 寫入函式與 RSC 清理函式（.mjs）；
import { writeNojekyll } from '../scripts/write-nojekyll.mjs';
// 匯入 RSC 清理函式；
import { pruneExport } from '../scripts/prune-export.mjs';

// 造一個暫存筆記庫：files 是 { 相對路徑: 內容（字串或 Buffer） }；固定寫入 _config.yml（排除 private/）；回傳根目錄；
async function tempVault(files: Record<string, string | Buffer>): Promise<string> {
  // mkdtemp 在前綴後補亂數；
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'local-assets-'));
  // 每個筆記庫都要有 _config.yml；
  await fs.writeFile(path.join(root, '_config.yml'), 'exclude:\n  - private/\n');
  // 逐檔寫入；
  for (const [rel, data] of Object.entries(files)) {
    // 先建資料夾；
    await fs.mkdir(path.dirname(path.join(root, rel)), { recursive: true });
    // 寫檔；
    await fs.writeFile(path.join(root, rel), data);
  }
  // 回傳；
  return root;
}

// 載入暫存筆記庫並收集本地附件；images 模擬 .build-report.json 的 images；
async function collect(root: string, images: string[] = []) {
  // 載入網站；
  const site = await loadSite(root);
  // 讀排除清單；
  const exclude = await loadExclude(path.join(root, '_config.yml'));
  // 收集；
  return collectLocalAssets(site, exclude, images);
}

// 把「筆記 → 目標集合」的 Map 轉成好比對的純物件；
const obj = (m: Map<string, Set<string>>) => Object.fromEntries(Array.from(m, ([k, v]) => [k, Array.from(v).sort()]));

// 原始引用的抽取；
describe('rawReferences', () => {
  // html：每一種來源都要抽到；
  it('html：src、href（a 與 link）、srcset、poster、script src、source src 都抽到', () => {
    // 準備一份含各種來源的 html；
    const html = `<html><head>
      <link rel="stylesheet" href="s.css"><script src="s.js"></script>
    </head><body>
      <img src="a.png" srcset="b.png 1x, c.png 2x">
      <picture><source srcset="d.webp 640w, e.webp 1280w" src="f.webp"></picture>
      <video poster="p.jpg" src="v.mp4"><source src="v2.webm"></video>
      <audio src="au.mp3"></audio>
      <a href="doc.pdf">pdf</a><area href="map.png">
    </body></html>`;
    // 排序後比對，不依賴抽取順序；
    expect(rawReferences('html', html).sort()).toEqual(['a.png', 'au.mp3', 'b.png', 'c.png', 'd.webp', 'doc.pdf', 'e.webp', 'f.webp', 'map.png', 'p.jpg', 's.css', 's.js', 'v.mp4', 'v2.webm'].sort());
  });

  // md：連結、圖片、連結定義、手寫 html；程式碼區塊與行內程式碼不算；
  it('md：連結、圖片、參考式定義與手寫 html 都抽到，程式碼裡的不算，前言不算', () => {
    // 準備；
    const md = ['---', 'cover: front.png', '---', '[x](a.pdf) ![y](b.png) [ref][r] <https://e.com>', '', '[r]: c.zip', '', '<img src="d.jpg">', '', '```', '[no](code.png)', '```', '', '`[no](inline.png)`'].join('\n');
    // 比對；
    expect(rawReferences('md', md).sort()).toEqual(['a.pdf', 'b.png', 'c.zip', 'd.jpg', 'https://e.com'].sort());
  });
});

// 解析成筆記庫內的路徑；
describe('resolveReference', () => {
  // 以表格形式列出輸入與預期；
  it.each([
    // [筆記路徑, 原始引用, 預期結果]；
    ['a/n.md', 'pic.png', { kind: 'local', rel: 'a/pic.png' }],
    ['a/n.md', './pic.png', { kind: 'local', rel: 'a/pic.png' }],
    ['a/n.md', '../x/pic.png', { kind: 'local', rel: 'x/pic.png' }],
    ['n.md', 'sub/pic.png', { kind: 'local', rel: 'sub/pic.png' }],
    // 百分比編碼：空白與中文會解碼；
    ['a/n.md', 'my%20pic.png', { kind: 'local', rel: 'a/my pic.png' }],
    ['a/n.md', '%E4%B8%AD%E6%96%87.png', { kind: 'local', rel: 'a/中文.png' }],
    ['a/n.md', '中文 圖.png', { kind: 'local', rel: 'a/中文 圖.png' }],
    // 單獨的 % 不會讓解碼丟錯；
    ['a/n.md', '100%.png', { kind: 'local', rel: 'a/100%.png' }],
    // ?query 與 #fragment 先去掉；%3F 解碼後是檔名的一部分，不是 query；
    ['a/n.md', 'pic.png?v=2', { kind: 'local', rel: 'a/pic.png' }],
    ['a/n.md', 'doc.pdf#page=3', { kind: 'local', rel: 'a/doc.pdf' }],
    ['a/n.md', 'what%3F.png', { kind: 'local', rel: 'a/what?.png' }],
    // 外部、data、其他協定、錨點、絕對路徑、協定相對、空字串都略過；
    ['a/n.md', 'https://e.com/x.png', { kind: 'skip' }],
    ['a/n.md', 'HTTP://e.com/x.png', { kind: 'skip' }],
    ['a/n.md', 'data:image/png;base64,AAAA', { kind: 'skip' }],
    ['a/n.md', 'mailto:a@b.c', { kind: 'skip' }],
    ['a/n.md', 'javascript:void(0)', { kind: 'skip' }],
    ['a/n.md', '#top', { kind: 'skip' }],
    ['a/n.md', '/assets/x.png', { kind: 'skip' }],
    ['a/n.md', '//cdn.example.com/x.js', { kind: 'skip' }],
    ['a/n.md', '', { kind: 'skip' }],
    ['a/n.md', '?v=1', { kind: 'skip' }],
    // 資料夾連結略過；
    ['a/n.md', 'sub/', { kind: 'skip' }],
    ['n.md', '.', { kind: 'skip' }],
    ['a/n.md', '..', { kind: 'skip' }],
    // 用 .. 跑出筆記根目錄一律拒絕；
    ['a/n.md', '../../x.png', { kind: 'outside' }],
    ['n.md', '../x.png', { kind: 'outside' }],
    ['a/n.md', '../../../etc/passwd', { kind: 'outside' }],
    // 先往上再往下仍在根目錄內，合法；
    ['a/b/n.md', '../../c.png', { kind: 'local', rel: 'c.png' }],
  ] as const)('%s 引用 %s', (note, raw, expected) => {
    // 斷言；
    expect(resolveReference(note, raw)).toEqual(expected);
  });
});

// 被排除的路徑判斷；
describe('isPathExcluded', () => {
  // 排除清單；
  const exclude = ['private/', '*.sh'];
  // 資料夾底下的檔案、深層檔案、底線與點開頭、node_modules 都算；
  it.each([
    ['private/secret.png', true],
    ['private/a/b.png', true],
    ['x/run.sh', true],
    ['_hidden/a.png', true],
    ['a/_b/c.png', true],
    ['.git/x.png', true],
    ['node_modules/p/x.png', true],
    ['a/node_modules/p/x.png', true],
    ['a/.env', true],
    ['ok/pic.png', false],
    // 只有根層的 private/ 被排除（與 Jekyll 一致）；
    ['x/private/pic.png', false],
  ])('%s → %s', (rel, expected) => {
    // 斷言；
    expect(isPathExcluded(rel, exclude)).toBe(expected);
  });
});

// 收集與複製；
describe('collectLocalAssets 與 copyLocalAssets', () => {
  // 一個 png 的位元組：含 0x00、0xff 與換行字元，用來證明複製沒有經過任何文字轉換；
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0xfe, 0x0a, 0x0d]);
  // 準備筆記庫的內容；
  const vaultFiles = (): Record<string, string | Buffer> => ({
    // md 筆記：各種引用；
    'notes/a.md': ['# a', '', '![圖](pics/p%201.png)', '[手冊](../docs/手冊.pdf)', '[壞](missing.zip)', '[私](../private/secret.png)', '[出](../../outside.png)', '[外](https://example.com/x.png)', '[筆記](b.md) [頁面](b.html) [資料夾](pics/)', '', '```', '![code](fake.png)', '```'].join('\n'),
    // 另一篇 md；
    'notes/b.md': '# b\n',
    // html 筆記：各種引用；
    'notes/h.html': `<!doctype html><html><head><title>h</title>
      <link rel="stylesheet" href="s.css"><script src="s.js"></script><script src="../assets/notes.js"></script>
    </head><body>
      <img src="pics/p%201.png?v=2#x"><img srcset="pics/p%201.png 1x, pics/中文.jpg 2x">
      <video poster="poster.jpg"><source src="v.mp4"></video>
      <a href="../docs/手冊.pdf#page=2">pdf</a>
      <a href="data:text/plain,hi">d</a><a href="mailto:a@b.c">m</a><a href="javascript:void(0)">j</a><a href="#top">t</a><a href="/abs.png">abs</a><a href="//cdn/x.js">cdn</a>
      <a href="b.html">b</a><a href="sub/">dir</a>
      <img src="../private/secret.png">
    </body></html>`,
    // 附件；
    'docs/手冊.pdf': pngBytes,
    'notes/pics/p 1.png': pngBytes,
    'notes/pics/中文.jpg': Buffer.from('jpg'),
    'notes/poster.jpg': Buffer.from('poster'),
    'notes/v.mp4': Buffer.from('mp4'),
    'notes/s.css': 'body{}',
    'notes/s.js': 'void 0',
    // 被排除的檔案與共用資源；
    'private/secret.png': Buffer.from('SECRET'),
    'assets/notes.js': '/* shared */',
  });

  // 收集的完整結果；
  it('收集每一種來源的本地附件；跳過外部、data、錨點、筆記頁面、資料夾與程式碼裡的連結', async () => {
    // 造筆記庫；
    const root = await tempVault(vaultFiles());
    // 收集（images 模擬 md 的 ![[圖片]] 嵌入，與 md 連結裡的同一張圖會去重）；
    const report = await collect(root, ['notes/pics/p 1.png']);
    // 要複製的檔案：已排序、去重；
    expect(report.files).toEqual(['docs/手冊.pdf', 'notes/pics/p 1.png', 'notes/pics/中文.jpg', 'notes/poster.jpg', 'notes/s.css', 'notes/s.js', 'notes/v.mp4']);
    // 指到 assets/ 的引用不重複複製，但有計數；
    expect(report.providedByAssets).toBe(1);
    // 清掉；
    await fs.rm(root, { recursive: true, force: true });
  });

  // 共用腳本與樣式表不論寫在哪個資料夾（舊頁面常寫成 資料夾/assets/notes.js 而那裡根本沒有這個檔），都由 layout 提供，不算找不到；
  it('指到共用腳本與樣式表（任何資料夾的 assets/notes.js、note-theme.css 等）不算找不到也不複製', async () => {
    // 造筆記庫：html 引用不存在的 sub/assets/notes.js、sub/assets/notes.css，以及一個真正找不到的 own.js；
    const root = await tempVault({ 'sub/h.html': '<html><head><link rel="stylesheet" href="assets/notes.css"><script src="assets/notes.js"></script><script src="own.js"></script></head></html>' });
    // 收集；
    const report = await collect(root);
    // 只有 own.js 找不到；
    expect(obj(report.missingLocal)).toEqual({ 'sub/h.html': ['sub/own.js'] });
    // 共用的兩個計入已提供；
    expect(report.providedByAssets).toBe(2);
    // 沒有要複製的；
    expect(report.files).toEqual([]);
    // 清掉；
    await fs.rm(root, { recursive: true, force: true });
  });

  // 隱私：被排除的檔案絕不複製，而且要報告是哪篇筆記指到它；
  it('被排除的 private/secret.png 不複製，並列入 excludedReferenced（筆記 → 目標）', async () => {
    // 造筆記庫；
    const root = await tempVault(vaultFiles());
    // 收集；
    const report = await collect(root);
    // 兩篇已發布的筆記都指到它；
    expect(obj(report.excludedReferenced)).toEqual({ 'notes/a.md': ['private/secret.png'], 'notes/h.html': ['private/secret.png'] });
    // 不在複製清單；
    expect(report.files).not.toContain('private/secret.png');
    // 實際複製進輸出資料夾後，輸出裡也沒有；
    const out = await fs.mkdtemp(path.join(os.tmpdir(), 'local-assets-out-'));
    // 複製；
    await copyLocalAssets(root, out, report.files);
    // private 資料夾不存在；
    await expect(fs.access(path.join(out, 'private'))).rejects.toThrow();
    // 清掉；
    await fs.rm(root, { recursive: true, force: true });
    // 同上；
    await fs.rm(out, { recursive: true, force: true });
  });

  // 就算 md 管線的報告（.build-report.json 的 images）被竄改成含私人圖，仍然不複製；
  it('images 參數裡的被排除路徑也不複製，列入 excludedReferenced', async () => {
    // 造筆記庫；
    const root = await tempVault(vaultFiles());
    // 收集：images 含私人圖；
    const report = await collect(root, ['private/secret.png']);
    // 不複製；
    expect(report.files).not.toContain('private/secret.png');
    // 來源標示是 md 嵌入；
    expect(Array.from(report.excludedReferenced.keys())).toContain('（md 的 ![[圖片]] 嵌入）');
    // 清掉；
    await fs.rm(root, { recursive: true, force: true });
  });

  // 找不到的與跑出根目錄的；
  it('找不到的檔案列入 missingLocal，用 .. 跑出根目錄的列入 outsideRoot 且不處理', async () => {
    // 造筆記庫；
    const root = await tempVault(vaultFiles());
    // 收集（images 多一張不存在的）；
    const report = await collect(root, ['gone.png']);
    // 找不到：a.md 的 missing.zip、md 嵌入的 gone.png；
    expect(obj(report.missingLocal)).toEqual({ 'notes/a.md': ['notes/missing.zip'], '（md 的 ![[圖片]] 嵌入）': ['gone.png'] });
    // 跑出根目錄：記原始字串；
    expect(obj(report.outsideRoot)).toEqual({ 'notes/a.md': ['../../outside.png'] });
    // 清掉；
    await fs.rm(root, { recursive: true, force: true });
  });

  // 大小寫：不分大小寫的系統找得到、區分大小寫的系統找不到；為了兩邊結果一致，一律視為找不到、不複製；
  it('大小寫不符的引用視為找不到，不複製', async () => {
    // 造筆記庫：筆記寫 PICS/P 1.PNG，實際檔案是 pics/p 1.png；
    const root = await tempVault({ 'n.md': '![x](PICS/P%201.PNG)\n', 'pics/p 1.png': Buffer.from('x') });
    // 收集；
    const report = await collect(root);
    // 不複製；
    expect(report.files).toEqual([]);
    // 列入找不到；
    expect(obj(report.missingLocal)).toEqual({ 'n.md': ['PICS/P 1.PNG'] });
    // 清掉；
    await fs.rm(root, { recursive: true, force: true });
  });

  // 大小寫不同的排除路徑（Windows 上會打開真正的 private/）不能因此漏掉；
  it('用 Private/ 的大小寫去引用被排除的檔案，不會被複製', async () => {
    // 造筆記庫；
    const root = await tempVault({ 'n.md': '![x](Private/secret.png)\n', 'private/secret.png': Buffer.from('SECRET') });
    // 收集；
    const report = await collect(root);
    // 不複製（不論平台）；
    expect(report.files).toEqual([]);
    // 在不分大小寫的 Windows 上是「排除」，在區分大小寫的系統是「找不到」；兩者都不會複製，也都有被報告；
    expect(report.excludedReferenced.size + report.missingLocal.size).toBe(1);
    // 清掉；
    await fs.rm(root, { recursive: true, force: true });
  });

  // 指到頁面的連結：改名後只剩 .md 的舊 .html 連結、沒副檔名的連結，都是頁面不是附件；
  it('指到已發布頁面的連結（x.html、x、x.md）不是附件，也不算找不到', async () => {
    // 造筆記庫：p.md 是頁面；n.md 用三種寫法連到它，另連到不存在的 q.html；
    const root = await tempVault({ 'p.md': '# p\n', 'n.md': '[a](p.html) [b](p) [c](p.md) [d](q.html)\n' });
    // 收集；
    const report = await collect(root);
    // 沒有附件；
    expect(report.files).toEqual([]);
    // 只有 q.html 是找不到；
    expect(obj(report.missingLocal)).toEqual({ 'n.md': ['q.html'] });
    // 清掉；
    await fs.rm(root, { recursive: true, force: true });
  });

  // 複製：位元組完全相同，目錄結構保留；
  it('複製時位元組完全相同（含 0x00、0xff、換行字元），並保留相對路徑；可以重跑', async () => {
    // 造筆記庫；
    const root = await tempVault(vaultFiles());
    // 收集；
    const report = await collect(root);
    // 輸出資料夾；
    const out = await fs.mkdtemp(path.join(os.tmpdir(), 'local-assets-out-'));
    // 複製；
    const stats = await copyLocalAssets(root, out, report.files);
    // 檔案數與位元組數；
    expect(stats.count).toBe(7);
    // 逐檔比對位元組；
    for (const rel of report.files) {
      // 來源；
      const src = await fs.readFile(path.join(root, ...rel.split('/')));
      // 輸出；
      const dst = await fs.readFile(path.join(out, ...rel.split('/')));
      // Buffer.equals 逐位元組比較；
      expect(dst.equals(src), rel).toBe(true);
    }
    // 輸出資料夾總大小與複製的位元組一致；
    expect(await dirSize(out)).toBe(stats.bytes);
    // 重跑得到同樣結果；
    expect(await copyLocalAssets(root, out, report.files)).toEqual(stats);
    // 清掉；
    await fs.rm(root, { recursive: true, force: true });
    // 同上；
    await fs.rm(out, { recursive: true, force: true });
  });

  // 摘要：被排除的全部列出、找不到的只列前 20 個並給總數、超過門檻有警告；
  it('摘要列出全部 excludedReferenced、missingLocal 總數與前 20 個，超過 900 MB 會警告', async () => {
    // 造筆記庫：一篇 md 連到 25 個不存在的檔案與一個私人檔案；
    const links = Array.from({ length: 25 }, (_, i) => `[x](m${String(i).padStart(2, '0')}.zip)`).join(' ');
    // 筆記庫；
    const root = await tempVault({ 'n.md': `${links} [p](private/a.png)\n`, 'private/a.png': Buffer.from('x') });
    // 收集；
    const report = await collect(root);
    // 格式化（假裝輸出資料夾 901 MB）；
    const text = formatLocalAssetsReport(report, { count: 0, bytes: 0 }, 901 * 1024 * 1024);
    // 被排除的：1 個引用，列出筆記與目標；
    expect(text).toContain('1 個引用、1 篇筆記');
    // 同上；
    expect(text).toContain('n.md → private/a.png');
    // 找不到的總數；
    expect(text).toContain('找不到的本地檔案引用：25 個（只列前 20 個）');
    // 第 20 個在、第 21 個不在；
    expect(text).toContain('n.md → m19.zip');
    // 同上；
    expect(text).not.toContain('n.md → m20.zip');
    // 超過門檻的警告；
    expect(text).toContain('警告：輸出資料夾超過 900.0 MB');
    // 沒超過就沒有這行；
    expect(formatLocalAssetsReport(report, { count: 0, bytes: 0 }, 10 * 1024 * 1024)).not.toContain('輸出資料夾超過');
    // 清掉；
    await fs.rm(root, { recursive: true, force: true });
  });
});

// .nojekyll；
describe('writeNojekyll', () => {
  // 寫入、重跑、prune 不會刪；
  it('寫出空的 .nojekyll，可重跑，而且 pruneExport 不會把它刪掉', async () => {
    // 暫存輸出資料夾；
    const out = await fs.mkdtemp(path.join(os.tmpdir(), 'nojekyll-'));
    // 放一個頁面與它的 RSC 檔，讓 prune 真的有東西可刪；
    await fs.writeFile(path.join(out, 'a.html'), '<p>a</p>');
    // RSC 檔；
    await fs.writeFile(path.join(out, 'a.txt'), 'rsc');
    // 寫 .nojekyll；
    const file = await writeNojekyll(out);
    // 路徑正確、內容為空；
    expect(file).toBe(path.join(out, '.nojekyll'));
    // 內容為空；
    expect(await fs.readFile(file, 'utf8')).toBe('');
    // 重跑不丟錯；
    await expect(writeNojekyll(out)).resolves.toBe(file);
    // prune 刪掉 a.txt，但 .nojekyll 與頁面都還在；
    const stats = await pruneExport(out, [['a']]);
    // 刪了一個檔；
    expect(stats.files).toBe(1);
    // .nojekyll 還在；
    expect(await fs.readdir(out)).toEqual(['.nojekyll', 'a.html']);
    // 清掉；
    await fs.rm(out, { recursive: true, force: true });
  });

  // 輸出資料夾不存在代表 next build 沒產出，要失敗而不是默默建一個空資料夾；
  it('輸出資料夾不存在時丟錯', async () => {
    // 不存在的路徑；
    const missing = path.join(os.tmpdir(), `nojekyll-missing-${Date.now()}`);
    // 斷言 reject；
    await expect(writeNojekyll(missing)).rejects.toThrow();
    // 也沒有被建出來；
    await expect(fs.access(missing)).rejects.toThrow();
  });
});

// 建置鏈的順序：prune 必須在 copy 之前，否則 prune 會把「檔名恰好與頁面同名的 .txt 附件」當成 RSC 產物刪掉；
describe('npm run build 的步驟順序', () => {
  // 為什麼順序重要：prune 會刪「頁面旁的 X.txt」，所以附件若先被複製進去，同名的 .txt 會被當成 RSC 產物誤刪；
  it('證明順序的必要：prune 會刪掉與頁面同名的 .txt，即使它是附件', async () => {
    // 暫存輸出資料夾：頁面 簡報.html 與同名附件 簡報.txt；
    const out = await fs.mkdtemp(path.join(os.tmpdir(), 'order-'));
    // 頁面；
    await fs.writeFile(path.join(out, '簡報.html'), '<p>x</p>');
    // 同名 .txt；
    await fs.writeFile(path.join(out, '簡報.txt'), 'attachment');
    // 清理；
    await pruneExport(out, [['簡報']]);
    // 被刪了；
    expect(await fs.readdir(out)).toEqual(['簡報.html']);
    // 清掉；
    await fs.rm(out, { recursive: true, force: true });
  });

  // package.json 的路徑；
  const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url));
  // 案例：整條建置鏈依序出現；
  it('sync-assets → site-report → next build → fix-export-names → prune-export → copy-local-assets → nojekyll', async () => {
    // 讀 package.json；
    const build = JSON.parse(await fs.readFile(pkgPath, 'utf8')).scripts.build as string;
    // 每個步驟在字串裡的位置；
    const steps = ['sync-assets', 'site-report', 'next build', 'fix-export-names', 'prune-export', 'copy-local-assets', 'write-nojekyll'].map((s) => build.indexOf(s));
    // 每個都存在；
    expect(steps.every((i) => i >= 0), build).toBe(true);
    // 位置嚴格遞增＝順序正確；
    expect([...steps].sort((a, b) => a - b)).toEqual(steps);
  });
});
