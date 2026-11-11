// 匯入 fs 的 promise 版 API，`import * as` 把整個模組收進命名空間 fs；用來讀筆記、查檔案是否存在、複製附件；
import * as fs from 'node:fs/promises';
// 匯入 path 模組：path.posix 一律用正斜線處理 relPath，path 本身用來組出實體路徑（Windows 會用反斜線）；
import * as path from 'node:path';
// 匯入 cheerio 的 load 函式，在 Node 端解析 html（語法像 jQuery）；
import { load } from 'cheerio';
// 匯入 unified 與 remark-parse，把 Markdown 解析成 mdast 語法樹（只解析不轉換，所以連結都還是原樣）；
import { unified } from 'unified';
// 匯入 Markdown 解析器；
import remarkParse from 'remark-parse';
// 匯入 GFM 外掛（表格、刪除線、自動連結），讓 GFM 語法裡的連結也能解析；
import remarkGfm from 'remark-gfm';
// 匯入 unist-util-visit 的 visit，走訪語法樹的每個節點；
import { visit } from 'unist-util-visit';
// 匯入前言拆分函式：先去掉前言，免得 YAML 被當成內文；副檔名寫 .ts：scripts 底下的腳本用 Node 型別剝除直接載入本檔；
import { splitFrontmatter } from './frontmatter.ts';
// 匯入排除判斷（與掃描筆記、掃描圖片用的同一個函式，所以「被排除」的定義只有一份）；
import { isExcluded } from './content.ts';
// 匯入「是不是共用腳本或共用樣式表」的判斷（與 parseHtmlNote 濾掉共用檔案用的同一份清單）；
import { isSharedAssetFile } from './parse-html.ts';
// `import type` 只匯入型別，編譯後整行消失；
import type { NoteEntry } from './content.ts';

// 一筆「筆記 → 目標」的紀錄集合：Map 的鍵是筆記 relPath，值是該筆記指到的目標 relPath 集合（Set 自動去重）；
export type NoteTargets = Map<string, Set<string>>;

// collectLocalAssets 的結果；`export type` 匯出型別別名；
export type LocalAssetsReport = {
  // 要複製進輸出資料夾的檔案 relPath（相對筆記根目錄、正斜線、已排序去重）；
  files: string[];
  // 被已發布的筆記引用、但屬於「不發布」範圍（排除清單、點或底線開頭、node_modules）的檔案：絕不複製，只報告；
  excludedReferenced: NoteTargets;
  // 引用了但在筆記庫裡找不到的本地檔案（含大小寫不符：Windows 與 macOS 找得到、Linux 與 GitHub Pages 找不到）；
  missingLocal: NoteTargets;
  // 用 .. 跑出筆記根目錄的引用（原始字串）：一律不處理；
  outsideRoot: NoteTargets;
  // 已由別處提供而不複製的引用數：指到根目錄 assets/ 底下的（sync-assets 已整個放進輸出），以及指到共用腳本與共用樣式表的（layout 統一載入）；
  providedByAssets: number;
};

// 依筆記種類，從原文取出「原始引用字串」（還沒解碼、沒解析成路徑）；
export function rawReferences(kind: 'md' | 'html', source: string): string[] {
  // 累積結果；
  const refs: string[] = [];
  // html 與 md 裡的 html 片段共用的抽取函式；
  const fromHtml = (html: string): void => {
    // 解析成可查詢的文件；load 對片段也會補成完整文件結構，不影響屬性查詢；
    const $ = load(html);
    // 任何元素的 src：img、source、video、audio、track、script、iframe、embed；
    $('[src]').each((_, el) => {
      // 讀屬性值；
      const v = $(el).attr('src');
      // 有值才收；
      if (v !== undefined) refs.push(v);
    });
    // a、area、link 的 href：圖片、pdf、zip 等附件連結與外部樣式表；
    $('a[href], area[href], link[href]').each((_, el) => {
      // 讀屬性值；
      const v = $(el).attr('href');
      // 有值才收；
      if (v !== undefined) refs.push(v);
    });
    // video 的 poster 封面圖；
    $('[poster]').each((_, el) => {
      // 讀屬性值；
      const v = $(el).attr('poster');
      // 有值才收；
      if (v !== undefined) refs.push(v);
    });
    // srcset：「網址 [寬度或倍率描述], 網址 …」；以空白與逗號切開，丟掉 `640w`、`2x` 這類描述；
    $('[srcset]').each((_, el) => {
      // 讀屬性值；
      const v = $(el).attr('srcset') ?? '';
      // 切開後逐一處理；filter(Boolean) 去掉空字串；
      for (const token of v.split(/[\s,]+/).filter(Boolean)) {
        // 寬度或倍率描述（例如 640w、1.5x）不是網址；
        if (/^\d+(?:\.\d+)?[wx]$/.test(token)) continue;
        // 收下；
        refs.push(token);
      }
    });
  };
  // html 筆記：整份文件都掃（head 的樣式表與腳本、body 的圖片與連結）；
  if (kind === 'html') {
    // 抽取；
    fromHtml(source);
    // 回傳；
    return refs;
  }
  // md 筆記：先去掉前言，再解析成語法樹；
  const tree = unified().use(remarkParse).use(remarkGfm).parse(splitFrontmatter(source).body.replace(/\r\n?/g, '\n'));
  // 走訪每個節點；程式碼區塊與行內程式碼是別的節點型別，不會被誤當成連結；
  visit(tree, (node) => {
    // 連結、圖片、連結定義都有 url 欄位（已去掉 <> 與反斜線跳脫，但還沒做百分比解碼）；
    if (node.type === 'link' || node.type === 'image' || node.type === 'definition') refs.push(node.url);
    // md 裡手寫的 html 片段（例如 <img src>、<a href>）也要找；
    else if (node.type === 'html') fromHtml(node.value);
  });
  // 回傳；
  return refs;
}

// 解析一個原始引用字串的結果：skip＝不是本地檔案引用；outside＝跑出筆記根目錄；local＝筆記庫內的相對路徑；
export type ResolvedReference = { kind: 'skip' } | { kind: 'outside' } | { kind: 'local'; rel: string };

// 把筆記裡的原始引用字串解析成「相對筆記根目錄」的路徑；規則：相對於筆記所在資料夾、去掉 ?query 與 #fragment、做百分比解碼；
export function resolveReference(noteRelPath: string, raw: string): ResolvedReference {
  // 去掉頭尾空白；
  const ref = raw.trim();
  // 空字串、純錨點（#x）、協定相對（//host）、絕對路徑（/x）都不是本地相對引用；
  if (ref === '' || ref.startsWith('#') || ref.startsWith('/')) return { kind: 'skip' };
  // 任何協定（http:、https:、data:、mailto:、javascript:、tel:、file: 等）都略過；正規式：英文字母開頭，後接字母數字與 + . -，再接冒號；
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) return { kind: 'skip' };
  // 去掉 ? 或 # 之後的全部（要在解碼之前做，因為 %3F、%23 解碼後是檔名的一部分，不是分隔符）；[\s\S] 代表「任何字元含換行」（TypeScript 目標版本不支援 s 旗標）；
  const bare = ref.replace(/[?#][\s\S]*$/, '');
  // 去掉之後什麼都不剩（例如 ?v=1）就不是檔案；
  if (bare === '') return { kind: 'skip' };
  // 安全解碼：遇到單獨的 % 時 decodeURIComponent 會丟 URIError，此時保留原字串；
  let decoded = bare;
  // try/catch 攔下 URIError；
  try {
    // 解碼 %20、%E4… 等；
    decoded = decodeURIComponent(bare);
  } catch {
    // 解碼失敗就沿用原字串；
  }
  // 結尾是 / 代表資料夾連結，不是檔案；
  if (decoded.endsWith('/')) return { kind: 'skip' };
  // 筆記所在資料夾（根層為空字串）；
  const dir = path.posix.dirname(noteRelPath) === '.' ? '' : path.posix.dirname(noteRelPath);
  // 接上並正規化（處理 ./ 與 ../）；posix 版一律用正斜線；
  const rel = path.posix.normalize(path.posix.join(dir, decoded));
  // 正規化後仍以 .. 開頭，代表跑出了筆記根目錄；
  if (rel === '..' || rel.startsWith('../')) return { kind: 'outside' };
  // 指到根目錄本身或資料夾（例如 . 或 sub/..）不是檔案；
  if (rel === '.' || rel === '') return { kind: 'skip' };
  // 筆記庫內的路徑；
  return { kind: 'local', rel };
}

// 判斷一個相對路徑是不是「不發布」：路徑上任何一層資料夾或檔案本身被排除就算；
// 為什麼要逐層檢查：isExcluded 只看路徑最後一段（`private/` 只對資料夾 private 本身成立），掃描筆記時是靠「被排除的資料夾不走進去」才擋住底下的檔案，引用檢查沒有走訪，要自己逐層問；
export function isPathExcluded(rel: string, exclude: string[]): boolean {
  // 切成片段；
  const parts = rel.split('/');
  // 逐層檢查；
  for (let i = 0; i < parts.length; i += 1) {
    // 到第 i 層為止的路徑；
    const prefix = parts.slice(0, i + 1).join('/');
    // 不是最後一段就是資料夾；
    const isDir = i < parts.length - 1;
    // 任何一層被排除就整條算排除；
    if (isExcluded(prefix, isDir, exclude)) return true;
  }
  // 都沒被排除；
  return false;
}

// 取得檔案「實際大小寫」的相對路徑；不存在回傳 undefined；
// 為什麼不直接 stat：Windows 與 macOS 的檔案系統不分大小寫，筆記寫 Pic.PNG、檔案其實叫 pic.png 時 stat 會成功，但部署到 Linux（GitHub Actions 與 Pages）就找不到；
// fs.promises.realpath 走原生實作，在 Windows 會回傳磁碟上真正的大小寫；
async function canonicalRel(realRoot: string, rel: string): Promise<{ canon: string; isDir: boolean } | undefined> {
  // 實體路徑；split('/') 再 join 用平台分隔符；
  const abs = path.join(realRoot, ...rel.split('/'));
  // try/catch：不存在（ENOENT）或權限問題都當作找不到；
  try {
    // 查詢是不是資料夾；
    const stat = await fs.stat(abs);
    // 取真實路徑；
    const real = await fs.realpath(abs);
    // 轉成相對筆記根目錄、正斜線、NFC 正規化；
    const canon = path.relative(realRoot, real).split(path.sep).join('/').normalize('NFC');
    // 回傳；
    return { canon, isDir: stat.isDirectory() };
  } catch {
    // 找不到；
    return undefined;
  }
}

// 在「筆記 → 目標」集合裡加一筆；
function addTarget(map: NoteTargets, note: string, target: string): void {
  // 取出或新建集合；
  const set = map.get(note) ?? new Set<string>();
  // 加入；
  set.add(target);
  // 寫回；
  map.set(note, set);
}

// 收集所有要複製的本地檔案；site 只需要根目錄與已發布的筆記；images 是 md 管線記錄的 ![[…]] 圖片 relPath（site-report 寫進 .build-report.json）；
export async function collectLocalAssets(site: { root: string; notes: NoteEntry[] }, exclude: string[], images: Iterable<string> = []): Promise<LocalAssetsReport> {
  // 結果；
  const report: LocalAssetsReport = { files: [], excludedReferenced: new Map(), missingLocal: new Map(), outsideRoot: new Map(), providedByAssets: 0 };
  // 去重用：要複製的檔案集合；
  const files = new Set<string>();
  // 筆記根目錄的真實路徑（解開符號連結與 8.3 短檔名，之後與 realpath 的結果才能相減）；
  const realRoot = await fs.realpath(site.root);
  // 已發布頁面的 slug 集合：引用 `x.html` 或 `x`（沒副檔名）時，若 x 是已發布的筆記，那是頁面不是附件；
  const pageSlugs = new Set(site.notes.map((n) => n.slug.join('/')));
  // 已發布的 html／md 筆記路徑集合（引用到的筆記原始檔不能複製，也不是附件）；
  const noteFiles = new Set(site.notes.map((n) => n.relPath));
  // 處理一個已解析成筆記庫內路徑的引用；from 是引用它的筆記（或來源說明）；
  const handle = async (from: string, rel: string): Promise<void> => {
    // 副檔名（小寫）；
    const ext = path.posix.extname(rel).toLowerCase();
    // 去掉 .html 或 .md 之後的路徑；沒有這兩種副檔名時就是原路徑；
    const stem = ext === '.html' || ext === '.md' ? rel.slice(0, -ext.length) : rel;
    // 指到已發布的頁面（含改名後只剩 .md 的舊 .html 連結、沒寫副檔名的連結）：是頁面，輸出時另有檔案，不是附件；
    if ((ext === '.html' || ext === '.md' || ext === '') && (pageSlugs.has(stem) || noteFiles.has(rel))) return;
    // 共用腳本與共用樣式表（notes.js、note-theme.css 等，不論寫在哪個資料夾）：頁面解析時已被濾掉，由 layout 統一載入 assets/ 裡的那一份，不複製也不算找不到；
    if (isSharedAssetFile(rel)) {
      // 計入「已由別處提供」；
      report.providedByAssets += 1;
      // 結束；
      return;
    }
    // 根目錄 assets/ 底下的引用：整個資料夾已由 sync-assets 放進輸出；仍要確認檔案存在，否則是找不到；
    if (rel.startsWith('assets/')) {
      // 查詢；
      const found = await canonicalRel(realRoot, rel);
      // 存在、是檔案且大小寫相符：計數；
      if (found && !found.isDir && found.canon === rel.normalize('NFC')) report.providedByAssets += 1;
      // 不存在，或存在但大小寫不符（在 Linux 上會找不到）：記為找不到；指到資料夾則不處理；
      else if (!found || !found.isDir) addTarget(report.missingLocal, from, rel);
      // 結束；
      return;
    }
    // 隱私優先：只要這個路徑被排除就絕不複製，連是否存在都不問；
    if (isPathExcluded(rel, exclude)) {
      // 記下「哪篇已發布的筆記指到哪個不發布的檔案」；
      addTarget(report.excludedReferenced, from, rel);
      // 結束；
      return;
    }
    // 查詢實際檔案（含實際大小寫）；
    const found = await canonicalRel(realRoot, rel);
    // 找不到（頁面連結已在上面處理過，這裡的都是真的不存在）；
    if (!found) {
      // 記下；
      addTarget(report.missingLocal, from, rel);
      // 結束；
      return;
    }
    // 資料夾不是檔案；
    if (found.isDir) return;
    // 實際路徑跑出了筆記根目錄（例如符號連結指到別處）：不處理；
    if (found.canon === '..' || found.canon.startsWith('../')) {
      // 記下；
      addTarget(report.outsideRoot, from, rel);
      // 結束；
      return;
    }
    // 大小寫與實際不符：在區分大小寫的環境（Linux、GitHub Pages）會 404；但若「實際路徑」被排除，仍要當成排除處理，不能因為大小寫不同就漏掉（不分大小寫的檔案系統上 Private/x.png 會打開 private/x.png）；
    if (found.canon !== rel.normalize('NFC')) {
      // 實際路徑被排除：報告為排除，絕不複製；
      if (isPathExcluded(found.canon, exclude)) addTarget(report.excludedReferenced, from, rel);
      // 否則是大小寫不符的找不到；
      else addTarget(report.missingLocal, from, rel);
      // 結束；
      return;
    }
    // 筆記原始檔（.md 或 .html）永遠不當附件複製：它們若已發布就是頁面，若沒發布（被取代或保留名稱）就是不該出現的檔案；
    if (ext === '.md' || ext === '.html') return;
    // 其餘是附件：加入複製清單；
    files.add(rel);
  };
  // 逐篇筆記掃描引用；
  for (const note of site.notes) {
    // 讀原文；
    const source = await fs.readFile(path.join(site.root, note.relPath), 'utf8');
    // 逐個原始引用；
    for (const raw of rawReferences(note.kind, source)) {
      // 解析；
      const res = resolveReference(note.relPath, raw);
      // 不是本地引用就略過；
      if (res.kind === 'skip') continue;
      // 跑出根目錄：若檔名是共用腳本或樣式表（例如 ../../../assets/wikilink.js），layout 已統一載入，計入已提供；否則記下原始字串；
      if (res.kind === 'outside') {
        // 共用檔案；
        if (isSharedAssetFile(raw)) report.providedByAssets += 1;
        // 其他；
        else addTarget(report.outsideRoot, note.relPath, raw.trim());
      }
      // 本地：交給 handle 處理；
      else await handle(note.relPath, res.rel);
    }
  }
  // md 管線記錄的圖片：已在圖片索引裡（索引本身略過被排除的路徑），仍照同一套規則再檢查一次，不信任報告檔；
  for (const rel of images) await handle('（md 的 ![[圖片]] 嵌入）', rel);
  // 排序後輸出，讓結果與複製順序穩定；
  report.files = Array.from(files).sort();
  // 回傳；
  return report;
}

// 複製結果：複製的檔案數與位元組數；
export type CopyStats = { count: number; bytes: number };

// 把檔案從筆記根目錄複製到輸出資料夾的「同一個相對路徑」，位元組原樣保留（copyFile 不經過任何編碼轉換）；
export async function copyLocalAssets(root: string, outDir: string, files: string[]): Promise<CopyStats> {
  // 計數器；
  const stats: CopyStats = { count: 0, bytes: 0 };
  // 輸出資料夾的絕對路徑；
  const absOut = path.resolve(outDir);
  // 逐檔複製；
  for (const rel of files) {
    // 來源；
    const from = path.join(root, ...rel.split('/'));
    // 目的地；
    const to = path.join(absOut, ...rel.split('/'));
    // 防呆：目的地必須在輸出資料夾裡面（rel 已經不可能含 ..，這是第二道防線）；
    if (path.relative(absOut, to).startsWith('..')) throw new Error(`複製目的地跑出輸出資料夾：${rel}`);
    // 先建資料夾；recursive 讓多層一次建好、已存在不丟錯；
    await fs.mkdir(path.dirname(to), { recursive: true });
    // 複製；已存在的同名檔會被覆蓋，所以可以重跑；
    await fs.copyFile(from, to);
    // 累計位元組；
    stats.bytes += (await fs.stat(to)).size;
    // 累計檔案數；
    stats.count += 1;
  }
  // 回傳；
  return stats;
}

// 遞迴計算資料夾內全部檔案的位元組總和（輸出資料夾大小的檢查用）；
export async function dirSize(dir: string): Promise<number> {
  // 累計；
  let total = 0;
  // recursive 列出整棵樹；withFileTypes 讓每筆能問是不是檔案；
  for (const entry of await fs.readdir(dir, { recursive: true, withFileTypes: true })) {
    // 只算一般檔案；parentPath 是該項目所在資料夾；
    if (entry.isFile()) total += (await fs.stat(path.join(entry.parentPath, entry.name))).size;
  }
  // 回傳；
  return total;
}

// GitHub Pages 站台大小的警告門檻（位元組）：官方說約 1 GB（⚠️ 未查證），900 MB 是這份計畫裡暫定的提前警告線；
export const OUT_SIZE_WARN_BYTES = 900 * 1024 * 1024;

// 把位元組數轉成一位小數的 MB 字串；
const mb = (bytes: number): string => (bytes / 1024 / 1024).toFixed(1);

// 整理成人看得懂的繁體中文摘要（多行）；outBytes 是複製後輸出資料夾的總大小；
export function formatLocalAssetsReport(report: LocalAssetsReport, stats: CopyStats, outBytes: number): string {
  // 累積每一行；
  const lines: string[] = [];
  // 標題；
  lines.push('===== 本地附件複製摘要 =====');
  // 複製數量與大小；
  lines.push(`複製的本地附件：${stats.count} 個檔案、${mb(stats.bytes)} MB（另有 ${report.providedByAssets} 個引用指到根目錄 assets/ 或共用腳本與樣式表，已由 sync-assets 與 layout 提供，不重複複製）`);
  // 輸出資料夾總大小；
  lines.push(`輸出資料夾目前總大小：${mb(outBytes)} MB`);
  // 超過門檻的警告；
  if (outBytes > OUT_SIZE_WARN_BYTES) lines.push(`警告：輸出資料夾超過 ${mb(OUT_SIZE_WARN_BYTES)} MB，GitHub Pages 站台上限約 1 GB（未查證），請檢查大檔案`);
  // 被排除的檔案：全部列出，因為這是「已發布的筆記指向私人檔案」，需要作者逐一處理；
  const excluded = Array.from(report.excludedReferenced);
  // 筆記數與引用數；
  lines.push(`警告：已發布的筆記指到「不發布」的檔案：${excluded.reduce((n, [, t]) => n + t.size, 0)} 個引用、${excluded.length} 篇筆記（這些檔案不會複製，頁面上會是壞連結或壞圖，全部列出）`);
  // 逐篇列出；
  for (const [note, targets] of excluded) lines.push(`  ${note} → ${Array.from(targets).join('、')}`);
  // 找不到的本地檔案：只列前 20 筆；
  const missing = Array.from(report.missingLocal).flatMap(([note, targets]) => Array.from(targets, (t) => `${note} → ${t}`));
  // 數量；
  lines.push(`找不到的本地檔案引用：${missing.length} 個（只列前 20 個）`);
  // 前 20 個；
  for (const line of missing.slice(0, 20)) lines.push(`  ${line}`);
  // 跑出根目錄的引用；
  const outside = Array.from(report.outsideRoot).flatMap(([note, targets]) => Array.from(targets, (t) => `${note} → ${t}`));
  // 數量；
  lines.push(`跑出筆記根目錄（..）而不處理的引用：${outside.length} 個${outside.length > 0 ? '（只列前 10 個）' : ''}`);
  // 前 10 個；
  for (const line of outside.slice(0, 10)) lines.push(`  ${line}`);
  // 用換行接起來；
  return lines.join('\n');
}

// 把結果轉成可寫進 .build-report.json 的純物件（Map 與 Set 轉成物件與陣列）；
export function localAssetsToJson(report: LocalAssetsReport, stats: CopyStats, outBytes: number): Record<string, unknown> {
  // Map<字串, Set> 轉成 { 鍵: [值…] }；
  const toObj = (m: NoteTargets) => Object.fromEntries(Array.from(m, ([k, v]) => [k, Array.from(v)]));
  // 組出物件；
  return { copiedFiles: stats.count, copiedBytes: stats.bytes, outBytes, providedByAssets: report.providedByAssets, files: report.files, excludedReferenced: toObj(report.excludedReferenced), missingLocal: toObj(report.missingLocal), outsideRoot: toObj(report.outsideRoot) };
}
