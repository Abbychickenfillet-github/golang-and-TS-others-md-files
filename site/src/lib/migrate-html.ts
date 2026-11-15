// 匯入 cheerio 的 load：只用它的 htmlparser2 模式取得每個節點在「原始字串」中的位置，絕不用它重新輸出 html（R23）；
import { load } from 'cheerio';
// 型別匯入：domhandler 的 Element 型別，只在編譯期使用；
import type { Element } from 'domhandler';
// 匯入 parse-html 的工具：共用集合載入、檔名擷取、開始標籤結尾位置、帶統計的修剪函式；
import { hasOwnDarkPalette } from './dark-palette';
import { fileNameOf, loadDefaultSharedSelectors, openTagEnd, pruneSharedRulesDetailed } from './parse-html';

// 遷移統計；linksAdded 與 scriptsAdded 放實際寫進檔案的 href 或 src（例如 ../assets/note-theme.css）；
export type MigrateStats = {
  // 所有 <style> 內容（不含標籤）的 UTF-8 位元組數：遷移前與遷移後；
  styleBytesBefore: number;
  styleBytesAfter: number;
  // 被整條移除的規則數（含整條被清空的 :root）；
  rulesRemoved: number;
  // 被移除的共用自訂屬性個數；
  customPropsRemoved: number;
  // 被移除的選擇器與自訂屬性名稱（依文件順序，可能重複，報告用）；
  removedSelectors: string[];
  removedCustomProps: string[];
  // 新增的連結 href 與腳本 src；
  linksAdded: string[];
  scriptsAdded: string[];
  // 不是筆記頁面時，說明跳過的原因；
  skipped?: string;
};

// 遷移結果：新的 html、有沒有變更、統計；
export type MigrateResult = { html: string; changed: boolean; stats: MigrateStats };

// 要補的共用檔案：樣式表（依載入順序，主題在前）與腳本（notes.js 在前、note-mask.js 在後；R6：不補 note-quiz.js 與 wikilink.js）；
const THEME_CSS = 'note-theme.css';
const NOTES_CSS = 'notes.css';
const SCRIPT_FILES = ['notes.js', 'note-mask.js'];

// 位元組順序記號（BOM，U+FEFF）：用 String.fromCharCode(0xfeff) 產生，不在原始碼裡放看不見的字面字元；
const BOM = String.fromCharCode(0xfeff);

// 一個編輯：把原文的 [start, end) 換成 text；start 等於 end 就是純插入；
type Edit = { start: number; end: number; text: string };

// 算出從某個檔案（相對於筆記根目錄）到根目錄 assets/ 的相對路徑前綴：
// 根目錄的檔案是 `assets/`，每多一層資料夾就多一個 `../`；
export function assetsRelPath(fileRelPath: string): string {
  // 統一成正斜線、切開，並丟掉空段與 `.`（開頭的 ./ 不算一層）；
  const parts = fileRelPath.replace(/\\/g, '/').split('/').filter((part) => part !== '' && part !== '.');
  // 最後一段是檔名，其餘是資料夾；Math.max 避免空輸入得到負數；
  const depth = Math.max(0, parts.length - 1);
  // 字串的 repeat 重複 depth 次 `../`，再接 assets/；
  return `${'../'.repeat(depth)}assets/`;
}

// 找出檔案的主要換行符號：CRLF 比單獨 LF 多就用 CRLF，否則 LF（沒有換行也是 LF）；
function dominantEol(source: string): string {
  // `\r\n` 的個數；match 沒找到會回傳 null，所以用 `?? []`；
  const crlf = (source.match(/\r\n/g) ?? []).length;
  // 前面不是 \r 的 \n 個數（負向後顧 `(?<!\r)`）；
  const lf = (source.match(/(?<!\r)\n/g) ?? []).length;
  // 比較；
  return crlf > lf ? '\r\n' : '\n';
}

// 在位置 pos 插入多個標籤：pos 在「只有空白的行首之後」就整行插入（沿用該行縮排、每個標籤各占一行），否則在 pos 原地接續插入；
function insertTags(source: string, pos: number, tags: string[], eol: string): Edit {
  // pos 所在行的行首；pos 為 0 時直接是 0（lastIndexOf 的 fromIndex 為負會被夾成 0，容易誤判）；
  const lineStart = pos === 0 ? 0 : source.lastIndexOf('\n', pos - 1) + 1;
  // 行首到 pos 之間的文字（縮排）；
  const prefix = source.slice(lineStart, pos);
  // 只有空白（空字串也算）：整行插入；
  if (/^[ \t]*$/.test(prefix)) return { start: lineStart, end: lineStart, text: tags.map((tag) => `${prefix}${tag}${eol}`).join('') };
  // 否則同一行接續插入，標籤之間不加換行；
  return { start: pos, end: pos, text: tags.join('') };
}

// 套用多個編輯：依起點排序（同起點時純插入排在取代之前，再依傳入順序），其餘位元組逐字保留；
function applyEdits(source: string, edits: Edit[]): string {
  // 帶原始順序一起排序，確保同起點同長度的編輯順序穩定；
  const ordered = edits
    .map((edit, index) => ({ edit, index }))
    .sort((a, b) => a.edit.start - b.edit.start || a.edit.end - a.edit.start - (b.edit.end - b.edit.start) || a.index - b.index);
  // 輸出片段與目前處理到的位置；
  let out = '';
  let cursor = 0;
  // 依序處理；
  for (const { edit } of ordered) {
    // 編輯重疊代表程式有誤；丟錯讓外層退回原文，不輸出壞檔；
    if (edit.start < cursor) throw new Error('內部錯誤：編輯區間重疊');
    // 補上編輯前面沒動到的原文；
    out += source.slice(cursor, edit.start);
    // 接上新文字；
    out += edit.text;
    // 游標跳到編輯結尾；
    cursor = edit.end;
  }
  // 補上最後一段原文；
  return out + source.slice(cursor);
}

// 一個閉合的 <style> 在原文中的位置：element 為 [start, end)，內容為 [innerStart, innerEnd)；
type StyleSpan = { el: Element; start: number; end: number; innerStart: number; innerEnd: number };

// 找出所有「有位置資訊且有結尾標籤」的 <style>；沒有結尾標籤的殘缺區塊不處理（原樣保留）；
function collectStyles($: ReturnType<typeof load>, source: string): StyleSpan[] {
  // 結果；
  const spans: StyleSpan[] = [];
  // $('style') 依文件順序走訪；
  for (const el of $('style').toArray()) {
    // 位置資訊（withStartIndices／withEndIndices 提供）；
    const start = el.startIndex;
    const last = el.endIndex;
    // 缺位置就跳過；
    if (start === null || start === undefined || last === null || last === undefined) continue;
    // 元素的結尾（不含）；endIndex 指向最後一個字元；
    const end = last + 1;
    // 必須以 </style> 結尾才算閉合；
    const closing = /<\/style\s*>$/i.exec(source.slice(start, end));
    // 殘缺（沒有結尾標籤）的區塊略過；
    if (!closing) continue;
    // 內容範圍：開始標籤的 > 之後到結尾標籤之前；
    const innerStart = openTagEnd(source, start) + 1;
    const innerEnd = end - closing[0].length;
    // 範圍不合理（例如標籤殘缺）就略過；
    if (innerEnd < innerStart) continue;
    // 收進結果；
    spans.push({ el, start, end, innerStart, innerEnd });
  }
  // 回傳；
  return spans;
}

// 取一個元素的區間 [start, end)；位置缺少時回傳 null；
function spanOf(el: Element): [number, number] | null {
  // 位置資訊；
  const start = el.startIndex;
  const last = el.endIndex;
  // 缺就是 null；
  if (start === null || start === undefined || last === null || last === undefined) return null;
  // endIndex 指向最後一個字元，所以 +1；
  return [start, last + 1];
}

// 沒有任何改動時的回傳值；
function unchanged(html: string, stats: MigrateStats): MigrateResult {
  // changed 為 false，html 原樣；
  return { html, changed: false, stats };
}

// 新建一份空的統計物件；
function emptyStats(): MigrateStats {
  // 全部歸零；
  return { styleBytesBefore: 0, styleBytesAfter: 0, rulesRemoved: 0, customPropsRemoved: 0, removedSelectors: [], removedCustomProps: [], linksAdded: [], scriptsAdded: [] };
}

// 把一篇 html 筆記遷移成使用共用主題與共用腳本：
//   1. 每個 <style> 用與網站建置相同的規則（pruneSharedRules，R24）修剪：抽掉與 note-theme.css／notes.css 重複的規則，保留作者註解與原格式；
//      <style data-override>、無法解析的 <style> 逐位元組不動；修剪後沒有規則的 <style> 連標籤與它占的那一行一起移除；
//   2. 在 <head> 的第一個 <style> 之前補 note-theme.css 與 notes.css 的 <link>（已有同檔名的就不補），讓頁面自己的規則在層疊中勝出；
//   3. 在 </body> 之前補 notes.js 與 note-mask.js 的 <script src>（已有同檔名的就不補；R6：不補 note-quiz.js 與 wikilink.js）；
//   4. 一律用「原文位置」編輯，不重新序列化文件：body 標記、內嵌腳本（R23）、屬性、實體、換行（CRLF／LF）、BOM 都原樣保留；
//   5. 已連結 note-theme.css 的頁面（已遷移）與沒有 <html> 的片段原樣回傳；整個函式不丟錯，出任何意外就原樣回傳並說明；
export function migrateHtml(html: string, relPathToAssets: string, shared?: Set<string>): MigrateResult {
  // 統計物件，先建好，任何出口都能回傳；
  const stats = emptyStats();
  // try/catch：保證不丟錯，意外時原樣回傳；
  try {
    // 去掉 BOM（最後再原樣接回），之後所有位置都相對於 source；
    const hasBom = html.charCodeAt(0) === 0xfeff;
    const source = hasBom ? html.slice(1) : html;
    // 載入文件：xml 選項物件切換成 htmlparser2，withStartIndices／withEndIndices 讓每個節點帶原文位置；
    const $ = load(source, { xml: { xmlMode: false, withStartIndices: true, withEndIndices: true } });

    // 不是完整的 html 文件（沒有 <html>）：跳過；
    if ($('html').length === 0) {
      // 說明原因；
      stats.skipped = '不是完整的 html 筆記（沒有 <html> 標籤）';
      // 原樣回傳；
      return unchanged(html, stats);
    }

    // 共用集合：沒傳就讀預設（note-theme.css 與 notes.css 的聯集）；
    const sharedSet = shared ?? loadDefaultSharedSelectors();
    // 所有閉合的 <style>；
    const styles = collectStyles($, source);
    // 頁面自帶深色配色：卡片與文字色是為深色底設計的，換成主題的淺色底會看不清楚，跳過不遷移，交給人工處理；
    if (styles.some((span) => !('data-override' in span.el.attribs) && hasOwnDarkPalette(source.slice(span.innerStart, span.innerEnd)))) {
      // 說明原因；
      stats.skipped = '頁面自帶深色配色（body 背景是深色），套用淺色主題會讓文字看不清楚，請人工處理';
      // 原樣回傳；
      return unchanged(html, stats);
    }
    // 先把「修剪前」的位元組算好；Buffer.byteLength 以 UTF-8 計（中文一字 3 位元組）；
    for (const span of styles) stats.styleBytesBefore += Buffer.byteLength(source.slice(span.innerStart, span.innerEnd), 'utf8');

    // 取得所有 <link rel=stylesheet> 與 <script src> 的檔名，用來判斷「已存在」；
    const sheetLinks = $('link')
      .toArray()
      .filter((el) => (el.attribs.rel ?? '').toLowerCase().split(/\s+/).includes('stylesheet') && el.attribs.href !== undefined);
    // 已有 note-theme.css 的連結：視為已遷移，原樣回傳（冪等）；
    if (sheetLinks.some((el) => fileNameOf(el.attribs.href) === THEME_CSS)) {
      // 前後位元組相同；
      stats.styleBytesAfter = stats.styleBytesBefore;
      // 原樣；
      return unchanged(html, stats);
    }
    // 已有的腳本檔名集合（小寫）；
    const scriptNames = new Set(
      $('script')
        .toArray()
        .filter((el) => el.attribs.src !== undefined)
        .map((el) => fileNameOf(el.attribs.src)),
    );

    // 收集所有編輯；
    const edits: Edit[] = [];
    // 主要換行符號，插入的文字都用它；
    const eol = dominantEol(source);

    // ---- 1. 修剪每個 <style> ----
    for (const span of styles) {
      // 這個區塊的內容原文；
      const css = source.slice(span.innerStart, span.innerEnd);
      // 內容的位元組數；
      const bytes = Buffer.byteLength(css, 'utf8');
      // 覆寫區塊與非 CSS 的 type（例如樣板）一律原封不動；`in` 檢查屬性是否存在（值可為空字串）；
      const type = (span.el.attribs.type ?? '').trim().toLowerCase();
      if ('data-override' in span.el.attribs || (type !== '' && type !== 'text/css')) {
        // 後位元組等於前位元組；
        stats.styleBytesAfter += bytes;
        // 下一個區塊；
        continue;
      }
      // 修剪並保留註解；失敗（null）代表無法解析，原樣保留且不丟錯；
      const result = pruneSharedRulesDetailed(css, sharedSet, { keepComments: true, media: span.el.attribs.media });
      // 無法解析，或沒有任何改動：原樣；
      if (result === null || result.css === css) {
        // 後位元組等於前位元組；
        stats.styleBytesAfter += bytes;
        // 下一個區塊；
        continue;
      }
      // 累計統計；
      stats.rulesRemoved += result.tally.rulesRemoved;
      stats.customPropsRemoved += result.tally.customPropsRemoved.length;
      stats.removedSelectors.push(...result.tally.selectorsRemoved);
      stats.removedCustomProps.push(...result.tally.customPropsRemoved);
      // 修剪後除了註解什麼都沒有：整個 <style> 移除；
      if (result.empty) {
        // 元素所在行的行首與行首到元素之間的文字；
        const lineStart = span.start === 0 ? 0 : source.lastIndexOf('\n', span.start - 1) + 1;
        const before = source.slice(lineStart, span.start);
        // 元素結尾到該行行尾的文字（CRLF 檔案會含 \r）；
        const nl = source.indexOf('\n', span.end);
        const after = source.slice(span.end, nl === -1 ? source.length : nl);
        // 元素獨占一行（前後都只有空白）：連同整行（含縮排與換行）一起移除，才不會留下空行；否則只移除元素本身；
        const ownLine = /^[ \t]*$/.test(before) && /^[ \t\r]*$/.test(after);
        // 區間；
        const start = ownLine ? lineStart : span.start;
        const end = ownLine ? (nl === -1 ? source.length : nl + 1) : span.end;
        // 加入編輯：換成空字串；
        edits.push({ start, end, text: '' });
        // 後位元組為 0（整個移除）；
        continue;
      }
      // 還有倖存規則：只換掉 <style> 的內容，標籤與屬性不動；
      edits.push({ start: span.innerStart, end: span.innerEnd, text: result.css });
      // 後位元組；
      stats.styleBytesAfter += Buffer.byteLength(result.css, 'utf8');
    }

    // ---- 2. 補共用樣式表的 <link> ----
    // 已有 notes.css 的連結（任何位置）；
    const notesLinkEl = sheetLinks.find((el) => fileNameOf(el.attribs.href) === NOTES_CSS);
    // 要補的 href：主題一定補（走到這裡代表沒有）；notes.css 沒有才補；
    const hrefs = [`${relPathToAssets}${THEME_CSS}`, ...(notesLinkEl ? [] : [`${relPathToAssets}${NOTES_CSS}`])];
    // 插入位置的候選：head 內第一個 <style>、head 內既有的 notes.css 連結，取最前面的一個；
    const headStarts: number[] = [];
    // head 內的所有 <style>（包含之後會被移除的、以及缺結尾標籤而不在 styles 裡的；位置一律以原文為準）；
    for (const el of $('style').toArray()) {
      // 位置；
      const range = spanOf(el);
      // 在 head 內才算；
      if (range && $(el).closest('head').length > 0) headStarts.push(range[0]);
    }
    // 既有的 notes.css 連結在 head 內也納入；
    if (notesLinkEl && $(notesLinkEl).closest('head').length > 0) {
      // 位置；
      const range = spanOf(notesLinkEl);
      // 加入；
      if (range) headStarts.push(range[0]);
    }
    // 決定插入點；
    let linkPos: number;
    // 有候選：取最前面的；
    if (headStarts.length > 0) {
      // Math.min 搭配展開運算子取最小值；
      linkPos = Math.min(...headStarts);
    } else {
      // 沒有候選：優先放在 </head> 之前；
      const head = $('head').first().get(0) as Element | undefined;
      // head 的區間；
      const headRange = head ? spanOf(head) : null;
      // 結尾標籤；
      const headClose = head && headRange ? /<\/head\s*>$/i.exec(source.slice(headRange[0], headRange[1])) : null;
      // body 的開始位置；
      const body = $('body').first().get(0) as Element | undefined;
      const bodyRange = body ? spanOf(body) : null;
      // html 元素；
      const htmlEl = $('html').first().get(0) as Element;
      // html 的開始標籤；
      const htmlRange = spanOf(htmlEl);
      // 有 </head>：放在它前面；
      if (headRange && headClose) linkPos = headRange[1] - headClose[0].length;
      // 沒有 head 但有 body：放在 <body 前面（瀏覽器會自動建立 head）；
      else if (bodyRange) linkPos = bodyRange[0];
      // 什麼都沒有：放在 <html> 開始標籤之後（若標籤後面緊接換行，放到下一行行首）；
      else {
        // 開始標籤結尾之後；
        const afterTag = htmlRange ? openTagEnd(source, htmlRange[0]) + 1 : 0;
        // 後面是行尾（空白加換行）就移到下一行行首；
        const rest = /^[ \t]*\r?\n/.exec(source.slice(afterTag));
        // 位置；
        linkPos = rest ? afterTag + rest[0].length : afterTag;
      }
    }
    // 組出標籤並加入編輯；
    edits.push(insertTags(source, linkPos, hrefs.map((href) => `<link rel="stylesheet" href="${href}">`), eol));
    // 記錄新增的連結；
    stats.linksAdded.push(...hrefs);

    // ---- 3. 補共用腳本的 <script src> ----
    // 要補的 src：已有同檔名的就不補；
    const srcs = SCRIPT_FILES.filter((name) => !scriptNames.has(name)).map((name) => `${relPathToAssets}${name}`);
    // 有要補的才處理；
    if (srcs.length > 0) {
      // 找 </body>：body 元素尾端的結尾標籤；
      const body = $('body').first().get(0) as Element | undefined;
      const bodyRange = body ? spanOf(body) : null;
      const bodyClose = body && bodyRange ? /<\/body\s*>$/i.exec(source.slice(bodyRange[0], bodyRange[1])) : null;
      // 找 </html> 作為退路；
      const htmlEl = $('html').first().get(0) as Element;
      const htmlRange = spanOf(htmlEl);
      const htmlClose = htmlRange ? /<\/html\s*>$/i.exec(source.slice(htmlRange[0], htmlRange[1])) : null;
      // 標籤文字；
      const tags = srcs.map((src) => `<script src="${src}"></script>`);
      // 有 </body>：插在它前面；
      if (bodyRange && bodyClose) edits.push(insertTags(source, bodyRange[1] - bodyClose[0].length, tags, eol));
      // 沒有 </body> 但有 </html>：插在 </html> 前面；
      else if (htmlRange && htmlClose) edits.push(insertTags(source, htmlRange[1] - htmlClose[0].length, tags, eol));
      // 都沒有：附加在文件結尾；結尾已有換行就每個標籤後接換行，否則先補一個換行、最後不補；
      else {
        // 結尾是否有換行；
        const endsWithNewline = source.endsWith('\n');
        // 組文字；
        const text = endsWithNewline ? tags.map((tag) => `${tag}${eol}`).join('') : `${eol}${tags.join(eol)}`;
        // 在文件結尾插入；
        edits.push({ start: source.length, end: source.length, text });
      }
      // 記錄新增的腳本；
      stats.scriptsAdded.push(...srcs);
    }

    // 套用所有編輯並接回 BOM；
    const out = `${hasBom ? BOM : ''}${applyEdits(source, edits)}`;
    // 回傳；
    return { html: out, changed: out !== html, stats };
  } catch (error) {
    // 任何意外都不丟出去：原樣回傳並說明；
    return unchanged(html, { ...emptyStats(), skipped: `遷移時發生意外：${error instanceof Error ? error.message : String(error)}` });
  }
}
