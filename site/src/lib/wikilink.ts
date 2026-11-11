// 匯入 cheerio 的 load 函式，在 Node 端把 html 解析成節點樹（只用來「找出」文字節點的原始位置，不用來重新輸出）；
import { load } from 'cheerio';
// 匯入 unist-util-visit 的 visit 與 SKIP；visit 走訪語法樹，SKIP 是「不要走進這個節點的子孫」的特殊回傳值；
import { SKIP, visit } from 'unist-util-visit';
// 匯入 mdast 的型別；`import type` 整句只在編譯期存在，Node 的型別剝除不會留下任何 import；
import type { Link, PhrasingContent, Root, Text } from 'mdast';
// 匯入 domhandler 的節點型別（cheerio 內部使用的 DOM 節點），同樣只在編譯期存在；
import type { AnyNode } from 'domhandler';
// 匯入 NoteEntry 型別（同樣整句 type-only，所以不需要副檔名）；
import type { NoteEntry } from './content';

// `export type` 匯出型別別名：remarkWikilink 的選項；
export type RemarkWikilinkOptions = {
  // index：buildWikilinkIndex 建出的索引；
  index: Map<string, string>;
  // onMissing：找不到連結目標時的回呼，參數是 `[[` 與 `]]` 之間的原始文字；
  onMissing: (raw: string) => void;
  // basePath：網站部署在子路徑時的前綴（例如 '/Abby-notes'），省略代表網站根目錄；
  basePath?: string;
};

// ---------- 索引的「種類資訊」旁路表 ----------
// 設計：索引的型別依規定是 Map<鍵, 網址>，但「[[x.html]] 要指定種類」與「[[資料夾/標題]] 要用路徑尾段消歧」需要知道每個鍵對應的筆記；
// 做法：buildWikilinkIndex 另外把「鍵 → NoteEntry[]」存進這個 WeakMap，以索引 Map 物件本身當鍵；
// WeakMap 的鍵是弱參照，索引被回收時旁路表會自動跟著消失，不會洩漏記憶體；手寫的普通 Map 查不到旁路表，就退回只看 Map 的值；
const registries = new WeakMap<Map<string, string>, Map<string, NoteEntry[]>>();

// 筆記的站內路徑（未編碼）：開頭一個 /，加上 slug 片段用 / 連起來；
function urlOf(note: NoteEntry): string {
  // 陣列的 join 把片段接成字串；
  return `/${note.slug.join('/')}`;
}

// 同一篇「邏輯筆記」的識別字串：md 與 html 同資料夾同檔名時 slug 相同，視為同一篇（控制者裁定 R3）；
function logicalId(note: NoteEntry): string {
  // 用 slug 串起來當識別；
  return note.slug.join('/');
}

// 把一組筆記依「md 優先、再依 relPath」排序，回傳新陣列（不改動原陣列）；
function preferMarkdown(notes: NoteEntry[]): NoteEntry[] {
  // 先用展開運算子複製一份再 sort，避免改到呼叫端的陣列；
  return [...notes].sort((a, b) => {
    // md 排在 html 前面：kind 不同時，md 回傳負數；
    if (a.kind !== b.kind) return a.kind === 'md' ? -1 : 1;
    // 同種類就依 relPath 的碼點順序，讓結果穩定；
    return a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0;
  });
}

// 依鍵把筆記分組；keyOf 決定每篇筆記屬於哪個鍵（可能沒有鍵，回傳 undefined 就略過）；
function groupBy(notes: NoteEntry[], keyOf: (note: NoteEntry) => string | undefined): Map<string, NoteEntry[]> {
  // 累積結果的 Map；
  const groups = new Map<string, NoteEntry[]>();
  // 逐篇處理；
  for (const note of notes) {
    // 算出鍵；
    const key = keyOf(note);
    // 空鍵（undefined 或空字串）沒有意義，略過；
    if (!key) continue;
    // 取出既有陣列，沒有就用空陣列；`??` 只在左邊是 undefined 或 null 時取右邊；
    const list = groups.get(key) ?? [];
    // 加入這篇；
    list.push(note);
    // 寫回；
    groups.set(key, list);
  }
  // 回傳分組結果；
  return groups;
}

// 建立 wikilink 索引：鍵是檔名（去副檔名）與 frontmatter 標題，值是未編碼的站內路徑；
// 規則：同資料夾同檔名的 md／html 配對不算衝突（偏好 md）；檔名鍵優先於標題鍵；其餘「不同筆記同鍵」一律丟錯並列出每個衝突；
export function buildWikilinkIndex(notes: NoteEntry[]): Map<string, string> {
  // 檔名鍵分組：slug 的最後一段就是去掉副檔名的檔名；`.at(-1)` 取最後一個元素；
  const byName = groupBy(notes, (n) => n.slug.at(-1));
  // 標題鍵分組：標題前後空白去掉；
  const byTitle = groupBy(notes, (n) => n.title.trim());
  // 收集所有衝突，最後一次丟出，讓使用者一次看到全部；
  const conflicts: string[] = [];
  // 檢查一組分組：不同「邏輯筆記」超過一篇就是衝突；label 是訊息裡的種類說明；skip 是要略過的鍵（被檔名鍵蓋過的標題鍵）；
  const check = (groups: Map<string, NoteEntry[]>, label: string, skip: (key: string) => boolean) => {
    // 逐組檢查；
    for (const [key, list] of groups) {
      // 被更高優先序的鍵蓋過就不算衝突；
      if (skip(key)) continue;
      // 用 Set 去重取得不同邏輯筆記的數量；
      if (new Set(list.map(logicalId)).size > 1) {
        // 把每個衝突的 relPath 一行一個列出；
        conflicts.push(`  ${label}「${key}」：\n${list.map((n) => `    - ${n.relPath}`).join('\n')}`);
      }
    }
  };
  // 檔名鍵不會被誰蓋過；
  check(byName, '檔名', () => false);
  // 標題鍵若同時是某個檔名鍵，就由檔名鍵勝出，不檢查；
  check(byTitle, '標題', (key) => byName.has(key));
  // 有任何衝突就丟錯（繁體中文），不默默挑一篇；
  if (conflicts.length > 0) throw new Error(`發現 ${conflicts.length} 組 wikilink 鍵衝突（不同筆記共用同一個檔名或標題，無法決定連到哪一篇）：\n${conflicts.join('\n')}`);
  // 索引本體：鍵 → 網址；
  const index = new Map<string, string>();
  // 旁路表：鍵 → 筆記陣列；
  const registry = new Map<string, NoteEntry[]>();
  // 先放檔名鍵；
  for (const [key, list] of byName) {
    // md 優先排序；
    const sorted = preferMarkdown(list);
    // 網址取第一篇（偏好 md）；
    index.set(key, urlOf(sorted[0]));
    // 旁路表保留完整清單供種類與資料夾比對；
    registry.set(key, sorted);
  }
  // 再放標題鍵，已有檔名鍵的就不覆蓋；
  for (const [key, list] of byTitle) {
    // 檔名鍵優先；
    if (byName.has(key)) continue;
    // 同上；
    const sorted = preferMarkdown(list);
    // 寫入索引；
    index.set(key, urlOf(sorted[0]));
    // 寫入旁路表；
    registry.set(key, sorted);
  }
  // 把旁路表掛在這個索引上；
  registries.set(index, registry);
  // 回傳索引；
  return index;
}

// 與 assets/notes.js 的 slug() 逐字相同：notes.js 在瀏覽器執行期用它替標題加上 id，所以錨點必須用同一套規則；
export function headingSlug(text: string): string {
  // 先去頭尾空白並轉小寫；
  return (
    text
      .trim()
      .toLowerCase()
      // 移除網址（https 或 http 開頭，到空白為止）；
      .replace(/https?:\/\/\S+/g, '')
      // 連續的「不是 CJK 統一漢字（U+4E00 到 U+9FFF）、不是小寫英文、不是數字」字元換成單一 -；
      .replace(/[^一-鿿a-z0-9]+/g, '-')
      // 去掉頭尾的 -；
      .replace(/^-+|-+$/g, '') ||
    // 結果是空字串時（空字串是假值）退回 sec；
    'sec'
  );
}

// 把未編碼的站內路徑變成可放進 href 的字串：每一段各自 encodeURIComponent，再加上 basePath；
function toHref(url: string, basePath: string): string {
  // 收掉 basePath 結尾的斜線，避免出現 //；正規表示式 /\/+$/ 代表結尾連續的斜線；
  const base = basePath.replace(/\/+$/, '');
  // 依 / 切段並丟掉空段（開頭的 /），逐段編碼（空白、#、+、?、% 都會被正確處理），再用 / 接回；
  const path = url
    .split('/')
    .filter((segment) => segment !== '')
    .map(encodeURIComponent)
    .join('/');
  // base 加 / 加路徑；
  return `${base}/${path}`;
}

// 檢查筆記所在資料夾是否以 wanted（資料夾片段）結尾，用來做 [[資料夾/標題]] 的消歧；
function folderMatches(note: NoteEntry, wanted: string[]): boolean {
  // 筆記所在資料夾的片段：slug 去掉最後一段；
  const folder = note.slug.slice(0, -1);
  // 要求的片段比實際資料夾還多層就不可能符合；
  if (wanted.length > folder.length) return false;
  // 取資料夾的最後 wanted.length 段，逐段比對；every 要求全部相等；
  return folder.slice(folder.length - wanted.length).every((segment, i) => segment === wanted[i]);
}

// 在索引裡找一個鍵，回傳未編碼的站內路徑或 null；kind 指定種類，folder 是資料夾片段（可為空陣列）；
function lookup(index: Map<string, string>, key: string, kind: 'md' | 'html' | undefined, folder: string[]): string | null {
  // 取旁路表；
  const registry = registries.get(index);
  // 沒有旁路表（手寫的普通 Map）：只看 Map 的值，無法依種類或資料夾過濾；
  if (!registry) return index.get(key) ?? null;
  // 取這個鍵對應的筆記清單；
  let candidates = registry.get(key);
  // 沒有這個鍵；
  if (!candidates) return null;
  // 指定種類時只留該種類；
  if (kind) candidates = candidates.filter((n) => n.kind === kind);
  // 資料夾消歧：有任何候選符合資料夾就只留符合的；都不符合就忽略資料夾（唯一時不要求資料夾寫對）；
  if (folder.length > 0) {
    // 符合資料夾的候選；
    const matched = candidates.filter((n) => folderMatches(n, folder));
    // 有符合的才縮小範圍；
    if (matched.length > 0) candidates = matched;
  }
  // 清單已是 md 優先，取第一個；沒有候選就回 null；
  return candidates.length > 0 ? urlOf(candidates[0]) : null;
}

// 解析一段 wikilink 的內文（`[[` 與 `]]` 之間；若傳入帶括號的完整字串也接受）；找不到回傳 null；
export function resolveWikilink(raw: string, index: Map<string, string>, basePath = ''): { href: string; text: string } | null {
  // 去掉可能帶進來的外層 [[ ]]，並把轉義的 \| 還原成 |（Markdown 表格儲存格裡的寫法）；
  const inner = raw.replace(/^\[\[|\]\]$/g, '').replace(/\\\|/g, '|');
  // 第一個 | 之前是目標，之後是別名；indexOf 找不到回傳 -1；
  const pipe = inner.indexOf('|');
  // 目標：去頭尾空白；
  const target = (pipe === -1 ? inner : inner.slice(0, pipe)).trim();
  // 別名：去頭尾空白，空字串視為沒有別名（用 undefined 表示）；
  const alias = pipe === -1 ? undefined : inner.slice(pipe + 1).trim() || undefined;
  // 沒有目標（例如 [[ ]] 或 [[|x]]）無法解析；
  if (target === '') return null;
  // 找出要查的「路徑部分」與「段落」：先整串當鍵（檔名可能本身含 #，例如 C#），找不到才在第一個 # 切開；
  let pathPart = target;
  // 段落標題，預設沒有；
  let heading = '';
  // 整串能直接當鍵就不切；否則在第一個 # 切；
  if (!isKnownKey(index, target)) {
    // # 的位置；
    const hash = target.indexOf('#');
    // 有 # 才切；
    if (hash !== -1) {
      // # 之前是路徑部分；
      pathPart = target.slice(0, hash).trim();
      // # 之後是段落標題；
      heading = target.slice(hash + 1).trim();
    }
  }
  // 錨點字串：有段落就是 # 加 headingSlug；
  const fragment = heading ? `#${headingSlug(heading)}` : '';
  // 路徑部分為空代表同一頁的段落連結（[[#段落]]）；此時不需要索引，連結文字用別名或段落名；
  if (pathPart === '') return heading ? { href: fragment, text: alias ?? heading } : null;
  // 連結文字：別名優先，否則是「最後一個 / 之後」的標題原文；split 後 at(-1) 取最後一段；
  const text = alias ?? (pathPart.split('/').at(-1) as string).trim();
  // 依序嘗試的查詢方式：先整串原樣，再處理 .md／.html 副檔名；
  const attempts: { name: string; kind: 'md' | 'html' | undefined }[] = [{ name: pathPart, kind: undefined }];
  // 偵測結尾是 .md 或 .html（不分大小寫）；
  const ext = /\.(md|html)$/i.exec(pathPart);
  // 有副檔名就多一種「去掉副檔名並限定種類」的嘗試；
  if (ext) attempts.push({ name: pathPart.slice(0, ext.index), kind: ext[1].toLowerCase() as 'md' | 'html' });
  // 逐一嘗試；
  for (const { name, kind } of attempts) {
    // 把名稱依 / 切成片段，去掉空段；
    const parts = name.split('/').map((p) => p.trim()).filter((p) => p !== '');
    // 沒有片段就換下一種嘗試；
    if (parts.length === 0) continue;
    // 最後一段是標題或檔名，其前面是資料夾；
    const last = parts[parts.length - 1];
    // 資料夾片段；
    const folder = parts.slice(0, -1);
    // 先試整串（標題本身含 / 的情況），再試最後一段；
    for (const key of new Set([name.trim(), last])) {
      // 查詢；整串當鍵時沒有資料夾資訊，所以傳空陣列；
      const url = lookup(index, key, kind, key === last ? folder : []);
      // 找到就組出結果；
      if (url !== null) return { href: toHref(url, basePath) + fragment, text };
    }
  }
  // 全部都找不到；
  return null;
}

// 判斷一個字串是不是索引裡的鍵（只用來決定要不要在 # 切開）；
function isKnownKey(index: Map<string, string>, key: string): boolean {
  // Map 的 has 檢查鍵是否存在；
  return index.has(key);
}

// 在一段文字裡找所有 `[[…]]`；`!` 開頭的是嵌入語法，整個略過不處理；
// 正規表示式：可選的 !、兩個 [、一個以上不含 [ 或 ] 的字元（捕獲為 inner）、兩個 ]；g 旗標表示找全部；
const WIKILINK_RE = /(!?)\[\[([^[\]]+)\]\]/g;

// 一個找到的 wikilink：start 與 end 是在文字中的位置，full 是完整原文，inner 是括號內文字；
type Found = { start: number; end: number; full: string; inner: string };

// 掃描文字，回傳所有「不是嵌入」的 wikilink；
function findWikilinks(text: string): Found[] {
  // 結果陣列；
  const found: Found[] = [];
  // 正規表示式帶 g 旗標時有 lastIndex 狀態，每次掃描前歸零，避免受上一次影響；
  WIKILINK_RE.lastIndex = 0;
  // 目前這次比對結果；
  let m: RegExpExecArray | null;
  // exec 每次回傳下一個比對，沒有了回傳 null；
  while ((m = WIKILINK_RE.exec(text)) !== null) {
    // m[1] 是 ! 時代表 ![[…]] 嵌入，交給別的流程，這裡略過；
    if (m[1] === '!') continue;
    // 記錄位置與內容；
    found.push({ start: m.index, end: m.index + m[0].length, full: m[0], inner: m[2] });
  }
  // 回傳；
  return found;
}

// remark 外掛：只處理 mdast 的 text 節點，把裡面的 [[…]] 拆成「文字、連結、文字…」；
// 因為只看 text 節點，inlineCode 與 code 節點（內容在 value 欄位、不是 text 節點）天然不受影響；
// 限制：[[ ]] 若被 Markdown 行內語法（例如底線強調）切成不同節點，就不會被辨識；
export function remarkWikilink(opts: RemarkWikilinkOptions): (tree: Root) => void {
  // 外掛回傳「轉換函式」，unified 會把語法樹傳進來；
  return (tree) => {
    // visit 走訪每個節點；回呼收到節點、它在父節點 children 的位置、父節點；
    visit(tree, (node, position, parent) => {
      // 已經是連結的內容不再處理，避免巢狀 <a>；SKIP 代表不走進子孫；
      if (node.type === 'link' || node.type === 'linkReference') return SKIP;
      // 只處理 text 節點，且需要有父節點與位置才能替換；
      if (node.type !== 'text' || !parent || position === undefined) return undefined;
      // 這個文字節點裡的所有 wikilink；
      const found = findWikilinks(node.value);
      // 沒有就不動；
      if (found.length === 0) return undefined;
      // 新的子節點列表；
      const out: PhrasingContent[] = [];
      // 已處理到的位置；
      let last = 0;
      // 逐一處理；
      for (const f of found) {
        // 解析；
        const r = resolveWikilink(f.inner, opts.index, opts.basePath ?? '');
        // 找不到：回報，並且不切開（原文留在前後文字裡）；
        if (!r) {
          // 回報原始內文；
          opts.onMissing(f.inner);
          // 換下一個；
          continue;
        }
        // 把上一個位置到這個 wikilink 之前的文字補成 text 節點；
        if (f.start > last) out.push({ type: 'text', value: node.value.slice(last, f.start) } as Text);
        // 組出連結節點；data.hProperties 是 remark-rehype 的約定，用來替輸出的 <a> 加屬性；
        const link: Link = { type: 'link', url: r.href, title: null, children: [{ type: 'text', value: r.text }], data: { hProperties: { className: ['wikilink'] } } };
        // 加入；
        out.push(link);
        // 更新位置；
        last = f.end;
      }
      // 全部都找不到時不需要替換；
      if (out.length === 0) return undefined;
      // 補上最後一段文字；
      if (last < node.value.length) out.push({ type: 'text', value: node.value.slice(last) } as Text);
      // splice 把原本的一個 text 節點換成多個新節點；
      parent.children.splice(position, 1, ...out);
      // 回傳 [SKIP, 下一個位置]：不走進新節點，並從新節點之後繼續，避免重複處理；
      return [SKIP, position + out.length];
    });
  };
}

// 這些元素內的文字不重寫：script／style／textarea 的內容不是給人看的文字，a 內不可巢狀連結，code／pre 是程式碼，title 內不能放連結；
const SKIP_TAGS = new Set(['script', 'style', 'a', 'code', 'pre', 'textarea', 'title']);

// 還原最常見的 HTML 實體，讓 `R&amp;D` 這種寫法能還原成 `R&D` 去查索引；
function decodeBasicEntities(text: string): string {
  // 依序把幾個具名實體與數字實體換回字元；
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    // &amp; 必須最後換，否則 &amp;lt; 會被誤還原；
    .replace(/&amp;/g, '&');
}

// 跳脫放進雙引號屬性值的字串；
function escapeAttr(value: string): string {
  // 先換 &（避免重複跳脫），再換雙引號；
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// 判斷輸入是不是完整文件（有 doctype、html、head、body 標籤），決定用文件模式還是片段模式解析；
function looksLikeDocument(html: string): boolean {
  // /i 旗標不分大小寫；
  return /<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i.test(html);
}

// 重寫 HTML 文字節點中的 wikilink：連結文字保留完整的 [[…]] 原樣（舊版執行期腳本的外觀），class 是 wikilink；
// 作法：cheerio 的 parse5 解析器可記下每個文字節點在原始字串中的起訖位置，我們只把「含 [[ 的文字節點」那一段原始字串換掉，
// 其他位元組一律不動，所以 doctype、單引號屬性、自閉合標籤、空白都原樣保留（不經過重新序列化）；
export function rewriteWikilinksInHtml(html: string, index: Map<string, string>, onMissing: (raw: string) => void, basePath = ''): string {
  // 沒有 [[ 就完全不需要解析，原樣回傳；
  if (!html.includes('[[')) return html;
  // 解析：sourceCodeLocationInfo 要求 parse5 記錄位置；第三個參數 isDocument：完整文件為 true，片段為 false；
  const $ = load(html, { sourceCodeLocationInfo: true }, looksLikeDocument(html));
  // 待替換清單：起訖位置與新字串；
  const edits: { start: number; end: number; value: string }[] = [];
  // 遞迴走訪節點；AnyNode 是 domhandler 的節點聯集型別（文字、元素、註解…）；
  const walk = (nodes: AnyNode[]): void => {
    // 逐一處理同一層的節點；
    for (const node of nodes) {
      // 文字節點：domhandler 的 type 欄位為 'text'；
      if (node.type === 'text') {
        // 取得來源位置，沒有位置資訊（例如解析器自動補出的節點）就略過；
        const loc = node.sourceCodeLocation;
        // 沒有就換下一個；
        if (!loc) continue;
        // 原始字串中這個文字節點的內容（保留原本的實體寫法）；
        const raw = html.slice(loc.startOffset, loc.endOffset);
        // 沒有 [[ 的略過；
        if (!raw.includes('[[')) continue;
        // 找出裡面的 wikilink；
        const found = findWikilinks(raw);
        // 重組後的字串；
        let rebuilt = '';
        // 已處理位置；
        let last = 0;
        // 是否真的有換過；
        let changed = false;
        // 逐一處理；
        for (const f of found) {
          // 解析前先把 HTML 實體還原成真正的字元；
          const inner = decodeBasicEntities(f.inner);
          // 解析；
          const r = resolveWikilink(inner, index, basePath);
          // 找不到：回報、保留原文；
          if (!r) {
            // 回報還原後的內文；
            onMissing(inner);
            // 換下一個；
            continue;
          }
          // 補上前一段原始文字；
          rebuilt += raw.slice(last, f.start);
          // 連結文字是原始 [[…]]（已是合法的 HTML 原始碼，不需再跳脫）；
          rebuilt += `<a class="wikilink" href="${escapeAttr(r.href)}">${f.full}</a>`;
          // 更新位置；
          last = f.end;
          // 標記有改動；
          changed = true;
        }
        // 有改動才記錄替換；
        if (changed) edits.push({ start: loc.startOffset, end: loc.endOffset, value: rebuilt + raw.slice(last) });
        // 文字節點沒有子節點，處理下一個；
        continue;
      }
      // 元素節點：type 是 'tag'（一般）、'script'、'style'；有名稱且在略過清單內就不走進去；
      if ('name' in node && SKIP_TAGS.has(node.name.toLowerCase())) continue;
      // 有 children 就遞迴；
      if ('children' in node) walk(node.children);
    }
  };
  // 取得文件根節點（Document），它的 children 是最上層節點；
  const root = $.root().get(0);
  // 沒有根節點（不應發生）就原樣回傳；
  if (!root) return html;
  // 開始走訪；
  walk(root.children);
  // 從後面往前替換，前面的位置才不會因長度改變而偏移；
  let result = html;
  // 依起點由大到小排序；
  for (const e of edits.sort((a, b) => b.start - a.start)) {
    // 字串切片重組；
    result = result.slice(0, e.start) + e.value + result.slice(e.end);
  }
  // 回傳；
  return result;
}
