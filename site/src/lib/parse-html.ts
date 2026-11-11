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
  pageCss: string;
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
function fileNameOf(url: string): string {
  // 正規表示式 `[?#].*$` 比對從第一個 ? 或 # 到結尾的全部文字，替換成空字串；
  const clean = url.replace(/[?#].*$/, '');
  // 依正斜線或反斜線切開（Windows 路徑也考慮），pop 取最後一段；`?? ''` 在陣列為空時給空字串；
  return (clean.split(/[\\/]/).pop() ?? '').toLowerCase();
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

// 收集共用主題的「選擇器」與「:root 內宣告的自訂屬性名稱」，放進同一個 Set（選擇器不會以 -- 開頭，所以不會混淆）；
// 規則（R24）：選擇器正規化後收錄、遞迴 @media／@supports；:root 本身不收；:root 區塊（淺色與深色）內的 --name 收錄；
export function sharedSelectors(themeCss: string): Set<string> {
  // 準備結果集合；
  const result = new Set<string>();
  // 解析主題樣式成語法樹；
  const root = postcss.parse(themeCss);
  // walkRules 走訪整棵樹的每一條規則（含 @media 裡的）；
  root.walkRules((rule) => {
    // @keyframes 裡的影格不是選擇器，跳過；
    if (insideKeyframes(rule)) return;
    // 記錄這條規則的選擇器清單有沒有 :root；
    let hasRoot = false;
    // rule.selectors 是 postcss 依逗號拆好的選擇器陣列（括號內的逗號不會被拆）；
    for (const selector of rule.selectors) {
      // 正規化；
      const normalized = normalizeSelector(selector);
      // :root 只用來找自訂屬性，不當選擇器收錄；
      if (normalized === ':root') hasRoot = true;
      // 其餘非空的選擇器收錄；
      else if (normalized !== '') result.add(normalized);
    }
    // :root 規則：把裡面宣告的自訂屬性名稱（--bg 之類）也收進來；
    if (hasRoot) {
      // walkDecls 走訪規則內每一個宣告；
      rule.walkDecls((decl) => {
        // 自訂屬性一律以兩個連字號開頭；
        if (decl.prop.startsWith('--')) result.add(decl.prop);
      });
    }
  });
  // 回傳集合；
  return result;
}

// 在容器（根節點或 @media／@supports）內做修剪；遞迴呼叫自己處理巢狀的條件式 at-rule；
function pruneContainer(container: Container, shared: Set<string>): void {
  // 先複製一份子節點陣列再迭代，因為迴圈裡會移除節點，直接迭代原陣列會跳過元素；
  for (const node of [...(container.nodes as ChildNode[])]) {
    // 只處理規則與 at-rule，宣告與其他節點原樣保留；
    if (node.type === 'rule') {
      // 修剪這條規則；
      pruneRule(node, shared);
    } else if (node.type === 'atrule') {
      // 只有 @media 與 @supports 遞迴；@keyframes、@font-face、@import 等一律原樣保留；
      if (/^(media|supports)$/i.test(node.name) && node.nodes) {
        // 遞迴修剪內層；
        pruneContainer(node, shared);
        // 內層清空了，整個 at-rule 一起移除；
        if (node.nodes.length === 0) node.remove();
      }
    }
  }
}

// 修剪單一規則：丟掉共用選擇器；:root 規則則丟掉共用的自訂屬性宣告；
function pruneRule(rule: Rule, shared: Set<string>): void {
  // 取出選擇器清單；
  const selectors = rule.selectors;
  // 只保留「不在共用集合內」的選擇器；
  const kept = selectors.filter((selector) => !shared.has(normalizeSelector(selector)));
  // 每個選擇器都是共用的，整條規則移除；
  if (kept.length === 0) {
    // 從語法樹拿掉；
    rule.remove();
    // 這條已不存在，不用再處理；
    return;
  }
  // 有些選擇器被丟掉：把規則的選擇器改寫成剩下的；
  if (kept.length !== selectors.length) rule.selector = kept.map((s) => s.trim()).join(', ');
  // 這條規則含 :root 嗎？只有 :root 要處理自訂屬性；
  if (kept.some((selector) => normalizeSelector(selector) === ':root')) {
    // 複製一份子節點再迭代，因為會移除節點；
    for (const child of [...(rule.nodes as ChildNode[])]) {
      // 宣告的屬性名是共用的自訂屬性就移除；頁面獨有的（例如 --brick）留下；
      if (child.type === 'decl' && child.prop.startsWith('--') && shared.has(child.prop)) child.remove();
    }
    // 宣告全被抽掉，規則已空，整條移除；
    if (rule.nodes.length === 0) rule.remove();
  }
}

// 依共用集合修剪 CSS，回傳頁面獨有的 CSS（R24）：
//   選擇器清單只丟共用的選擇器，全部共用才丟整條規則；:root 規則只移除共用自訂屬性，空了才丟；
//   @media／@supports 遞迴處理、清空就移除；@keyframes、@font-face、@import 等其他 at-rule 原樣保留；
//   註解一律移除（規則內外都是），輸出較小也不會留下孤兒註解；
//   輸入無法解析時（例如少一個右大括號）原樣回傳，不丟錯，交給瀏覽器自己的容錯處理；
export function pruneSharedRules(css: string, shared: Set<string>): string {
  // 先宣告變數，因為 try 區塊內的 const 在區塊外看不到；
  let root: ReturnType<typeof postcss.parse>;
  // try/catch：postcss.parse 遇到語法錯誤會丟 CssSyntaxError；
  try {
    // 解析成語法樹；
    root = postcss.parse(css);
  } catch {
    // 無法解析就原樣交還；
    return css;
  }
  // 先把所有註解移除；walkComments 走訪每個註解節點；
  root.walkComments((comment) => {
    // 從語法樹拿掉；
    comment.remove();
  });
  // 修剪整棵樹；
  pruneContainer(root, shared);
  // 轉回文字並去掉前後空白（被移除的節點會在前面留下空行）；
  return root.toString().trim();
}

// 快取預設共用集合，避免每篇筆記都重新讀檔與解析；`| undefined` 表示尚未載入；
let defaultShared: Set<string> | undefined;

// 取得預設共用集合：讀 `$NOTES_ROOT/assets/note-theme.css`（NOTES_ROOT 預設是 site/ 的上一層，與其他腳本一致）；
// 檔案不存在會丟錯：主題缺失是建置設定問題，要大聲失敗而不是默默不修剪；
export function loadDefaultSharedSelectors(): Set<string> {
  // 第一次才讀；
  if (!defaultShared) {
    // 筆記根目錄；`??` 只在左邊是 undefined 或 null 時取右邊；
    const root = path.resolve(process.cwd(), process.env.NOTES_ROOT ?? '..');
    // 讀主題樣式並收集；
    defaultShared = sharedSelectors(readFileSync(path.join(root, 'assets', 'note-theme.css'), 'utf8'));
  }
  // 回傳快取；
  return defaultShared;
}

// 找出開始標籤結尾的 `>` 位置：從 start 往後掃，略過引號內的 `>`（屬性值可以含 >）；找不到就回傳最後一個字元的位置；
function openTagEnd(source: string, start: number): number {
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

// 解析一篇 html 筆記；shared 是共用選擇器集合，不傳就讀預設的 assets/note-theme.css；
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
  // 頁面腳本；
  const pageScripts: PageScript[] = [];
  // 真正使用的共用集合（沒傳就讀預設）；`??` 在 shared 是 undefined 時才呼叫載入函式；
  const sharedSet = shared ?? loadDefaultSharedSelectors();

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
      let css = rawText(el);
      // data-override：整段保留不動，晚點接在最後讓它在層疊中勝出；
      if ('data-override' in el.attribs) {
        // 覆寫區塊同樣要處理 media 屬性，下面統一包裝；
        css = wrapMedia(css, el.attribs.media);
        // 放進覆寫清單；
        overrideCss.push(css);
      } else {
        // 一般區塊：抽掉共用規則；空結果就不放；
        const pruned = wrapMedia(pruneSharedRules(css, sharedSet), el.attribs.media);
        // 非空才收；
        if (pruned.trim() !== '') normalCss.push(pruned);
      }
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
  return { title, lang, bodyAttrs, bodyHtml, pageCss, pageStylesheets, pageScripts };
}

// 有 media 屬性的 <style> 只在該媒體條件下生效，合併進 pageCss 時要包回 @media，否則會變成永遠生效；
// media 缺少、空字串或 all 時不用包；
function wrapMedia(css: string, media: string | undefined): string {
  // 沒有內容或不需要包就原樣回傳；
  if (css.trim() === '' || media === undefined || media.trim() === '' || media.trim().toLowerCase() === 'all') return css;
  // 樣板字串組出 @media 區塊；
  return `@media ${media.trim()}{\n${css}\n}`;
}
