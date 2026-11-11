// 匯入 Node 內建的同步讀檔函式；預設共用集合要在建置時讀 assets/note-theme.css，檔案很小，同步讀取最單純；
import { readFileSync } from 'node:fs';
// 匯入 path 模組，用 resolve 與 join 組出主題樣式檔的路徑；
import * as path from 'node:path';
// 匯入 cheerio 的 load：用它的 htmlparser2 模式解析 html（只靠它取得每個節點在原始字串中的位置，不用它重新輸出 html）；
import { load } from 'cheerio';
// 型別匯入：只在編譯期使用 domhandler 的 Element 型別，`import type` 會在輸出時整行刪掉；
import type { Element } from 'domhandler';
// 匯入 postcss 的預設匯出，它負責把 CSS 解析成語法樹（AST）再輸出回文字；
import postcss from 'postcss';
// 型別匯入：postcss 的語法樹節點型別；
import type { AtRule, ChildNode, Container, Rule } from 'postcss';

// 一個頁面腳本：外部腳本有 src、內嵌腳本有 inline，兩者擇一；attrs 保留 <script> 上的全部屬性（type、defer、async、crossorigin、integrity…）；
// `?` 表示欄位可省略；`Record<string, string>` 表示鍵與值都是字串的物件；
export type PageScript = { src?: string; inline?: string; attrs: Record<string, string> };

// 無法解析的樣式區塊：css 是原文，media 是 <style media> 的值（沒有就省略），override 為 true 表示它是 data-override 區塊；
export type RawStyleBlock = { css: string; media?: string; override?: true };

// 解析一篇 html 筆記的結果；Task 11 用它在 React layout 裡重建頁面；
export type ParsedHtmlNote = {
  // 文件標題：<title> 文字，沒有就用第一個 h1，再沒有就是空字串；
  title: string;
  // <html lang> 的值，沒有就是空字串；
  lang: string;
  // <body> 標籤上的屬性（class、data-* 等）；
  bodyAttrs: Record<string, string>;
  // <body> 的內層 html，已移除 script、style 與樣式表連結，其餘標記逐字保留作者原文；
  bodyHtml: string;
  // 頁面獨有的 CSS：一般 <style> 抽掉共用規則後依文件順序串接，data-override 區塊整段保留並接在最後；
  // 只含 PostCSS 解析成功的區塊，所以串接後仍是合法 CSS；
  pageCss: string;
  // PostCSS 無法解析的 <style> 區塊，逐字保留、依文件順序；絕不併入 pageCss 也不包 @media（串接會吞掉後面的區塊），
  // Task 11 要把每一筆輸出成「各自獨立的 <style>」（瀏覽器對各個 style 元素分別容錯）；override 為 true 的是 data-override 區塊，要排在最後；
  rawStyleBlocks: RawStyleBlock[];
  // 非共用的 <link rel=stylesheet> 的 href（例如 Google Fonts）；
  pageStylesheets: string[];
  // 頁面自己的腳本（內嵌與外部），共用腳本已濾掉；head 的在前、body 的在後，各自維持文件順序；
  pageScripts: PageScript[];
};

// 共用腳本的檔名（layout 統一載入，不進 pageScripts）；Set 的 has 查詢比陣列 includes 直接；
const SHARED_SCRIPT_FILES = new Set(['notes.js', 'note-mask.js', 'note-quiz.js', 'toc.js', 'wikilink.js']);
// 共用樣式表的檔名（layout 統一供應，不進 pageStylesheets）；
const SHARED_STYLESHEET_FILES = new Set(['notes.css', 'note-theme.css', 'note-interactive.css']);

// 取出網址或路徑的「檔名」：去掉查詢字串與錨點，再取最後一段，並轉小寫方便比對；
export function fileNameOf(url: string): string {
  // 正規表示式 `[?#].*$` 比對從第一個 ? 或 # 到結尾的全部文字，替換成空字串；
  const clean = url.replace(/[?#].*$/, '');
  // 依正斜線或反斜線切開（Windows 路徑也考慮），pop 取最後一段；`?? ''` 在陣列為空時給空字串；
  return (clean.split(/[\\/]/).pop() ?? '').toLowerCase();
}

// 這個網址（或路徑）的檔名是不是共用腳本或共用樣式表（不論它放在哪個資料夾）；
// parseHtmlNote 會把這類引用濾掉、改由 layout 統一載入，所以複製本地附件時也不該把它們當成「找不到」或「要複製」；
export function isSharedAssetFile(url: string): boolean {
  // 取檔名（已轉小寫）；
  const name = fileNameOf(url);
  // 兩個集合任一個包含就是共用檔案；
  return SHARED_SCRIPT_FILES.has(name) || SHARED_STYLESHEET_FILES.has(name);
}

// 把一個選擇器正規化成比對用的鍵：空白收斂成單一空格，組合子與逗號兩側的空白拿掉，前後去空白；
// 引號字串內的內容不動（例如屬性選擇器的值）；
function normalizeSelector(raw: string): string {
  // 用「帶捕獲群組的 split」把字串切成「引號外、引號內、引號外…」；奇數索引就是引號字串；
  const parts = raw.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
  // map 逐段處理，再 join 接回去；
  return parts
    .map((part, index) =>
      // 奇數索引是引號字串，原樣保留；
      index % 2 === 1
        ? part
        : // 偶數索引：先把連續空白收成一個空格，再把 > + ~ , 兩側的空白拿掉（$1 是捕獲到的符號）；
          part.replace(/\s+/g, ' ').replace(/\s*([>+~,])\s*/g, '$1'),
    )
    .join('')
    .trim();
}

// 判斷一條規則是不是在 @keyframes 裡（那裡的 from、to、50% 不是選擇器）；
function insideKeyframes(rule: Rule): boolean {
  // 取父節點；
  const parent = rule.parent;
  // 父節點是 at-rule 且名稱以 keyframes 結尾（含 -webkit- 前綴版本）就是；`?.` 在 parent 是 undefined 時不會丟錯；
  return parent?.type === 'atrule' && /keyframes$/i.test((parent as AtRule).name);
}

// 把一個條件式 at-rule 正規化成比對用的字串：名稱小寫加一個空格再接參數；參數轉小寫、空白收斂，冒號與逗號兩側及括號內側的空白拿掉；
// 例如 `@media   (max-width: 860px)` 與 `@media(max-width:860px)` 都變成 `media (max-width:860px)`；
function normalizeCondition(name: string, params: string): string {
  // 先整理參數；每個 replace 的用途依序是：收斂空白、冒號與逗號兩側、左括號後與右括號前；
  const p = params.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s*([:,])\s*/g, '$1').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  // 名稱小寫，與參數以一個空格相接（沒有參數就不留尾端空格）；
  return `${name.toLowerCase()} ${p}`.trim();
}

// 由外而內的條件鏈換算成「有效條件字串」（R37）：
// 鏈中任何一層含 prefers-color-scheme 就回傳空字串（深色模式維持與上下文無關，由主題的自訂屬性處理）；否則用 ` > ` 接起來，空鏈也是空字串；
function effectiveCondition(chain: string[]): string {
  // 含深色模式條件：與上下文無關；
  if (chain.some((c) => c.includes('prefers-color-scheme'))) return '';
  // 其餘依序連接；
  return chain.join(' > ');
}

// 組出共用集合的鍵：頂層（條件為空）就是選擇器或自訂屬性名稱本身，條件式 at-rule 內是 `條件|選擇器`；
function keyOf(condition: string, item: string): string {
  // 空條件回傳原字串；
  return condition === '' ? item : `${condition}|${item}`;
}

// 收集共用主題的「選擇器」與「:root 內宣告的自訂屬性名稱」，放進同一個 Set（選擇器不會以 -- 開頭，所以不會混淆）；
// 規則（R24、R37）：選擇器正規化後收錄；頂層規則的鍵就是選擇器，@media／@supports 內的規則鍵是 `條件|選擇器`（prefers-color-scheme 例外：維持頂層鍵）；
// :root 本身不收；:root 區塊內的 --name 依同樣方式收錄（淺色與深色都算頂層）；
export function sharedSelectors(themeCss: string): Set<string> {
  // 準備結果集合；
  const result = new Set<string>();
  // 解析主題樣式成語法樹；
  const root = postcss.parse(themeCss);
  // walkRules 走訪整棵樹的每一條規則（含 @media 裡的）；
  root.walkRules((rule) => {
    // @keyframes 裡的影格不是選擇器，跳過；
    if (insideKeyframes(rule)) return;
    // 由內往外收集祖先 at-rule 的條件（unshift 放到陣列最前面，得到由外而內的順序）；
    const chain: string[] = [];
    // 往上走：父節點是 at-rule 就記錄，直到不是為止；
    for (let parent = rule.parent; parent && parent.type === 'atrule'; parent = parent.parent) {
      // 取出 at-rule；
      const at = parent as AtRule;
      // 記錄正規化的條件；
      chain.unshift(normalizeCondition(at.name, at.params));
    }
    // 這條規則的有效條件；
    const condition = effectiveCondition(chain);
    // 記錄這條規則的選擇器清單有沒有 :root；
    let hasRoot = false;
    // rule.selectors 是 postcss 依逗號拆好的選擇器陣列（括號內的逗號不會被拆）；
    for (const selector of rule.selectors) {
      // 正規化；
      const normalized = normalizeSelector(selector);
      // :root 只用來找自訂屬性，不當選擇器收錄；
      if (normalized === ':root') hasRoot = true;
      // 其餘非空的選擇器收錄（帶條件）；
      else if (normalized !== '') {
        // 選擇器鍵；
        const selectorKey = keyOf(condition, normalized);
        result.add(selectorKey);
        // 宣告資訊：`選擇器鍵{` 是「這個選擇器有宣告資訊」的標記，`選擇器鍵{屬性` 是它宣告過的屬性（小寫、不含自訂屬性），
        // 修剪時據此只移除共用樣式「也宣告了」的屬性，頁面額外加的（例如 body 的 padding）保留；
        result.add(`${selectorKey}{`);
        rule.each((child) => {
          // 只看這條規則自己的宣告（巢狀規則不算），自訂屬性不算；
          if (child.type === 'decl' && !child.prop.startsWith('--')) result.add(`${selectorKey}{${child.prop.toLowerCase()}`);
        });
      }
    }
    // :root 規則：把裡面宣告的自訂屬性名稱（--bg 之類）也收進來；
    if (hasRoot) {
      // walkDecls 走訪規則內每一個宣告；
      rule.walkDecls((decl) => {
        // 自訂屬性一律以兩個連字號開頭；
        if (decl.prop.startsWith('--')) result.add(keyOf(condition, decl.prop));
      });
    }
  });
  // 回傳集合；
  return result;
}

// 修剪時的統計：被整條移除的規則數、被丟掉的選擇器（已正規化）、被丟掉的共用自訂屬性名稱（依文件順序）；
export type PruneTally = { rulesRemoved: number; selectorsRemoved: string[]; customPropsRemoved: string[]; declsRemoved: number };

// 修剪選項：keepComments 為 true 時保留作者的 CSS 註解與倖存規則的原始格式（預設 false，與網站建置的行為相同）；
// media 是 <style media="…"> 的屬性值：這個區塊整體處於該媒體條件下，規則要以 `media <條件>|選擇器` 比對（空或 all 視為沒有）；
export type PruneOptions = { keepComments?: boolean; media?: string };

// 修剪過程共用的內部狀態：是否保留註解、統計物件（會被就地累加），以及目前所在的條件鏈（進出 @media／@supports 時推入與彈出）；
type PruneCtx = { keepComments: boolean; tally: PruneTally; chain: string[] };

// 把容器內「第一個倖存節點」的前置空白還原成「原本第一個節點」的前置空白（保留註解模式用）：
// 原本第一個節點被移除後，後面的節點可能帶著「同一行接續」的空白，會讓輸出縮在大括號後面或多出空行；
function restoreFirstBefore(container: Container, firstOriginal: ChildNode | undefined): void {
  // 沒有原本第一個節點、或容器已空，什麼都不用做；
  if (!firstOriginal || !container.nodes || container.nodes.length === 0) return;
  // 第一個倖存節點就是原本第一個節點，空白本來就對；
  const first = container.nodes[0];
  // 不同節點才需要還原；raws.before 是 postcss 記錄的「節點前面的原始空白」，型別是 string | undefined；
  if (first !== firstOriginal && typeof firstOriginal.raws.before === 'string') first.raws.before = firstOriginal.raws.before;
}

// 丟掉「孤兒註解」（保留註解模式用）：區段標題註解（獨占一行的註解）底下的規則全被移除了，標題就沒有意義；
// 行尾註解（與前一條規則同一行）跟著前一條規則走：規則被移除，它也一起移除；`/*! … */` 授權註解一律保留；
function dropOrphanComments(nodes: ChildNode[]): void {
  // 目前區段的標題註解與底下的規則；
  let header: ChildNode | null = null;
  let members: ChildNode[] = [];
  // 前一個非註解節點，行尾註解要看它的存亡；
  let prev: ChildNode | null = null;
  // 結算一個區段：標題底下至少有一條規則、而且全被移除（移除後 parent 變成 undefined）才丟標題；
  const flush = (): void => {
    // 條件成立就移除標題；
    if (header && members.length > 0 && members.every((m) => m.parent === undefined)) header.remove();
  };
  // 依原本順序走過每個節點；
  for (const node of nodes) {
    // 註解節點；
    if (node.type === 'comment') {
      // 授權註解（內文以 ! 開頭）永遠保留，也不當成區段標題；
      if (node.text.startsWith('!')) continue;
      // 獨占一行：第一個節點，或前面的空白含換行；
      const standalone = node === nodes[0] || (node.raws.before ?? '').includes('\n');
      // 行尾註解：前一條規則被移除就一起移除；
      if (!standalone && prev) {
        // 前一條已被移除；
        if (prev.parent === undefined) node.remove();
        // 處理下一個節點；
        continue;
      }
      // 結算上一個區段，開新區段；
      flush();
      header = node;
      members = [];
      // 處理下一個節點；
      continue;
    }
    // 非註解節點屬於目前區段；
    members.push(node);
    prev = node;
  }
  // 結算最後一個區段；
  flush();
}

// 在容器（根節點或 @media／@supports）內做修剪；遞迴呼叫自己處理巢狀的條件式 at-rule；
function pruneContainer(container: Container, shared: Set<string>, ctx: PruneCtx): void {
  // 先複製一份子節點陣列再迭代，因為迴圈裡會移除節點，直接迭代原陣列會跳過元素；
  const original = [...(container.nodes as ChildNode[])];
  // 逐個節點處理；
  for (const node of original) {
    // 只處理規則與 at-rule，宣告與其他節點原樣保留；
    if (node.type === 'rule') {
      // 修剪這條規則；
      pruneRule(node, shared, ctx);
    } else if (node.type === 'atrule') {
      // 只有 @media 與 @supports 遞迴；@keyframes、@font-face、@import 等一律原樣保留；
      if (/^(media|supports)$/i.test(node.name) && node.nodes) {
        // 進入條件：把這層的條件推進條件鏈，遞迴修剪內層，再彈出（push／pop 是陣列尾端的加入與移除）；
        ctx.chain.push(normalizeCondition(node.name, node.params));
        pruneContainer(node, shared, ctx);
        ctx.chain.pop();
        // 內層清空了，整個 at-rule 一起移除；
        if (node.nodes.length === 0) node.remove();
      }
    }
  }
  // 保留註解模式：丟孤兒註解，並把第一個倖存節點的前置空白還原成原本第一個節點的；
  if (ctx.keepComments) {
    // 孤兒註解；
    dropOrphanComments(original);
    // 還原前置空白；
    restoreFirstBefore(container, original[0]);
  }
}

// 修剪單一規則：丟掉共用選擇器；:root 規則則丟掉共用的自訂屬性宣告；
function pruneRule(rule: Rule, shared: Set<string>, ctx: PruneCtx): void {
  // 取出選擇器清單；
  const selectors = rule.selectors;
  // 目前所在的有效條件（頂層或深色模式為空字串，其餘是條件鏈）；
  const condition = effectiveCondition(ctx.chain);
  // 判斷一個選擇器是不是「在同一個條件下」被共用樣式定義；
  const isShared = (selector: string): boolean => shared.has(keyOf(condition, normalizeSelector(selector)));
  // 只保留「不在共用集合內」的選擇器；
  const kept = selectors.filter((selector) => !isShared(selector));
  // 每個選擇器都是共用的，整條規則移除；
  if (kept.length === 0) {
    // 每個選擇器在共用樣式裡的鍵；
    const keys = selectors.map((s) => keyOf(condition, normalizeSelector(s)));
    // 宣告層級修剪：共用集合對這些選擇器都有「宣告資訊」（`鍵{` 標記）才做；舊式手寫集合沒有標記，維持整條移除；
    // 只移除「每個選擇器在共用樣式裡都宣告過」的屬性；共用樣式沒宣告的（頁面額外加的，例如 body 的 padding）保留，否則頁面版面會壞掉；
    if (keys.every((k) => shared.has(`${k}{`))) {
      // 原本的第一個子節點，用來還原縮排；
      const firstOriginal = (rule.nodes as ChildNode[])[0];
      // 複製一份子節點再迭代，因為會移除節點；
      for (const child of [...(rule.nodes as ChildNode[])]) {
        // 一般屬性（自訂屬性一律保留）且每個選擇器都被共用樣式宣告過：移除；
        if (child.type === 'decl' && !child.prop.startsWith('--') && keys.every((k) => shared.has(`${k}{${child.prop.toLowerCase()}`))) {
          // 統計後移除；
          ctx.tally.declsRemoved += 1;
          child.remove();
        }
      }
      // 還有宣告（或其他非註解內容）留下：保留這條規則，只是變瘦了；
      if (!rule.nodes.every((child) => child.type === 'comment')) {
        // 保留註解模式：第一個倖存宣告換到原本第一個宣告所在的那一行；
        if (ctx.keepComments) restoreFirstBefore(rule, firstOriginal);
        // 處理完畢；
        return;
      }
    }
    // 統計：一條規則、全部選擇器；
    ctx.tally.rulesRemoved += 1;
    ctx.tally.selectorsRemoved.push(...selectors.map(normalizeSelector));
    // 從語法樹拿掉；
    rule.remove();
    // 這條已不存在，不用再處理；
    return;
  }
  // 有些選擇器被丟掉：統計被丟掉的，並把規則的選擇器改寫成剩下的；
  if (kept.length !== selectors.length) {
    // 被丟掉的選擇器（在共用集合內的）；
    ctx.tally.selectorsRemoved.push(...selectors.filter((s) => isShared(s)).map(normalizeSelector));
    // 改寫；
    rule.selector = kept.map((s) => s.trim()).join(', ');
  }
  // 這條規則含 :root 嗎？只有 :root 要處理自訂屬性；
  if (kept.some((selector) => normalizeSelector(selector) === ':root')) {
    // 原本的第一個子節點，用來還原縮排；
    const firstOriginal = (rule.nodes as ChildNode[])[0];
    // 複製一份子節點再迭代，因為會移除節點；
    for (const child of [...(rule.nodes as ChildNode[])]) {
      // 宣告的屬性名是共用的自訂屬性就移除；頁面獨有的（例如 --brick）留下；
      if (child.type === 'decl' && child.prop.startsWith('--') && shared.has(keyOf(condition, child.prop))) {
        // 統計被丟掉的自訂屬性名稱；
        ctx.tally.customPropsRemoved.push(child.prop);
        // 移除；
        child.remove();
      }
    }
    // 沒有任何宣告或規則留下（只剩註解也算空）：整條 :root 移除；預設模式註解早已被移除，所以等同「nodes 為空」；
    if (rule.nodes.every((child) => child.type === 'comment')) {
      // 統計；
      ctx.tally.rulesRemoved += 1;
      ctx.tally.selectorsRemoved.push(':root');
      // 移除；
      rule.remove();
    } else if (ctx.keepComments) {
      // 保留註解模式：第一個倖存宣告若原本與別的宣告同行，換到原本第一個宣告所在的那一行；
      restoreFirstBefore(rule, firstOriginal);
    }
  }
}

// 依共用集合修剪 CSS，回傳頁面獨有的 CSS（R24）：
//   選擇器清單只丟共用的選擇器，全部共用才丟整條規則；:root 規則只移除共用自訂屬性，空了才丟；
//   @media／@supports 遞迴處理、清空就移除；@keyframes、@font-face、@import 等其他 at-rule 原樣保留；
//   預設註解一律移除（規則內外都是），輸出較小也不會留下孤兒註解；options.keepComments 為 true 時改為保留註解與原格式（遷移 html 檔用）；
//   輸入無法解析時（例如少一個右大括號）本函式原樣回傳、不丟錯；它「不是」瀏覽器式的容錯：
//   呼叫端若要把多個區塊串接，不可使用這個回傳值，要改用 pruneOrNull 偵測失敗並把壞區塊分開處理（R27）；
export function pruneSharedRules(css: string, shared: Set<string>, options: PruneOptions = {}): string {
  // 修剪成功就回傳結果；`??` 在左邊是 null（解析失敗）時改回傳原文；
  return pruneSharedRulesDetailed(css, shared, options)?.css ?? css;
}

// 修剪並回傳統計；PostCSS 無法解析時回傳 null；
// keepComments 為 false（預設）時輸出會去掉前後空白；為 true 時輸出保留前後的原始空白，方便原地取代 <style> 的內容；
// 回傳的 empty 為 true 代表修剪後除了註解以外沒有任何節點（呼叫端可據此移除整個 <style>）；
export function pruneSharedRulesDetailed(css: string, shared: Set<string>, options: PruneOptions = {}): { css: string; tally: PruneTally; empty: boolean } | null {
  // 先宣告變數，因為 try 區塊內的 const 在區塊外看不到；
  let root: ReturnType<typeof postcss.parse>;
  // try/catch：postcss.parse 遇到語法錯誤會丟 CssSyntaxError；
  try {
    // 解析成語法樹；
    root = postcss.parse(css);
  } catch {
    // 無法解析就回傳 null；
    return null;
  }
  // 是否保留註解；
  const keepComments = options.keepComments === true;
  // 預設模式先把所有註解移除；walkComments 走訪每個註解節點；
  if (!keepComments) {
    root.walkComments((comment) => {
      // 從語法樹拿掉；
      comment.remove();
    });
  }
  // 統計物件，修剪過程就地累加；
  const tally: PruneTally = { rulesRemoved: 0, selectorsRemoved: [], customPropsRemoved: [], declsRemoved: 0 };
  // 修剪整棵樹；
  // 初始條件鏈：<style media="print"> 這種區塊整體處於該媒體條件下；空字串與 all 視為沒有條件；
  const media = (options.media ?? '').trim();
  const chain = media === '' || media.toLowerCase() === 'all' ? [] : [normalizeCondition('media', media)];
  // 修剪；
  pruneContainer(root, shared, { keepComments, tally, chain });
  // 轉回文字；預設模式去掉前後空白（被移除的節點會在前面留下空行），保留註解模式則逐字保留；
  const text = root.toString();
  // 回傳；
  return { css: keepComments ? text : text.trim(), tally, empty: (root.nodes ?? []).every((node) => node.type === 'comment') };
}

// 修剪 CSS；PostCSS 無法解析時回傳 null（讓呼叫端知道這個區塊不能與別的區塊串接）；
function pruneOrNull(css: string, shared: Set<string>, media?: string): string | null {
  // 轉呼叫詳細版，只取文字部分；`?.` 在結果是 null 時整串變成 undefined，再用 ?? 轉成 null；
  return pruneSharedRulesDetailed(css, shared, { media })?.css ?? null;
}

// 判斷一段 CSS 能不能被 PostCSS 解析（覆寫區塊不修剪，但仍要確認它串接後不會破壞別的區塊）；
function canParseCss(css: string): boolean {
  // try/catch：解析失敗會丟錯；
  try {
    // 只要解析不丟錯就是合法；
    postcss.parse(css);
    // 合法；
    return true;
  } catch {
    // 不合法；
    return false;
  }
}

// 取多份 CSS 的聯集：每份各自用 sharedSelectors 收集選擇器與 :root 自訂屬性名稱，再合併成同一個 Set；
// `...` 展開運算子把每個 Set 的元素攤開，new Set 去重；
export function sharedSelectorsOf(cssTexts: string[]): Set<string> {
  // 準備結果集合；
  const union = new Set<string>();
  // 逐份處理；
  for (const css of cssTexts) {
    // 把這份的鍵全部加進聯集；
    for (const key of sharedSelectors(css)) union.add(key);
  }
  // 回傳；
  return union;
}

// 快取預設共用集合，避免每篇筆記都重新讀檔與解析；鍵是「解析後的根目錄路徑」，換 NOTES_ROOT 就不會用到舊結果；
const defaultSharedCache = new Map<string, Set<string>>();

// 取得預設共用集合：讀 `$NOTES_ROOT/assets/note-theme.css` 與 `assets/notes.css` 兩個檔案的聯集
// （兩者都由 layout／已遷移頁面載入，notes.css 負責 .toc 與 .term 規則；NOTES_ROOT 預設是 site/ 的上一層，與其他腳本一致）；
// 任一檔案不存在會丟錯（readFileSync 的 ENOENT），聯集沒有任何選擇器也丟錯：
// 這是建置設定問題，要大聲失敗而不是默默不修剪；
export function loadDefaultSharedSelectors(): Set<string> {
  // 筆記根目錄；`??` 只在左邊是 undefined 或 null 時取右邊；
  const root = path.resolve(process.cwd(), process.env.NOTES_ROOT ?? '..');
  // 以根目錄查快取；
  const cached = defaultSharedCache.get(root);
  // 命中就直接回傳；
  if (cached) return cached;
  // 讀兩個樣式檔並取聯集；
  const set = sharedSelectorsOf(
    ['note-theme.css', 'notes.css'].map((name) => readFileSync(path.join(root, 'assets', name), 'utf8')),
  );
  // 沒有任何選擇器代表樣式檔是空的或壞掉，丟錯而不是默默什麼都不修剪；
  if (![...set].some((key) => !key.startsWith('--'))) {
    throw new Error(`共用樣式沒有任何 selector（${root}/assets 的 note-theme.css 與 notes.css 都是空的？）`);
  }
  // 存進快取；
  defaultSharedCache.set(root, set);
  // 回傳；
  return set;
}

// 取一段 CSS 值裡第一個顏色（#hex、rgb()/rgba()、hsl()/hsla()），回傳 sRGB 的 [r,g,b]（0–255）；找不到或格式不認得回傳 null；
function firstColor(value: string): [number, number, number] | null {
  // 依出現位置找第一個顏色字面值；alternation（|）三種寫法，flag i 不分大小寫；
  const m = /#([0-9a-f]{3,8})\b|rgba?\(([^)]*)\)|hsla?\(([^)]*)\)/i.exec(value);
  // 沒有就是 null；
  if (!m) return null;
  // 十六進位：3、4 位數每位重複一次，取前 6 位；
  if (m[1] !== undefined) {
    // 3 或 4 位數展開成 6 或 8 位；
    const hex = m[1].length <= 4 ? m[1].replace(/./g, (c) => c + c) : m[1];
    // 長度不合法（5、7 位）視為不認得；
    if (hex.length !== 6 && hex.length !== 8) return null;
    // 轉成三個數字；parseInt 的第二個參數 16 代表十六進位；
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  // rgb()：以逗號、空白或斜線切開，取前三個數（百分比換成 0–255）；
  if (m[2] !== undefined) {
    // 切開；
    const parts = m[2].split(/[\s,/]+/).filter((s) => s !== '').slice(0, 3);
    // 轉數字；
    const nums = parts.map((s) => (s.endsWith('%') ? (parseFloat(s) / 100) * 255 : parseFloat(s)));
    // 三個都是有限數才算；
    return nums.length === 3 && nums.every((n) => Number.isFinite(n)) ? [nums[0], nums[1], nums[2]] : null;
  }
  // hsl()：色相、飽和度、亮度換成 rgb；
  const hsl = (m[3] ?? '').split(/[\s,/]+/).filter((s) => s !== '').slice(0, 3).map((s) => parseFloat(s));
  // 三個數都有效才算；
  if (hsl.length !== 3 || !hsl.every((n) => Number.isFinite(n))) return null;
  // 標準 HSL 轉 RGB 公式；
  const h = (((hsl[0] % 360) + 360) % 360) / 360;
  const s = Math.min(Math.max(hsl[1] / 100, 0), 1);
  const l = Math.min(Math.max(hsl[2] / 100, 0), 1);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  // 色相轉單一通道；
  const channel = (t0: number): number => {
    // 把 t 夾回 0–1；
    const t = t0 < 0 ? t0 + 1 : t0 > 1 ? t0 - 1 : t0;
    // 三段線性；
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  // 回傳 0–255；
  return [channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255];
}

// sRGB 相對亮度（WCAG 公式，0 黑到 1 白）；
function luminance([r, g, b]: [number, number, number]): number {
  // 每個通道先換成線性值；
  const lin = (v: number): number => {
    // 0–255 正規化到 0–1；
    const c = v / 255;
    // sRGB 的伽瑪還原；
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  // 加權總和；
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// 頁面是否「自帶深色配色」（12 頁抽樣檢查的失敗類別）：頂層（不在 @media 內）的 body／html 背景是深色，或 color-scheme 為 dark。
// 這種頁面的卡片與文字色都是為深色底設計的，若抽掉 body 的背景與文字色換成主題的淺色，就會出現深色字配深色卡片，所以不能抽換共用樣式；
// 背景值可以是字面顏色、漸層（取第一個顏色）或 var(--名稱[, 備用值])（用頂層 :root／html 的自訂屬性解析）；亮度低於 0.18 視為深色；無法解析的 CSS 回傳 false；
export function hasOwnDarkPalette(css: string): boolean {
  // 解析；
  let root: ReturnType<typeof postcss.parse>;
  // 失敗就當作不是；
  try {
    // postcss.parse 遇到語法錯誤會丟錯；
    root = postcss.parse(css);
  } catch {
    // 不丟出去；
    return false;
  }
  // 頂層 :root／html 的自訂屬性表，後面的覆蓋前面的；
  const vars = new Map<string, string>();
  // 是否有 color-scheme: dark；
  let schemeDark = false;
  // 只看直接在根底下的規則（不進 @media）；
  for (const node of root.nodes) {
    // 非規則略過；
    if (node.type !== 'rule') continue;
    // 選擇器清單；
    const sels = node.selectors.map((s) => s.trim());
    // :root 或 html 規則：收自訂屬性；
    if (sels.some((s) => s === ':root' || s === 'html')) {
      // 走訪宣告；
      node.each((child) => {
        // 自訂屬性收進表；
        if (child.type === 'decl' && child.prop.startsWith('--')) vars.set(child.prop, child.value);
      });
    }
    // 任一頂層 :root／html／body 規則宣告 color-scheme: dark；
    if (sels.some((s) => s === ':root' || s === 'html' || s === 'body')) {
      // 檢查宣告；
      node.each((child) => {
        // color-scheme 值含 dark 且不含 light（light dark 是跟隨系統，不算）；
        if (child.type === 'decl' && child.prop.toLowerCase() === 'color-scheme' && /\bdark\b/i.test(child.value) && !/\blight\b/i.test(child.value)) schemeDark = true;
      });
    }
  }
  // 有 color-scheme: dark 就算；
  if (schemeDark) return true;
  // 解析 var()：最多展開幾層，避免循環；
  const resolve = (value: string, depth = 0): string => {
    // 找第一個 var(--x 或 var(--x, 備用)；
    const m = /var\(\s*(--[\w-]+)\s*(?:,([^)]*))?\)/.exec(value);
    // 沒有 var 或太深就原樣回傳；
    if (!m || depth > 5) return value;
    // 取表裡的值，沒有就用備用值；
    const replacement = vars.get(m[1]) ?? (m[2] ?? '').trim();
    // 換掉並繼續展開；
    return resolve(value.replace(m[0], replacement), depth + 1);
  };
  // 檢查 body／html 的背景與文字色：背景深「而且」文字色淺才算自帶深色配色（背景深、文字也深，代表內容在自己的淺色卡片上，例如樣板頁的紫底白卡，不算）；
  let bgDark = false;
  let fgLight = false;
  for (const node of root.nodes) {
    // 只看規則；
    if (node.type !== 'rule') continue;
    // 選擇器含 body 或 html；
    if (!node.selectors.some((s) => s.trim() === 'body' || s.trim() === 'html')) continue;
    // 逐一檢查宣告；
    node.each((child) => {
      // 只看宣告；
      if (child.type !== 'decl') return;
      // 背景：解出顏色，亮度低於門檻就是深色（後面的宣告覆蓋前面的）；
      if (/^background(-color)?$/i.test(child.prop)) {
        const color = firstColor(resolve(child.value));
        if (color) bgDark = luminance(color) < 0.18;
      }
      // 文字色：亮度高於門檻就是淺色；
      if (child.prop.toLowerCase() === 'color') {
        const color = firstColor(resolve(child.value));
        if (color) fgLight = luminance(color) > 0.4;
      }
    });
  }
  // 兩者同時成立才算；
  return bgDark && fgLight;
}

// 找出開始標籤結尾的 `>` 位置：從 start 往後掃，略過引號內的 `>`（屬性值可以含 >）；找不到就回傳最後一個字元的位置；
export function openTagEnd(source: string, start: number): number {
  // 目前所在的引號字元，null 表示不在引號內；
  let quote: string | null = null;
  // 從標籤開頭的下一個字元開始掃；
  for (let i = start + 1; i < source.length; i++) {
    // 取得字元；
    const ch = source[i];
    // 在引號內：遇到相同引號才結束；
    if (quote) {
      // 結束引號；
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      // 進入引號；
      quote = ch;
    } else if (ch === '>') {
      // 引號外的 > 就是開始標籤的結尾；
      return i;
    }
  }
  // 沒有 >（殘缺標籤）：視為到文件結尾；
  return source.length - 1;
}

// 一段要從原文切掉的區間：[start, end)，含 start 不含 end；
type Range = [number, number];

// 取出一個元素在原文中的區間（含結尾標籤）；htmlparser2 的 endIndex 指向最後一個字元，所以要加一；
function rangeOf(el: Element, length: number): Range {
  // startIndex、endIndex 型別是 number | null（有開啟索引才有值），null 時退成 0 與文件長度；
  const start = el.startIndex ?? 0;
  // 沒關閉的元素 endIndex 可能等於 length，用 Math.min 夾住；
  const end = Math.min((el.endIndex ?? length - 1) + 1, length);
  // 回傳區間；
  return [start, end];
}

// 從 [from, to) 的原文中切掉多個區間，其餘逐字保留；區間可以亂序或重疊；
function sliceWithout(source: string, from: number, to: number, ranges: Range[]): string {
  // 只取與 [from, to) 有交集的區間，並依起點排序；`sort` 的比較函式回傳負數表示 a 排前面；
  const sorted = ranges.filter(([s, e]) => e > from && s < to).sort((a, b) => a[0] - b[0]);
  // 累積輸出的片段；
  let out = '';
  // 目前已處理到的位置；
  let cursor = from;
  // 依序處理每個區間；
  for (const [start, end] of sorted) {
    // 區間前面還有沒輸出的原文就先補上；`Math.max` 避免區間起點落在 from 之前；
    if (start > cursor) out += source.slice(cursor, start);
    // 跳過這個區間；用 Math.max 處理重疊區間（cursor 不能倒退）；
    cursor = Math.max(cursor, end);
  }
  // 補上最後一段；
  if (cursor < to) out += source.slice(cursor, to);
  // 回傳；
  return out;
}

// 取一個元素底下所有文字節點的原文（script 與 style 的內容在 htmlparser2 裡是文字節點，不解碼實體，所以是逐字的）；
function rawText(el: Element): string {
  // 逐個子節點，文字節點取 data，其他略過；
  return el.children.map((child) => (child.type === 'text' ? (child as unknown as { data: string }).data : '')).join('');
}

// 解析一篇 html 筆記；shared 是共用選擇器集合，不傳就讀預設的（note-theme.css 與 notes.css 的聯集）；
// 設計：用 cheerio 的 htmlparser2 模式取得「每個節點在原文的位置」，bodyHtml 與腳本內容直接從原始字串切出，
// 所以作者的實體、CRLF、自閉合標籤、屬性引號與 <pre> 空白都不會被解析器改寫；殘缺輸入也不會丟錯；
export function parseHtmlNote(html: string, shared?: Set<string>): ParsedHtmlNote {
  // 去掉開頭的 BOM（﻿），以免它混進 bodyHtml；之後所有索引都相對於這份 source；
  const source = html.replace(/^﻿/, '');
  // 載入文件：xml 選項的物件會切換成 htmlparser2，xmlMode:false 維持 html 語意，withStartIndices／withEndIndices 讓節點帶位置；
  const $ = load(source, { xml: { xmlMode: false, withStartIndices: true, withEndIndices: true } });

  // 標題：先找第一個不在 <svg> 裡的 <title>（SVG 的 <title> 是圖說）；
  const titleEl = $('title')
    .toArray()
    .find((el) => $(el).closest('svg').length === 0);
  // 文字收斂空白；沒有 <title> 或內容是空的就退回第一個 h1；
  const title =
    (titleEl ? $(titleEl).text() : '').replace(/\s+/g, ' ').trim() ||
    $('h1').first().text().replace(/\s+/g, ' ').trim();
  // lang 取自 <html lang>，沒有就空字串；
  const lang = $('html').first().attr('lang') ?? '';

  // 收集要從 bodyHtml 切掉的區間：所有 script、style、以及 rel 含 stylesheet 的 link；
  const removals: Range[] = [];
  // 非共用樣式表的 href；
  const pageStylesheets: string[] = [];
  // 樣式區塊的文字；一般的放這裡，data-override 的另外放；
  const normalCss: string[] = [];
  // data-override 區塊的文字，最後才接上；
  const overrideCss: string[] = [];
  // 無法解析的區塊（依文件順序）；
  const rawStyleBlocks: RawStyleBlock[] = [];
  // 頁面腳本；
  const pageScripts: PageScript[] = [];
  // 真正使用的共用集合（沒傳就讀預設）；`??` 在 shared 是 undefined 時才呼叫載入函式；
  // 頁面自帶深色配色時不抽換任何共用規則（空集合 = 全部原樣保留，只剩註解被丟掉），否則深色卡片上會出現深色字；
  const ownDark = $('style').toArray().some((el) => !('data-override' in el.attribs) && hasOwnDarkPalette(rawText(el)));
  const sharedSet = ownDark ? new Set<string>() : (shared ?? loadDefaultSharedSelectors());

  // 走訪所有 script、style、link（選擇器清單用逗號，結果依文件順序排列）；
  for (const el of $('script, style, link').toArray()) {
    // 記下這個元素的區間，之後從 bodyHtml 切掉（link 只有樣式表才切）；
    const range = rangeOf(el, source.length);
    // 依標籤名分流；
    if (el.name === 'script') {
      // 切掉；
      removals.push(range);
      // 拿到全部屬性的複本（值都是字串）；展開運算子 `...` 複製物件；
      const attrs: Record<string, string> = { ...el.attribs };
      // 有 src 就是外部腳本；
      if (attrs.src !== undefined) {
        // 共用腳本由 layout 載入，濾掉；
        if (SHARED_SCRIPT_FILES.has(fileNameOf(attrs.src))) continue;
        // 其餘外部腳本保留 src 與全部屬性；
        pageScripts.push({ src: attrs.src, attrs });
      } else {
        // 內嵌腳本：內容逐字保留，絕不刪改（R23）；
        pageScripts.push({ inline: rawText(el), attrs });
      }
    } else if (el.name === 'style') {
      // 切掉；
      removals.push(range);
      // 取樣式文字；
      const css = rawText(el);
      // 是不是 data-override 區塊；
      const isOverride = 'data-override' in el.attribs;
      // media 屬性（沒有就是 undefined）；
      const media = el.attribs.media;
      // 一般區塊先修剪（失敗得 null），覆寫區塊不修剪、只檢查能不能解析（能解析就沿用原文）；
      const processed = isOverride ? (canParseCss(css) ? css : null) : pruneOrNull(css, sharedSet, media);
      // 無法解析：絕不串接也不包 @media（R27），逐字放進 rawStyleBlocks 交給呼叫端各自輸出成獨立 <style>；
      if (processed === null) {
        // 組出區塊物件；`...(條件 ? {…} : {})` 是「有值才加欄位」的展開寫法，避免出現值為 undefined 的欄位；
        rawStyleBlocks.push({
          css,
          ...(media !== undefined && media.trim() !== '' ? { media } : {}),
          ...(isOverride ? { override: true as const } : {}),
        });
        // 這個區塊處理完了；
        continue;
      }
      // 覆寫區塊整段保留不動、晚點接在最後讓它在層疊中勝出；一般區塊空結果就不放；
      if (isOverride) overrideCss.push(wrapMedia(processed, media));
      else if (processed.trim() !== '') normalCss.push(wrapMedia(processed, media));
    } else if (el.name === 'link') {
      // rel 可以有多個值（以空白分隔），其中有 stylesheet 才算樣式表；
      const isSheet = (el.attribs.rel ?? '').toLowerCase().split(/\s+/).includes('stylesheet');
      // 不是樣式表的 link（icon、preconnect 等）不動；
      if (!isSheet) continue;
      // 樣式表連結：從 bodyHtml 切掉（head 的連結本來就不在 body 範圍內，切了也無妨）；
      removals.push(range);
      // 取 href；
      const href = el.attribs.href;
      // 沒有 href，或是共用樣式表（layout 供應）就不收；
      if (href === undefined || SHARED_STYLESHEET_FILES.has(fileNameOf(href))) continue;
      // 其餘收進 pageStylesheets；
      pageStylesheets.push(href);
    }
  }

  // 一般樣式依文件順序串接，覆寫區塊接在最後；join 用換行分隔；
  const pageCss = [...normalCss, ...overrideCss].join('\n');

  // 找 <body>；
  const body = $('body').first().get(0) as Element | undefined;
  // bodyHtml 與 bodyAttrs 依有沒有 body 分兩條路；
  let bodyHtml: string;
  // 預設沒有 body 屬性；
  let bodyAttrs: Record<string, string> = {};
  // 有 <body> 的文件；
  if (body) {
    // 屬性複本；
    bodyAttrs = { ...body.attribs };
    // 內層從開始標籤的 > 之後算起；
    const start = openTagEnd(source, body.startIndex ?? 0) + 1;
    // body 元素的結尾位置（不含）；
    const [, elementEnd] = rangeOf(body, source.length);
    // 去掉結尾標籤：正常是 </body>；缺 </body> 時 htmlparser2 會在 </html> 一併關閉，所以也要認 </html>；
    const closing = /<\/(?:body|html)\s*>$/i.exec(source.slice(start, elementEnd));
    // 內層結束位置：有結尾標籤就退到它前面，否則取到元素結尾；
    const end = closing ? elementEnd - closing[0].length : elementEnd;
    // 逐字切出內層並扣掉 script、style、樣式表連結；
    bodyHtml = sliceWithout(source, start, end, removals);
  } else {
    // 沒有 <body>（片段或只有 head 的文件）：整份扣掉 script、style，再扣掉 head、doctype 與 html 外殼；
    const extra: Range[] = [...removals];
    // head 整個切掉（它的 title、meta 不是內容）；
    $('head').each((_, el) => {
      // 加進區間；
      extra.push(rangeOf(el, source.length));
    });
    // doctype 等指令節點：它們是根節點的子節點，type 是 'directive'；
    $.root()
      .contents()
      .each((_, node) => {
        // 只處理指令節點；
        if (node.type === 'directive') {
          // 位置以 domhandler 的 Node 欄位讀取；
          extra.push([node.startIndex ?? 0, (node.endIndex ?? 0) + 1]);
        }
      });
    // html 外殼：只切開始標籤與結尾標籤，內層保留；
    $('html').each((_, el) => {
      // 開始標籤區間；
      const [elStart, elEnd] = rangeOf(el, source.length);
      // 加入開始標籤；
      extra.push([elStart, openTagEnd(source, elStart) + 1]);
      // 若元素以 </html> 結尾也切掉；
      const tail = /<\/html\s*>$/i.exec(source.slice(elStart, elEnd));
      // 有才加；
      if (tail) extra.push([elEnd - tail[0].length, elEnd]);
    });
    // 整份切出；
    bodyHtml = sliceWithout(source, 0, source.length, extra);
  }

  // 組合結果；
  return { title, lang, bodyAttrs, bodyHtml, pageCss, rawStyleBlocks, pageStylesheets, pageScripts };
}

// 有 media 屬性的 <style> 只在該媒體條件下生效，合併進 pageCss 時要包回 @media，否則會變成永遠生效；
// media 缺少、空字串或 all 時不用包；
function wrapMedia(css: string, media: string | undefined): string {
  // 沒有內容或不需要包就原樣回傳；
  if (css.trim() === '' || media === undefined || media.trim() === '' || media.trim().toLowerCase() === 'all') return css;
  // 樣板字串組出 @media 區塊；
  return `@media ${media.trim()}{\n${css}\n}`;
}
