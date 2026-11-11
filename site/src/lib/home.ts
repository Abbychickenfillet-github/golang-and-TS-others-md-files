// `import type` 只匯入型別，編譯後整行消失；用來描述一篇筆記的欄位；
import type { NoteEntry } from './content.ts';

// 首頁清單的一個項目；`export type` 匯出型別別名；
export type HomeItem = {
  // 顯示的標題文字：NoteEntry.title，空白就退回檔名；
  title: string;
  // 頁面網址路徑（slug 用 / 接起來、尚未編碼），元件再加上 basePath 並逐段編碼；
  path: string;
  // 筆記種類；
  kind: 'md' | 'html';
  // 是否為互動版（檔名以 -互動版 結尾的 html），首頁要在旁邊標記；
  interactive: boolean;
};

// 首頁清單的一個區塊：一個 h2（頂層資料夾或根目錄）或 h3（巢狀資料夾，標題帶路徑前綴）；
export type HomeSection = {
  // 標題文字：頂層資料夾名、「根目錄」，或相對於頂層資料夾的巢狀路徑（例如 css/images）；
  heading: string;
  // 標題層級；notes.js 只把 h2 與 h3 放進大綱；
  level: 2 | 3;
  // 篇數：h2 是含所有子資料夾的總篇數，h3 與根目錄是自己直接放的篇數；
  count: number;
  // 這個資料夾「直接放」的筆記（不含子資料夾），已排序；
  items: HomeItem[];
};

// 互動版的檔名約定，與 build-index.py 的 ALT_SUFFIX 一致；
const ALT_SUFFIX = '-互動版';

// 碼點順序比較（JS 字串的 < 與 > 是依 UTF-16 碼元，所以大寫在小寫之前、ASCII 在中文之前），不用 localeCompare：它依地區設定，不同機器結果可能不同；
function cmp(a: string, b: string): number {
  // 三元運算子巢狀：a 小回 -1，a 大回 1，相等回 0；
  return a < b ? -1 : a > b ? 1 : 0;
}

// 依「路徑片段」比較資料夾路徑，得到深度優先的樹狀順序（a、a/sub、a/sub/deep、a-x，而不是把 - 排在 / 前面而打斷子樹）；
function cmpPath(a: string, b: string): number {
  // 切成片段；
  const pa = a.split('/');
  // 同上；
  const pb = b.split('/');
  // 逐段比較，直到有一邊用完；
  for (let i = 0; i < Math.min(pa.length, pb.length); i += 1) {
    // 這一段不同就以它決定；
    const c = cmp(pa[i], pb[i]);
    // 有結果就回傳；
    if (c !== 0) return c;
  }
  // 前面都相同：片段少的在前（父資料夾在子資料夾之前）；
  return pa.length - pb.length;
}

// 把筆記轉成首頁項目並排序（依檔名碼點順序）；不改動傳入的陣列（先用展開運算子複製再排序）；
function toItems(list: NoteEntry[]): HomeItem[] {
  // 檔名（slug 最後一段）當排序鍵；
  const stem = (n: NoteEntry): string => n.slug.at(-1) as string;
  // 複製、排序、轉換；
  return [...list]
    .sort((a, b) => cmp(stem(a), stem(b)))
    .map((n) => ({
      // 標題空白就退回檔名；trim 去頭尾空白；
      title: n.title.trim() || stem(n),
      // 頁面路徑；
      path: n.slug.join('/'),
      // 種類；
      kind: n.kind,
      // 互動版：html 且檔名以 -互動版 結尾；
      interactive: n.kind === 'html' && stem(n).endsWith(ALT_SUFFIX),
    }));
}

// 把已發布的筆記分成首頁的區塊，規則仿 build-index.py：先是根目錄的筆記，再是每個頂層資料夾；
// 頂層資料夾是 h2（先列自己直接放的筆記）；巢狀資料夾接在後面，每個有筆記的資料夾是一個 h3，標題是相對頂層資料夾的路徑；
// 同層「檔案在前、資料夾在後」，資料夾與檔案都依碼點順序（build-index.py 用自然排序，這裡依指示改成碼點順序，結果才與機器無關）；
export function buildHomeSections(notes: NoteEntry[]): HomeSection[] {
  // 資料夾路徑（slug 去掉最後一段；根層為空字串）→ 直接放在那裡的筆記；
  const byDir = new Map<string, NoteEntry[]>();
  // 逐篇歸組；
  for (const note of notes) {
    // 資料夾路徑；slice(0, -1) 去掉檔名那段；
    const dir = note.slug.slice(0, -1).join('/');
    // 取出或新建；
    const list = byDir.get(dir) ?? [];
    // 加入；
    list.push(note);
    // 寫回；
    byDir.set(dir, list);
  }
  // 結果；
  const sections: HomeSection[] = [];
  // 根目錄的筆記排在最前面；
  const rootNotes = byDir.get('');
  // 有才輸出；
  if (rootNotes) sections.push({ heading: '根目錄', level: 2, count: rootNotes.length, items: toItems(rootNotes) });
  // 頂層資料夾名稱：每個非空資料夾路徑的第一段，用 Set 去重；
  const tops = new Set<string>();
  // 逐個資料夾路徑；
  for (const dir of byDir.keys()) if (dir !== '') tops.add(dir.split('/')[0]);
  // 依碼點順序處理每個頂層資料夾；
  for (const top of Array.from(tops).sort(cmp)) {
    // 這個頂層底下（含自己）有筆記的資料夾路徑，依樹狀順序排序（自己一定排第一）；
    const dirs = Array.from(byDir.keys())
      .filter((d) => d === top || d.startsWith(`${top}/`))
      .sort(cmpPath);
    // 總篇數：每個資料夾的篇數加總；reduce 累加；
    const total = dirs.reduce((sum, d) => sum + (byDir.get(d)?.length ?? 0), 0);
    // h2：頂層資料夾自己直接放的筆記（可能沒有）；
    sections.push({ heading: top, level: 2, count: total, items: toItems(byDir.get(top) ?? []) });
    // 巢狀資料夾：每個一個 h3，標題去掉「頂層/」前綴；
    for (const dir of dirs.filter((d) => d !== top)) {
      // 取出這個資料夾的筆記；
      const list = byDir.get(dir) ?? [];
      // 加入區塊；slice 取前綴之後的字串；
      sections.push({ heading: dir.slice(top.length + 1), level: 3, count: list.length, items: toItems(list) });
    }
  }
  // 回傳；
  return sections;
}
