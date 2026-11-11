// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：此測試要 spawn git 與 node 子行程並讀寫檔案，改用 node 環境；
// 從 vitest 匯入測試骨架：describe 分組、it 定義單一案例、expect 斷言、beforeEach／afterEach 是每個案例前後的鉤子；
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// 匯入 fs 的 promise 版 API，`import * as` 把整個模組收進命名空間 fs；
import * as fs from 'node:fs/promises';
// 匯入 os 模組，取得系統暫存資料夾；
import * as os from 'node:os';
// 匯入 path 模組，用 path.join 組合路徑；
import * as path from 'node:path';
// 匯入 child_process 的 execFileSync（同步執行外部程式，參數用陣列傳入，不經過 shell，中文與空白不用額外跳脫）；
import { execFileSync } from 'node:child_process';
// 匯入 url 模組的 fileURLToPath，把 file:// URL 轉成作業系統路徑；
import { fileURLToPath } from 'node:url';
// 匯入 Task 6 的載入器與型別；`type` 前綴的匯入只在編譯期存在；
import { listNotes, loadExclude, type NoteEntry } from '../src/lib/content';
// 匯入待測的兩個函式；`.mjs` 副檔名要寫出來，因為 ESM 的相對匯入不會自動補副檔名；
import { applyRenames, planRenames, planRenamesDetailed } from '../scripts/rename-interactive-pairs.mjs';

// 假筆記庫的路徑，用 new URL 以本檔為基準解析後轉成一般路徑；
const vault = fileURLToPath(new URL('./fixture-vault', import.meta.url));
// site 資料夾的路徑，CLI 測試要以它當 cwd；
const siteDir = fileURLToPath(new URL('..', import.meta.url));
// CLI 腳本的完整路徑；
const cliPath = path.join(siteDir, 'scripts', 'rename-interactive-pairs.mjs');

// 小工具：組出一筆最小的 NoteEntry，slug 由 relPath 去掉副檔名後依 / 切開；
const note = (relPath: string): NoteEntry => ({
  // 副檔名是 .md 就是 md，否則視為 html；三元運算子 `條件 ? 甲 : 乙`；
  kind: relPath.endsWith('.md') ? 'md' : 'html',
  // relPath 原樣放入；
  relPath,
  // slug：去掉最後一個副檔名再切開；正規表示式 /\.[^./]+$/ 比對結尾的「點加副檔名」；
  slug: relPath.replace(/\.[^./]+$/, '').split('/'),
  // 標題與前言在這裡用不到，給固定值；
  title: relPath,
  // 前言給空物件；
  frontmatter: {},
});

// 小工具：在 cwd 執行 git 並回傳標準輸出；args 是剩餘參數陣列（rest 參數 `...args`）；
const git = (cwd: string, ...args: string[]): string => execFileSync('git', args, { cwd, encoding: 'utf8' });

// 小工具：把 files 物件（相對路徑 → 內容）寫進 root；內容可以是字串或 Buffer；
async function seed(root: string, files: Record<string, string | Buffer>): Promise<void> {
  // Object.entries 把物件轉成 [鍵, 值] 陣列，for...of 逐一處理；
  for (const [rel, content] of Object.entries(files)) {
    // 組出完整路徑；
    const full = path.join(root, rel);
    // 先建立上層資料夾，recursive 讓多層與已存在都不出錯；
    await fs.mkdir(path.dirname(full), { recursive: true });
    // 寫入內容；字串預設以 UTF-8 寫出，Buffer 則逐位元組原樣寫出；
    await fs.writeFile(full, content);
  }
}

// 小工具：把 root 初始化成 git repo、寫入檔案並做第一次 commit；
async function initRepoWith(root: string, files: Record<string, string | Buffer>): Promise<void> {
  // 初始化 repo，-q 不印訊息；
  git(root, 'init', '-q');
  // 只設定這個暫存 repo 的使用者名稱（local 設定，不碰全域）；
  git(root, 'config', 'user.name', 'tester');
  // 設定使用者信箱；
  git(root, 'config', 'user.email', 'tester@example.com');
  // 關閉換行轉換，確保 CRLF 檔案進出 git 都是原樣；
  git(root, 'config', 'core.autocrlf', 'false');
  // 讓 git 輸出中文路徑時不用八進位跳脫，方便斷言；
  git(root, 'config', 'core.quotepath', 'false');
  // 關閉 commit 簽章，避免環境設定讓測試卡住；
  git(root, 'config', 'commit.gpgsign', 'false');
  // 寫入檔案；
  await seed(root, files);
  // 全部加入暫存區；
  git(root, 'add', '-A');
  // 做第一次 commit；
  git(root, 'commit', '-q', '-m', 'init');
}

// 小工具：讀出 root 底下所有檔案（不含 .git）的內容，用於比對「前後完全沒變」；
async function snapshot(root: string): Promise<Record<string, string>> {
  // 累積結果的物件；
  const out: Record<string, string> = {};
  // 遞迴走訪的內部函式；
  async function walk(rel: string): Promise<void> {
    // 讀出資料夾項目；
    for (const entry of await fs.readdir(path.join(root, rel), { withFileTypes: true })) {
      // .git 資料夾不比對；
      if (entry.name === '.git') continue;
      // 組出相對路徑，一律用正斜線；
      const next = rel === '' ? entry.name : `${rel}/${entry.name}`;
      // 資料夾就遞迴，檔案就讀成 latin1 字串（逐位元組對應，能忠實反映任何位元組差異）；
      if (entry.isDirectory()) await walk(next);
      else out[next] = (await fs.readFile(path.join(root, next))).toString('latin1');
    }
  }
  // 從根層開始；
  await walk('');
  // 回傳快照；
  return out;
}

// 小工具：讀檔成 UTF-8 字串；
const read = (root: string, rel: string) => fs.readFile(path.join(root, rel), 'utf8');

// 以下是「規劃」的純函式測試；
describe('planRenames', () => {
  // 案例：同路徑同主檔名的 md＋html 配對，html 被規劃成 -互動版；
  it('配對的 html 被規劃為 <原檔名>-互動版.html', () => {
    // 準備一組配對加上子資料夾；
    const plan = planRenames([note('前端/日期 物件.md'), note('前端/日期 物件.html')]);
    // 斷言恰好一筆，from／to 都是正斜線相對路徑；toEqual 逐欄位深度比對；
    expect(plan).toEqual([{ from: '前端/日期 物件.html', to: '前端/日期 物件-互動版.html' }]);
  });

  // 案例：html 主檔名已經以 -互動版 結尾就略過；
  it('已經以 -互動版 結尾的 html 不會再被規劃', () => {
    // md 與已帶後綴的 html 主檔名相同；
    const plan = planRenames([note('A-互動版.md'), note('A-互動版.html')]);
    // 斷言沒有任何規劃；
    expect(plan).toEqual([]);
  });

  // 案例：只有單獨的 html 或單獨的 md 都不處理；
  it('單獨的 html 或單獨的 md 不會被規劃', () => {
    // 一個只有 html，一個只有 md，另有同名但不同資料夾的 md／html（不算配對）；
    const plan = planRenames([note('a.html'), note('b.md'), note('x/c.md'), note('y/c.html')]);
    // 斷言沒有任何規劃；
    expect(plan).toEqual([]);
  });

  // 案例：目標 -互動版.html 已經存在的三方撞名配對不規劃，改記在 skipped；
  it('三方撞名（X.md、X.html、X-互動版.html 都在）不規劃，記入 skipped 並帶三個路徑', () => {
    // 準備三方撞名加一組正常配對；
    const result = planRenamesDetailed([
      note('d/X.md'), note('d/X.html'), note('d/X-互動版.html'), note('A.md'), note('A.html'),
    ]);
    // 規劃只剩正常那組；
    expect(result.plan).toEqual([{ from: 'A.html', to: 'A-互動版.html' }]);
    // 跳過清單含 md、舊 html、已存在的目標三個路徑；
    expect(result.skipped).toEqual([{ md: 'd/X.md', html: 'd/X.html', target: 'd/X-互動版.html' }]);
    // planRenames 的回傳與 plan 相同；
    expect(planRenames([note('d/X.md'), note('d/X.html'), note('d/X-互動版.html'), note('A.md'), note('A.html')])).toEqual(result.plan);
  });

  // 案例：目標只存在於磁碟（不在筆記清單內，例如被排除不發布的檔案）也算已存在；
  it('目標在磁碟上已存在（由 existing 參數提供）也跳過', () => {
    // 筆記清單內沒有 X-互動版.html，但 existing 說磁碟上有；
    const result = planRenamesDetailed([note('X.md'), note('X.html')], ['X-互動版.html']);
    // 不規劃；
    expect(result.plan).toEqual([]);
    // 記入 skipped；
    expect(result.skipped).toEqual([{ md: 'X.md', html: 'X.html', target: 'X-互動版.html' }]);
  });

  // 案例：多組配對各自獨立、保持輸入順序；
  it('多組配對各自規劃，保留輸入順序', () => {
    // 兩組配對，其中根層一組、子資料夾一組；
    const plan = planRenames([note('a.html'), note('a.md'), note('d/b.html'), note('d/b.md'), note('z.html')]);
    // 斷言兩筆，z.html 沒有 md 所以不在其中；
    expect(plan).toEqual([
      { from: 'a.html', to: 'a-互動版.html' },
      { from: 'd/b.html', to: 'd/b-互動版.html' },
    ]);
  });

  // 案例：對假筆記庫實際掃描後，只有「衝突/配對」是真正的 md＋html 同名配對；
  it('假筆記庫 fixture-vault 規劃結果恰為 衝突/配對', async () => {
    // 讀假筆記庫自己的排除清單；
    const exclude = await loadExclude(path.join(vault, '_config.yml'));
    // 掃描所有筆記；
    const notes = await listNotes(vault, exclude);
    // 規劃改名；前端/日期 物件-互動版.html 已帶後綴且沒有對應的 日期 物件.html，所以不會出現；
    expect(planRenames(notes)).toEqual([{ from: '衝突/配對.html', to: '衝突/配對-互動版.html' }]);
  });
});

// 以下是「套用」的測試，每個案例都在新的暫存 git repo 內執行；
describe('applyRenames', () => {
  // 每個案例專屬的暫存根目錄；
  let root: string;

  // 每個案例前建立暫存資料夾；
  beforeEach(async () => {
    // mkdtemp 建立名稱帶隨機尾碼的資料夾；
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'rename-pairs-'));
  });

  // 每個案例後清掉暫存資料夾；
  afterEach(async () => {
    // maxRetries 讓 Windows 上 git 剛結束、檔案仍被短暫鎖住時重試；
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5 });
  });

  // 小工具：對 root 掃描並規劃；
  const planOf = async () => planRenames(await listNotes(root, []));

  // 一組涵蓋各種連結寫法的筆記庫內容，多個案例共用；
  const linkFiles: Record<string, string> = {
    // 配對的 md（內文有一個要改的 md 連結與兩個不能動的連結）；
    '前端/日期 物件.md': '# 日期\n[互動版](日期 物件.html)\n[[日期 物件]]\n[回自己](日期 物件.md)\n',
    // 配對的 html；
    '前端/日期 物件.html': '<html><body><h1>日期</h1></body></html>\n',
    // 另一份 html：編碼空白、單引號、相對路徑、fragment 與 query；
    '前端/a.html':
      '<a href="日期%20物件.html">一</a><a href="日期%20物件.md">二</a><a href=\'./日期 物件.html?x=1#y\'>三</a><img src="日期%20物件.html">\n',
    // 根層索引 md：各種 md 連結、wikilink；
    '索引.md':
      '[x](前端/日期 物件.html)\n[y](前端/日期%20物件.html#top "標題")\n[z](<前端/日期 物件.html>)\n[[前端/日期 物件.html]]\n![[日期 物件.html|別名]]\n[[日期 物件]]\n[[前端/日期 物件]]\n[m](前端/日期 物件.md)\n[外](https://example.com/日期 物件.html)\n',
    // 子資料夾的 md：用 ../ 與百分比編碼中文指回去；
    '前端/深/b.md': '[up](../%E6%97%A5%E6%9C%9F%20%E7%89%A9%E4%BB%B6.html)\n[同名但別處](日期 物件.html)\n',
    // 被排除不發布的資料夾（例如 private）也要被修連結；
    'private/c.md': '[p](../前端/日期 物件.html)\n',
    // site/ 底下的檔案不掃描；
    'site/s.md': '[s](../前端/日期 物件.html)\n',
    // 點開頭資料夾不掃描；
    '.obsidian/o.md': '[o](../前端/日期 物件.html)\n',
    // node_modules 不掃描；
    'node_modules/n.md': '[n](../前端/日期 物件.html)\n',
  };

  // 案例：dry-run 不動任何檔案也不動 git，並回報會改幾個檔案、幾個連結；
  it('dryRun 不改任何檔案與 git 狀態，並回報會改動的數量', async () => {
    // 準備 repo；
    await initRepoWith(root, linkFiles);
    // 規劃；
    const plan = await planOf();
    // 記下 dry-run 前的檔案內容；
    const before = await snapshot(root);
    // 記下 dry-run 前的 git status；
    const statusBefore = git(root, 'status', '--porcelain');
    // 預設 dryRun 為 true，所以不傳選項也是 dry-run；
    const result = await applyRenames(plan, root);
    // 檔案內容完全相同；
    expect(await snapshot(root)).toEqual(before);
    // git status 相同（都是乾淨）；
    expect(git(root, 'status', '--porcelain')).toBe(statusBefore);
    // 沒有真的套用；
    expect(result.applied).toBe(false);
    // 規劃原樣回報；
    expect(result.renames).toEqual(plan);
    // 會被改寫的檔案：前端/日期 物件.md、前端/a.html、索引.md、前端/深/b.md、private/c.md，共 5 個；
    expect(result.filesChanged.map((f) => f.file).sort()).toEqual(
      ['private/c.md', '前端/a.html', '前端/日期 物件.md', '前端/深/b.md', '索引.md'].sort(),
    );
    // 連結總數：md 1、a.html 3（含 img src）、索引 5、b.md 1、c.md 1，共 11；
    expect(result.linksChanged).toBe(11);
    // 明確指定 dryRun:true 的行為相同；
    expect((await applyRenames(plan, root, { dryRun: true })).applied).toBe(false);
  });

  // 案例：真正套用時用 git mv，歷史跟著走；
  it('套用後以 git mv 改名，git 認得是 rename 且 log --follow 追得到歷史', async () => {
    // 準備 repo；
    await initRepoWith(root, linkFiles);
    // 規劃；
    const plan = await planOf();
    // 真正套用；
    const result = await applyRenames(plan, root, { dryRun: false });
    // 回報已套用；
    expect(result.applied).toBe(true);
    // 舊檔不存在、新檔存在；
    await expect(fs.access(path.join(root, '前端/日期 物件.html'))).rejects.toThrow();
    await expect(fs.access(path.join(root, '前端/日期 物件-互動版.html'))).resolves.toBeUndefined();
    // git status 顯示 R（rename）那一行同時含新舊檔名；
    const status = git(root, 'status', '--porcelain');
    // 以換行切開後找出 rename 那行；
    const renameLine = status.split('\n').find((l) => l.startsWith('R'));
    // 該行要同時含舊名與新名；
    expect(renameLine).toContain('前端/日期 物件.html');
    // 新名也在同一行；
    expect(renameLine).toContain('前端/日期 物件-互動版.html');
    // 提交後用 --follow 追蹤新檔名，應看見兩筆歷史（改名那筆與最初那筆）；
    git(root, 'add', '-A');
    // 提交改名；
    git(root, 'commit', '-q', '-m', 'rename');
    // %s 只印主旨；
    const log = git(root, 'log', '--follow', '--format=%s', '--', '前端/日期 物件-互動版.html');
    // 切成行後去掉空行；
    expect(log.split('\n').filter(Boolean)).toEqual(['rename', 'init']);
  });

  // 案例：連結改寫的精確結果，且 [[無副檔名]] 與指向 md 的連結一個位元組都不動；
  it('改寫指向舊 html 的連結，[[無副檔名]] 與 md 連結不動', async () => {
    // 準備 repo；
    await initRepoWith(root, linkFiles);
    // 套用；
    await applyRenames(await planOf(), root, { dryRun: false });
    // 配對 md：只有 html 連結被改，[[日期 物件]] 與 (日期 物件.md) 原樣；
    expect(await read(root, '前端/日期 物件.md')).toBe(
      '# 日期\n[互動版](日期 物件-互動版.html)\n[[日期 物件]]\n[回自己](日期 物件.md)\n',
    );
    // html：編碼空白保持編碼（%20）、單引號保持單引號、./ 與 ?query#fragment 保留、指向 md 的不動、img src 也改；
    expect(await read(root, '前端/a.html')).toBe(
      '<a href="日期%20物件-互動版.html">一</a><a href="日期%20物件.md">二</a><a href=\'./日期 物件-互動版.html?x=1#y\'>三</a><img src="日期%20物件-互動版.html">\n',
    );
    // 索引：md 連結（含 %20、title、角括號）、wikilink 帶資料夾與別名都改；無副檔名 wikilink、指向 md、外部網址不動；
    expect(await read(root, '索引.md')).toBe(
      '[x](前端/日期 物件-互動版.html)\n[y](前端/日期%20物件-互動版.html#top "標題")\n[z](<前端/日期 物件-互動版.html>)\n[[前端/日期 物件-互動版.html]]\n![[日期 物件-互動版.html|別名]]\n[[日期 物件]]\n[[前端/日期 物件]]\n[m](前端/日期 物件.md)\n[外](https://example.com/日期 物件.html)\n',
    );
    // 子資料夾 md：完整百分比編碼的中文保持完整編碼風格（後綴 -互動版 也編碼）；另一個指向「前端/深/日期 物件.html」（不存在）的連結不動；
    expect(await read(root, '前端/深/b.md')).toBe(
      '[up](../%E6%97%A5%E6%9C%9F%20%E7%89%A9%E4%BB%B6-%E4%BA%92%E5%8B%95%E7%89%88.html)\n[同名但別處](日期 物件.html)\n',
    );
    // 被排除發布的 private 資料夾也有修正；
    expect(await read(root, 'private/c.md')).toBe('[p](../前端/日期 物件-互動版.html)\n');
    // site／點資料夾／node_modules 完全不動；
    expect(await read(root, 'site/s.md')).toBe('[s](../前端/日期 物件.html)\n');
    // 點開頭資料夾不動；
    expect(await read(root, '.obsidian/o.md')).toBe('[o](../前端/日期 物件.html)\n');
    // node_modules 不動；
    expect(await read(root, 'node_modules/n.md')).toBe('[n](../前端/日期 物件.html)\n');
  });

  // 案例：沒有任何要改的連結的檔案位元組不變，只有被改的檔案才寫入；
  it('沒有相關連結的檔案位元組不變', async () => {
    // 一份無關的 md，內含 wikilink 與 md 連結；
    const files = { ...linkFiles, '無關.md': '[[日期 物件]]\n[m](前端/日期 物件.md)\n' };
    // 準備 repo；
    await initRepoWith(root, files);
    // 記下無關檔案的原始位元組；
    const before = await fs.readFile(path.join(root, '無關.md'));
    // 套用；
    await applyRenames(await planOf(), root, { dryRun: false });
    // 位元組相同；Buffer.equals 逐位元組比較；
    expect((await fs.readFile(path.join(root, '無關.md'))).equals(before)).toBe(true);
  });

  // 案例：CRLF 與 BOM 都保留；
  it('被改寫的檔案保留 CRLF 與 BOM', async () => {
    // 檔案內容：BOM（﻿）開頭、CRLF 換行、混入一行單獨 LF，確認不會被正規化；
    const crlf = '﻿# 標題\r\n[互動版](日期 物件.html)\r\n[[日期 物件]]\r\n結尾無換行\nLF 行';
    // 準備 repo，配對與含連結的檔案；Buffer.from 以 UTF-8 編碼成位元組；
    await initRepoWith(root, { '日期 物件.md': '# d\n', '日期 物件.html': '<h1>d</h1>\n', 'crlf.md': Buffer.from(crlf, 'utf8') });
    // 套用；
    await applyRenames(await planOf(), root, { dryRun: false });
    // 讀回位元組；
    const after = await fs.readFile(path.join(root, 'crlf.md'));
    // 期望的內容只有連結那一段不同；
    expect(after.equals(Buffer.from(crlf.replace('日期 物件.html', '日期 物件-互動版.html'), 'utf8'))).toBe(true);
    // 開頭仍是 BOM 的三個位元組 EF BB BF；
    expect([...after.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  // 案例：被改名的 html 自己指向舊名的連結也跟著修；
  it('被改名的 html 內指向自己舊檔名的連結也會更新', async () => {
    // html 內有一個指向自己舊名的連結；
    await initRepoWith(root, { 'd.md': '# d\n', 'd.html': '<a href="d.html#top">回頂端</a>\n' });
    // 套用；
    await applyRenames(await planOf(), root, { dryRun: false });
    // 新檔案內容的連結已更新；
    expect(await read(root, 'd-互動版.html')).toBe('<a href="d-互動版.html#top">回頂端</a>\n');
  });

  // 案例：wikilink 只寫檔名、但別處有同名 html 沒被改名時，無法判斷指向誰，不動並回報；
  it('含糊的 wikilink（同名 html 有的被改名有的沒有）不改並列入 ambiguous', async () => {
    // 一組配對 x/d，另一個不同資料夾的 y/d.html 沒有 md 所以不改名；
    await initRepoWith(root, { 'x/d.md': '# d\n', 'x/d.html': '<h1>d</h1>\n', 'y/d.html': '<h1>y</h1>\n', 'n.md': '[[d.html]]\n' });
    // 套用；含糊項目預設會讓套用被拒絕，這個案例要驗證「不改」本身，所以明確傳 allowPartial；
    const result = await applyRenames(await planOf(), root, { dryRun: false, allowPartial: true });
    // 連結原樣；
    expect(await read(root, 'n.md')).toBe('[[d.html]]\n');
    // 回報含糊的項目，內含檔名；
    expect(result.ambiguous.join('\n')).toContain('n.md');
  });

  // 案例：工作目錄不乾淨就拒絕；
  it('git 工作目錄不乾淨時拒絕套用且不動任何檔案', async () => {
    // 準備 repo 後新增一個未追蹤的檔案，讓 git status --porcelain 不是空的；
    await initRepoWith(root, linkFiles);
    // 寫入髒檔案；
    await seed(root, { 'dirty.txt': 'x' });
    // 規劃；
    const plan = await planOf();
    // 記下現況；
    const before = await snapshot(root);
    // 預期 reject，訊息說明工作目錄不乾淨；
    await expect(applyRenames(plan, root, { dryRun: false })).rejects.toThrow(/不乾淨/);
    // 什麼都沒動；
    expect(await snapshot(root)).toEqual(before);
  });

  // 案例：規劃之後、套用之前目標才出現，仍要拒絕（規劃時已存在的三方撞名改為跳過，見 planRenames 的測試）；
  it('規劃後、套用前目標檔名才出現時拒絕套用且不動任何檔案', async () => {
    // d.md＋d.html 配對，規劃時 d-互動版.html 還不存在；
    await initRepoWith(root, { 'd.md': '# d\n', 'd.html': '<h1>d</h1>\n' });
    // 規劃：d.html → d-互動版.html；
    const plan = await planOf();
    // 先確認規劃內容；
    expect(plan).toEqual([{ from: 'd.html', to: 'd-互動版.html' }]);
    // 規劃之後才冒出同名檔案，並提交讓工作目錄保持乾淨；
    await seed(root, { 'd-互動版.html': '<h1>existing</h1>\n' });
    // 加入暫存區；
    git(root, 'add', '-A');
    // 提交；
    git(root, 'commit', '-q', '-m', 'late target');
    // dry-run 不拒絕，但把撞名的目標列在 conflicts；
    expect((await applyRenames(plan, root, { dryRun: true })).conflicts).toEqual(['d-互動版.html']);
    // 記下現況；
    const before = await snapshot(root);
    // 真正套用要 reject，訊息說明已存在；
    await expect(applyRenames(plan, root, { dryRun: false })).rejects.toThrow(/已存在/);
    // 什麼都沒動；
    expect(await snapshot(root)).toEqual(before);
  });

  // 小工具：做出「三組配對、最後一組撞名」的 repo，並附一個會被改寫連結的檔案；
  const seedMulti = async (extra: Record<string, string | Buffer> = {}) =>
    // 呼叫 initRepoWith 初始化並 commit；
    initRepoWith(root, {
      // 三組配對；
      'a.md': '# a\n', 'a.html': '<h1>a</h1>\n', 'b.md': '# b\n', 'b.html': '<h1>b</h1>\n', 'c.md': '# c\n', 'c.html': '<h1>c</h1>\n',
      // 一個連到 a.html 的檔案，若有任何改寫就會被發現；
      'link.md': '[a](a.html)\n[b](b.html)\n',
      // 其餘額外檔案；
      ...extra,
    });

  // 案例：多筆規劃中最後一筆撞名，整批在動手前就被拒絕，前面的不會先改；
  it('多筆規劃中最後一筆目標已存在：整批拒絕，一個檔案都不動', async () => {
    // 先準備三組配對；
    await seedMulti();
    // 規劃：a、b、c 三筆；
    const plan = await planOf();
    // 確認有三筆且最後一筆是 c；
    expect(plan.map((r) => r.from)).toEqual(['a.html', 'b.html', 'c.html']);
    // 規劃之後 c-互動版.html 才出現，所以最後一筆會撞名；提交以保持工作目錄乾淨；
    await seed(root, { 'c-互動版.html': '<h1>existing</h1>\n' });
    // 加入暫存區；
    git(root, 'add', '-A');
    // 提交；
    git(root, 'commit', '-q', '-m', 'late target');
    // 記下現況；
    const before = await snapshot(root);
    // 記下 git status；
    const statusBefore = git(root, 'status', '--porcelain');
    // 拒絕，且訊息點名撞名的目標；
    await expect(applyRenames(plan, root, { dryRun: false })).rejects.toThrow(/c-互動版\.html/);
    // 檔案內容完全相同；
    expect(await snapshot(root)).toEqual(before);
    // git status 也相同（沒有任何已暫存的 rename）；
    expect(git(root, 'status', '--porcelain')).toBe(statusBefore);
  });

  // 案例：規劃中間一筆的 from 被 gitignore（未追蹤但 status 仍乾淨），在第一次 git mv 前就拒絕；
  it('規劃中間一筆的 from 未被 git 追蹤（gitignore）：動手前拒絕並不改任何檔案', async () => {
    // .gitignore 忽略 b.html，所以 b.html 在磁碟上但沒被追蹤；
    await seedMulti({ '.gitignore': 'b.html\n' });
    // 規劃來自磁碟掃描，所以三筆都在；
    const plan = await planOf();
    // 確認 b.html 在規劃內；
    expect(plan.map((r) => r.from)).toContain('b.html');
    // git status 此時是乾淨的（被忽略的檔案不列出）；
    expect(git(root, 'status', '--porcelain')).toBe('');
    // 記下現況；
    const before = await snapshot(root);
    // 拒絕，訊息說明該檔案未被 git 追蹤；
    await expect(applyRenames(plan, root, { dryRun: false })).rejects.toThrow(/b\.html[\s\S]*未被 git 追蹤|未被 git 追蹤[\s\S]*b\.html/);
    // 什麼都沒動，連 a.html 也沒被改名；
    expect(await snapshot(root)).toEqual(before);
    // git 沒有任何暫存變更；
    expect(git(root, 'status', '--porcelain')).toBe('');
  });

  // 案例：過期的規劃（from 在磁碟上不存在）也在動手前拒絕，且一次列出所有問題項目；
  it('規劃的 from 不存在：動手前拒絕，並一次列出所有有問題的項目', async () => {
    // 準備 repo；
    await seedMulti();
    // 手動組一份規劃：第一筆正常、第二筆 from 不存在、第三筆目標已存在（先補一個 c-互動版.html 並 commit）；
    await seed(root, { 'c-互動版.html': 'x\n' });
    // 加入並提交，保持工作目錄乾淨；
    git(root, 'add', '-A');
    // 提交；
    git(root, 'commit', '-q', '-m', 'add existing');
    // 手動規劃；
    const plan = [
      { from: 'a.html', to: 'a-互動版.html' },
      { from: 'ghost.html', to: 'ghost-互動版.html' },
      { from: 'c.html', to: 'c-互動版.html' },
    ];
    // 記下現況；
    const before = await snapshot(root);
    // 取得被拒絕的錯誤；rejects.toThrow 之後另外用 catch 取訊息；
    const message = await applyRenames(plan, root, { dryRun: false }).then(
      // 不應成功；
      () => '',
      // 取出錯誤訊息；
      (e: Error) => e.message,
    );
    // 兩個問題項目都在訊息內；
    expect(message).toContain('ghost.html');
    // 撞名項目也在訊息內；
    expect(message).toContain('c-互動版.html');
    // 什麼都沒動；
    expect(await snapshot(root)).toEqual(before);
  });

  // 案例：規劃內兩筆指向同一個目標；
  it('規劃內兩筆指向同一個目標：拒絕', async () => {
    // 準備 repo；
    await seedMulti();
    // 手動規劃：兩筆 to 相同；
    const plan = [
      { from: 'a.html', to: 'x-互動版.html' },
      { from: 'b.html', to: 'x-互動版.html' },
    ];
    // 拒絕，訊息提到重複；
    await expect(applyRenames(plan, root, { dryRun: false })).rejects.toThrow(/重複/);
  });

  // 案例：有連結但含非 UTF-8 位元組的檔案，預設拒絕，加 allowPartial 才繼續並回報；
  it('含非 UTF-8 位元組且有舊連結的檔案：預設拒絕，allowPartial 才繼續並回報略過', async () => {
    // 內容含單獨的 0xFF 位元組（不是合法 UTF-8）與一個要改的連結；
    const bin = Buffer.concat([Buffer.from('[a](a.html)\n', 'utf8'), Buffer.from([0xff, 0x0a])]);
    // 準備 repo；
    await seedMulti({ 'bin.md': bin });
    // 規劃；
    const plan = await planOf();
    // 記下現況；
    const before = await snapshot(root);
    // 預設拒絕，訊息點名該檔案與 --allow-partial；
    await expect(applyRenames(plan, root, { dryRun: false })).rejects.toThrow(/bin\.md[\s\S]*allowPartial|allowPartial[\s\S]*bin\.md/);
    // 什麼都沒動；
    expect(await snapshot(root)).toEqual(before);
    // dry-run 仍照常回報 unsafe；
    expect((await applyRenames(plan, root, { dryRun: true })).unsafe).toEqual(['bin.md']);
    // allowPartial 時繼續執行；
    const result = await applyRenames(plan, root, { dryRun: false, allowPartial: true });
    // 回報略過的檔案；
    expect(result.unsafe).toEqual(['bin.md']);
    // 改名確實發生；
    await expect(fs.access(path.join(root, 'a-互動版.html'))).resolves.toBeUndefined();
    // 該檔案位元組不變；
    expect((await fs.readFile(path.join(root, 'bin.md'))).equals(bin)).toBe(true);
    // 其他檔案的連結照常改寫；
    expect(await read(root, 'link.md')).toBe('[a](a-互動版.html)\n[b](b-互動版.html)\n');
  });

  // 案例：含糊的 wikilink 預設拒絕，allowPartial 才繼續；
  it('含糊的 wikilink：預設拒絕，allowPartial 才繼續', async () => {
    // y/a.html 沒有 md 所以不改名，造成 [[a.html]] 含糊；
    await seedMulti({ 'y/a.html': '<h1>y</h1>\n', 'n.md': '[[a.html]]\n' });
    // 規劃；
    const plan = await planOf();
    // 記下現況；
    const before = await snapshot(root);
    // 預設拒絕，訊息點名含糊的 wikilink；
    await expect(applyRenames(plan, root, { dryRun: false })).rejects.toThrow(/含糊[\s\S]*n\.md/);
    // 什麼都沒動；
    expect(await snapshot(root)).toEqual(before);
    // allowPartial 時繼續，並回報含糊清單；
    const result = await applyRenames(plan, root, { dryRun: false, allowPartial: true });
    // 含糊清單內含該檔；
    expect(result.ambiguous.join('\n')).toContain('n.md');
    // 含糊的連結原樣；
    expect(await read(root, 'n.md')).toBe('[[a.html]]\n');
  });

  // 案例：已追蹤的檔案被修改（不是未追蹤）也算工作目錄不乾淨；
  it('已追蹤的檔案有未提交修改時拒絕', async () => {
    // 準備 repo；
    await seedMulti();
    // 修改一個已追蹤的檔案；
    await fs.writeFile(path.join(root, 'a.md'), '# a changed\n');
    // 確認 git status 顯示 M；
    expect(git(root, 'status', '--porcelain')).toMatch(/^ M a\.md/);
    // 規劃；
    const plan = await planOf();
    // 拒絕；
    await expect(applyRenames(plan, root, { dryRun: false })).rejects.toThrow(/不乾淨/);
    // 修改內容仍在、沒有改名；
    expect(await read(root, 'a.md')).toBe('# a changed\n');
    // a.html 仍在；
    await expect(fs.access(path.join(root, 'a.html'))).resolves.toBeUndefined();
  });

  // 案例：變更階段中途失敗時，訊息要說明樹已部分修改並教使用者回復；
  it('變更階段失敗時丟出說明「部分已修改」並含 git reset --hard HEAD 的訊息', async () => {
    // link.md 會被改寫；把它設成唯讀，讓寫入階段失敗；
    await seedMulti();
    // 規劃；
    const plan = await planOf();
    // chmod 0o444 在 Windows 設唯讀屬性、在 POSIX 移除寫入權限；
    await fs.chmod(path.join(root, 'link.md'), 0o444);
    // try／finally 確保測試結束前一定恢復可寫，否則暫存資料夾刪不掉；
    try {
      // 取得錯誤訊息；
      const message = await applyRenames(plan, root, { dryRun: false }).then(
        // 不應成功；
        () => '',
        // 取出錯誤訊息；
        (e: Error) => e.message,
      );
      // 訊息說明部分修改；
      expect(message).toContain('部分');
      // 訊息點名失敗的步驟與檔案；
      expect(message).toContain('link.md');
      // 訊息教使用者回復；
      expect(message).toContain('git reset --hard HEAD');
    } finally {
      // 恢復可寫；
      await fs.chmod(path.join(root, 'link.md'), 0o644);
    }
  });
});

// 以下是命令列介面的測試；
describe('rename-interactive-pairs CLI', () => {
  // 每個案例專屬的暫存根目錄；
  let root: string;

  // 每個案例前建立暫存資料夾；
  beforeEach(async () => {
    // 建立暫存資料夾；
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'rename-cli-'));
  });

  // 每個案例後清理；
  afterEach(async () => {
    // 遞迴刪除；
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5 });
  });

  // 小工具：以 site 為 cwd 執行 CLI，筆記根目錄由 NOTES_ROOT 指定；回傳結束碼、stdout 與 stderr；
  const runCli = (notesRoot: string, ...args: string[]) => {
    // 用 spawnSync 風格但保留簡單：execFileSync 失敗會丟錯，錯誤物件上有 status／stdout／stderr；
    try {
      // 執行 node 腳本；
      const stdout = execFileSync(process.execPath, [cliPath, ...args], {
        // cwd 設成 site；
        cwd: siteDir,
        // 傳入 NOTES_ROOT 環境變數；
        env: { ...process.env, NOTES_ROOT: notesRoot },
        // 以字串取得輸出；
        encoding: 'utf8',
        // 把 stderr 也接起來而不是印到測試輸出；
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      // 成功時結束碼為 0；
      return { status: 0, stdout, stderr: '' };
    } catch (error) {
      // 失敗時取出子行程資訊；
      const e = error as { status: number; stdout: string; stderr: string };
      // 回傳非 0 結束碼；
      return { status: e.status, stdout: e.stdout, stderr: e.stderr };
    }
  };

  // 案例：dry-run 印出清單並把規劃寫成 JSON；
  it('不加 --apply 時只印清單，--out 把規劃寫成 JSON，且不動檔案', async () => {
    // 輸出檔放在暫存資料夾（不在筆記庫內）；
    const out = path.join(root, 'plan.json');
    // 對假筆記庫（純讀取）執行；
    const result = await runCli(vault, '--out', out);
    // 結束碼 0；
    expect(result.status).toBe(0);
    // 輸出含筆數與 from → to；
    expect(result.stdout).toContain('衝突/配對.html');
    // 含新檔名；
    expect(result.stdout).toContain('衝突/配對-互動版.html');
    // JSON 內容恰好是規劃陣列；
    expect(JSON.parse(await fs.readFile(out, 'utf8'))).toEqual([{ from: '衝突/配對.html', to: '衝突/配對-互動版.html' }]);
  });

  // 案例：--apply 在乾淨的 repo 內成功改名；
  it('--apply 在乾淨的 git repo 內以 git mv 改名', async () => {
    // 建立含 _config.yml 的 repo，exclude 空清單；
    await initRepoWith(root, { '_config.yml': 'exclude: []\n', 'd.md': '# d\n[x](d.html)\n', 'd.html': '<h1>d</h1>\n' });
    // 執行 --apply；
    const result = await runCli(root, '--apply');
    // 成功；
    expect(result.status).toBe(0);
    // 新檔存在；
    await expect(fs.access(path.join(root, 'd-互動版.html'))).resolves.toBeUndefined();
    // md 內連結已改；
    expect(await read(root, 'd.md')).toBe('# d\n[x](d-互動版.html)\n');
  });

  // 案例：--apply 遇到髒工作目錄回傳非 0 並說明原因；
  it('--apply 在工作目錄不乾淨時以非 0 結束並說明原因', async () => {
    // 建立 repo 並弄髒；
    await initRepoWith(root, { '_config.yml': 'exclude: []\n', 'd.md': '# d\n', 'd.html': '<h1>d</h1>\n' });
    // 新增未追蹤檔案；
    await seed(root, { 'dirty.txt': 'x' });
    // 執行 --apply；
    const result = await runCli(root, '--apply');
    // 非 0；
    expect(result.status).not.toBe(0);
    // stderr 說明原因；
    expect(result.stderr).toContain('不乾淨');
    // 檔案沒動；
    await expect(fs.access(path.join(root, 'd.html'))).resolves.toBeUndefined();
  });

  // 小工具：三方撞名的 repo（X.md、X.html、X-互動版.html 都在）另加一組正常配對 A 與連到兩邊的 md；
  const seedThreeWay = () =>
    // 初始化並提交；
    initRepoWith(root, {
      // 設定檔；
      '_config.yml': 'exclude: []\n',
      // 三方撞名的 md（連到被跳過的 X.html，不該被改寫）；
      'X.md': '# X\n[互動](X.html)\n',
      // 被跳過的 X.html；
      'X.html': '<h1>X</h1>\n',
      // 已存在的互動版；
      'X-互動版.html': '<h1>X2</h1>\n',
      // 正常配對；
      'A.md': '# A\n',
      // A.html；
      'A.html': '<h1>A</h1>\n',
      // 同時連到 A.html（要改）與 X.html（不改）的檔案；
      'links.md': '[a](A.html)\n[x](X.html)\n[[X.html]]\n',
    });

  // 案例：三方撞名的配對被跳過，其餘照常套用，被跳過的檔案位元組不變；
  it('--apply 遇到三方撞名時跳過該配對，其餘照常改名，被跳過的檔案與連結不動', async () => {
    // 建立 repo；
    await seedThreeWay();
    // 記下被跳過的三個檔案的原始位元組；
    const skippedBefore = {
      // X.md；
      md: await fs.readFile(path.join(root, 'X.md')),
      // X.html；
      html: await fs.readFile(path.join(root, 'X.html')),
      // X-互動版.html；
      target: await fs.readFile(path.join(root, 'X-互動版.html')),
    };
    // 執行 --apply；
    const result = await runCli(root, '--apply');
    // 成功結束；
    expect(result.status).toBe(0);
    // 輸出列出被跳過的配對與數量；
    expect(result.stdout).toContain('跳過');
    // 含配對的三個路徑；
    expect(result.stdout).toContain('X-互動版.html');
    // 數量 1；
    expect(result.stdout).toMatch(/跳過[^\n]*1/);
    // 正常配對已改名；
    await expect(fs.access(path.join(root, 'A-互動版.html'))).resolves.toBeUndefined();
    // 被跳過的 X.html 仍在原位；
    await expect(fs.access(path.join(root, 'X.html'))).resolves.toBeUndefined();
    // 被跳過的三個檔案位元組完全不變；
    expect((await fs.readFile(path.join(root, 'X.md'))).equals(skippedBefore.md)).toBe(true);
    // X.html；
    expect((await fs.readFile(path.join(root, 'X.html'))).equals(skippedBefore.html)).toBe(true);
    // X-互動版.html；
    expect((await fs.readFile(path.join(root, 'X-互動版.html'))).equals(skippedBefore.target)).toBe(true);
    // 連到 A.html 的連結被改、連到被跳過 X.html 的連結（含 wikilink）不動；
    expect(await read(root, 'links.md')).toBe('[a](A-互動版.html)\n[x](X.html)\n[[X.html]]\n');
  });

  // 案例：dry-run 同樣列出被跳過的配對與數量，且不動檔案；
  it('dry-run 列出被跳過的三方撞名配對與數量', async () => {
    // 建立 repo；
    await seedThreeWay();
    // 記下現況；
    const before = await snapshot(root);
    // 預覽；
    const result = await runCli(root);
    // 成功；
    expect(result.status).toBe(0);
    // 規劃只有 A 一組；
    expect(result.stdout).toContain('共 1 組');
    // 列出跳過的數量與三個路徑；
    expect(result.stdout).toMatch(/跳過[^\n]*1/);
    // X.md；
    expect(result.stdout).toContain('X.md');
    // X.html；
    expect(result.stdout).toContain('X.html');
    // X-互動版.html；
    expect(result.stdout).toContain('X-互動版.html');
    // 沒有撞名警告（已改為跳過）；
    expect(result.stdout).not.toContain('--apply 會拒絕，除非');
    // 什麼都沒動；
    expect(await snapshot(root)).toEqual(before);
  });

  // 案例：dry-run 遇到含糊 wikilink 時要說明 --apply 會拒絕；
  it('dry-run 遇到含糊 wikilink 時印出警告並說明 --apply 會拒絕', async () => {
    // 建立含糊情境；
    await initRepoWith(root, {
      // 設定檔；
      '_config.yml': 'exclude: []\n',
      // 配對；
      'x/d.md': '# d\n',
      // 會改名的 html；
      'x/d.html': '<h1>d</h1>\n',
      // 不會改名的同名 html；
      'y/d.html': '<h1>y</h1>\n',
      // 含糊的 wikilink；
      'n.md': '[[d.html]]\n',
    });
    // 預覽；
    const result = await runCli(root);
    // 成功結束（dry-run 不拒絕）；
    expect(result.status).toBe(0);
    // 印出含糊清單；
    expect(result.stdout).toContain('n.md');
    // 說明 --apply 會拒絕與 --allow-partial 的存在；
    expect(result.stdout).toContain('--apply 會拒絕');
    // 提到解除方式；
    expect(result.stdout).toContain('--allow-partial');
  });
});
