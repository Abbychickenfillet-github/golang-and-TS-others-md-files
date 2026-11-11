// 匯入 fs 的 promise 版 API，`import * as` 把整個模組收進命名空間 fs；用來掃描圖片檔；
import * as fs from 'node:fs/promises';
// 匯入 path 模組，用 join 組出實體路徑、resolve 算出絕對路徑、extname 取副檔名；
import * as path from 'node:path';
// 匯入 content.ts 的函式；副檔名寫 .ts：scripts 底下的報告腳本用 Node 型別剝除直接載入本檔，Node 只認完整檔名；
import { assertUniqueSlugs, isExcluded, listNotes, loadExclude } from './content.ts';
// `import type` 只匯入型別，編譯後整行消失，Node 的型別剝除也不會留下 import；
import type { NoteEntry } from './content.ts';
// 匯入 wikilink 索引建立函式與兩個「索引層級的警告」清單函式；
import { buildWikilinkIndex, listAmbiguousKeys, listShadowedTitles } from './wikilink.ts';

// 被取代的舊 html：X.md 與 X.html 同 slug，且 X-互動版.html 已存在（R25）；`export type` 匯出型別別名；
export type SupersededEntry = { relPath: string; replacedBy: string };

// 一則「誰在哪篇筆記寫了什麼」的紀錄；from 是寫出這個連結的筆記 relPath；
export type LinkIssue = { raw: string; from: string[] };

// 整站的警告報告；loadSite 填索引層級的欄位，renderNote 在渲染時填連結與圖片的欄位；
export type SiteReport = {
  // 被取代而不發布的舊 html；
  superseded: SupersededEntry[];
  // 只差大小寫或 Unicode 正規化的 slug 組（在 Windows／macOS 會寫到同一個檔案）；每組是 relPath 陣列；
  caseCollisions: string[][];
  // 被檔名鍵蓋過的 md 標題（listShadowedTitles 的結果）；
  shadowedTitles: { key: string; winner: string; shadowed: string[] }[];
  // 找不到目標的 wikilink：Map 的鍵是原始內文，值是連結它的筆記集合（Set 自動去重）；
  missingLinks: Map<string, Set<string>>;
  // 有歧義的 wikilink：鍵是原始內文，值是候選與連結它的筆記；
  ambiguousLinks: Map<string, { candidates: string[]; from: Set<string> }>;
  // 找不到的圖片嵌入：鍵是筆記裡寫的名稱，值是寫它的筆記；
  missingImages: Map<string, Set<string>>;
  // 同名圖片不只一張、只好挑一張的嵌入：鍵是名稱，值是全部候選 relPath；
  ambiguousImages: Map<string, string[]>;
  // 被引用、要複製進 out/ 的圖片 relPath（給 11b 用）；
  images: Set<string>;
};

// loadSite 的回傳值；
export type LoadedSite = {
  // 筆記根目錄的絕對路徑；
  root: string;
  // 要發布的筆記（已排除被取代的舊 html），依 relPath 排序；
  notes: NoteEntry[];
  // wikilink 索引（Map 物件本身也是 wikilink.ts 旁路表的鍵，所以不能複製）；
  index: Map<string, string>;
  // 圖片索引：鍵是 relPath 或檔名，值是符合的 relPath 陣列（已排序）；
  images: Map<string, string[]>;
  // 警告報告；
  report: SiteReport;
};

// 圖片副檔名（不分大小寫），與 remark/embed.ts 的判斷一致；
const IMAGE_EXT_RE = /\.(?:png|jpe?g|gif|webp|svg|avif|bmp)$/i;

// 建立一份空白報告；每個欄位都是新的容器，避免不同 site 共用同一個物件；
export function emptyReport(): SiteReport {
  // 物件字面值逐欄初始化；
  return {
    superseded: [], // 空陣列；
    caseCollisions: [], // 空陣列；
    shadowedTitles: [], // 空陣列；
    missingLinks: new Map(), // 空 Map，型別由 SiteReport 推得；
    ambiguousLinks: new Map(), // 空 Map；
    missingImages: new Map(), // 空 Map；
    ambiguousImages: new Map(), // 空 Map；
    images: new Set(), // 空集合；
  };
}

// R25：找出被「-互動版.html」取代的舊 html；回傳要發布的筆記與被取代清單；不改動傳入的陣列；
export function dropSuperseded(notes: NoteEntry[]): { published: NoteEntry[]; superseded: SupersededEntry[] } {
  // 依 slug（用 / 接起來）分組；Map 的值是同 slug 的筆記陣列；
  const bySlug = new Map<string, NoteEntry[]>();
  // 逐篇歸組；
  for (const note of notes) {
    // 組出鍵；
    const key = note.slug.join('/');
    // 取出既有陣列，沒有就給空陣列；
    const list = bySlug.get(key) ?? [];
    // 加入這篇；
    list.push(note);
    // 寫回；
    bySlug.set(key, list);
  }
  // 被取代的 html 的 relPath 集合；
  const dropped = new Set<string>();
  // 被取代清單；
  const superseded: SupersededEntry[] = [];
  // 逐組檢查；
  for (const [key, list] of bySlug) {
    // 這組要同時有 md 與 html 才符合規則；some 只要一個符合就回傳 true；
    if (!list.some((n) => n.kind === 'md') || !list.some((n) => n.kind === 'html')) continue;
    // 互動版的 slug 鍵：原 slug 加上 -互動版；
    const interactive = bySlug.get(`${key}-互動版`)?.find((n) => n.kind === 'html');
    // 沒有已發布的互動版 html 就不算被取代（之後 assertUniqueSlugs 會把它當成真正的衝突）；
    if (!interactive) continue;
    // 這組的每個 html 都被取代；
    for (const old of list.filter((n) => n.kind === 'html')) {
      // 記下 relPath；
      dropped.add(old.relPath);
      // 加入清單，附上取代它的檔案；
      superseded.push({ relPath: old.relPath, replacedBy: interactive.relPath });
    }
  }
  // 過濾掉被取代的；filter 回傳新陣列；
  const published = notes.filter((n) => !dropped.has(n.relPath));
  // 回傳結果；
  return { published, superseded };
}

// 找出「轉小寫並做 NFC 正規化後相同」的 slug 組；這些在不分大小寫的檔案系統上會互相覆蓋，只警告不丟錯；
export function findCaseCollisions(notes: NoteEntry[]): string[][] {
  // 正規化鍵 → relPath 陣列；
  const groups = new Map<string, string[]>();
  // 逐篇處理；
  for (const note of notes) {
    // normalize('NFC') 把組合字元統一成預組形式，toLowerCase 統一大小寫；
    const key = note.slug.join('/').normalize('NFC').toLowerCase();
    // 取出既有陣列；
    const list = groups.get(key) ?? [];
    // 加入；
    list.push(note.relPath);
    // 寫回；
    groups.set(key, list);
  }
  // 只留兩篇以上的組；Array.from 把 Map 的值轉成陣列；
  return Array.from(groups.values()).filter((list) => list.length > 1);
}

// 遞迴掃描根目錄底下的圖片檔（略過被排除的資料夾與檔案），回傳 relPath 陣列；
async function walkImages(root: string, dirRel: string, exclude: string[], out: string[]): Promise<void> {
  // 讀資料夾內容；withFileTypes 讓每筆是 Dirent，可以問是不是資料夾；
  const entries = await fs.readdir(path.join(root, dirRel), { withFileTypes: true });
  // 逐項處理；
  for (const entry of entries) {
    // 組出正斜線的相對路徑；
    const relPath = dirRel === '' ? entry.name : `${dirRel}/${entry.name}`;
    // 資料夾：沒被排除就遞迴；
    if (entry.isDirectory()) {
      // 被排除就略過（不發布的資料夾裡的圖片絕不能被引用出去）；
      if (!isExcluded(relPath, true, exclude)) await walkImages(root, relPath, exclude, out);
      // 下一項；
      continue;
    }
    // 一般檔案、圖片副檔名、沒被排除才收；
    if (entry.isFile() && IMAGE_EXT_RE.test(entry.name) && !isExcluded(relPath, false, exclude)) out.push(relPath);
  }
}

// 建立圖片索引：同時以「完整 relPath」與「檔名」當鍵；值是排序過的 relPath 陣列（同檔名可能有多張）；
export async function buildImageIndex(root: string, exclude: string[]): Promise<Map<string, string[]>> {
  // 收集所有圖片；
  const files: string[] = [];
  // 從根層開始掃；
  await walkImages(root, '', exclude, files);
  // 排序讓結果穩定；
  files.sort();
  // 結果 Map；
  const index = new Map<string, string[]>();
  // 加入一筆的小工具；箭頭函式；
  const add = (key: string, relPath: string) => index.set(key, [...(index.get(key) ?? []), relPath]);
  // 逐張登記；
  for (const relPath of files) {
    // 完整路徑當鍵；
    add(relPath, relPath);
    // 檔名當鍵（與完整路徑相同時，也就是根目錄的圖，就不重複登記）；
    const name = relPath.split('/').at(-1) as string;
    // 不同才登記；
    if (name !== relPath) add(name, relPath);
  }
  // 回傳；
  return index;
}

// 載入整個網站：讀排除清單 → 掃筆記 → 去掉被取代的舊 html → 檢查 slug 唯一 → 建 wikilink 索引與圖片索引；
export async function loadSite(root: string): Promise<LoadedSite> {
  // 轉成絕對路徑，之後所有讀檔都以它為基準；
  const absRoot = path.resolve(root);
  // 排除清單只取自 _config.yml；
  const exclude = await loadExclude(path.join(absRoot, '_config.yml'));
  // 掃描所有筆記；
  const all = await listNotes(absRoot, exclude);
  // R25：去掉被取代的舊 html；
  const { published, superseded } = dropSuperseded(all);
  // 去掉之後 slug 必須唯一，其他重複是真正的錯誤，直接丟錯讓建置失敗；
  assertUniqueSlugs(published);
  // 建 wikilink 索引（只用要發布的筆記，被取代的舊 html 不會成為連結目標）；
  const index = buildWikilinkIndex(published);
  // 建圖片索引；
  const images = await buildImageIndex(absRoot, exclude);
  // 新報告；
  const report = emptyReport();
  // 填入被取代清單；
  report.superseded = superseded;
  // 填入大小寫衝突；
  report.caseCollisions = findCaseCollisions(published);
  // 填入被蓋過的標題；
  report.shadowedTitles = listShadowedTitles(index);
  // 回傳；
  return { root: absRoot, notes: published, index, images, report };
}

// 索引層級的歧義鍵清單（報告用）；轉呼叫 listAmbiguousKeys，讓呼叫端不必另外匯入 wikilink.ts；
export function ambiguousKeysOf(site: LoadedSite): { key: string; candidates: string[] }[] {
  // 直接回傳；
  return listAmbiguousKeys(site.index);
}

// 筆記根目錄：環境變數 NOTES_ROOT（相對於 site/ 的 cwd），預設是上一層的 repo 根目錄；與其他腳本規則相同；
export function notesRootFromEnv(): string {
  // path.resolve 以 cwd 為基準；
  return path.resolve(process.cwd(), process.env.NOTES_ROOT ?? '..');
}

// 每個行程只載入一次網站：Map 的鍵是根目錄，值是 Promise（同時多個頁面呼叫時共用同一次載入）；
const cache = new Map<string, Promise<LoadedSite>>();

// 給路由模組用的快取版 loadSite；Next 的每個建置 worker 是獨立行程，各自載入一次；
export function getSite(root: string = notesRootFromEnv()): Promise<LoadedSite> {
  // 查快取；
  let pending = cache.get(root);
  // 沒有就開始載入並存起來；
  if (!pending) {
    // 呼叫 loadSite 拿到 Promise；
    pending = loadSite(root);
    // 存進快取；
    cache.set(root, pending);
  }
  // 回傳同一個 Promise；
  return pending;
}
