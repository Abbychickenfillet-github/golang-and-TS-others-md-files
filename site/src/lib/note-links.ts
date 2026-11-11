// R33：把「指到已發布筆記原始檔」的相對連結（例如 [x](other.md)、<a href="other.md">）改成發布後的頁面（other.html）；
// md 與 html 筆記共用同一個改寫函式（makeNoteHrefRewriter），所以兩種筆記的行為一致；
// 匯入 path 的 POSIX 版本：筆記的 relPath 一律用正斜線，用 posix 的 join／normalize 才不會在 Windows 變成反斜線；
import { posix } from 'node:path';
// 匯入 cheerio 的 load：用 parse5 解析 html 並記下每個屬性在原始字串中的位置；
import { load } from 'cheerio';
// 匯入 domhandler 的節點型別；`import type` 只用於型別；
import type { AnyNode, Element } from 'domhandler';

// 改寫函式的設定；`export type` 匯出型別別名；
export type NoteLinkContext = {
  // from：目前筆記的 relPath（決定相對連結的基準資料夾）；
  from: string;
  // published：已發布筆記的原始檔 relPath（去掉被取代與保留名稱之後的集合）；
  published: Set<string>;
  // superseded：被「-互動版」取代的舊 html relPath（R25）；連到它的網址正好是 md 頁的 X.html，不用改也不算未發布；
  superseded: Set<string>;
  // onRewrite：每改寫一個連結呼叫一次（報告計數用）；
  onRewrite: () => void;
  // onUnpublished：連結指到沒發布的筆記原始檔時呼叫，參數是解析後的 vault 相對路徑（或跑出根目錄時的原始連結）；
  onUnpublished: (target: string) => void;
};

// 寬鬆的百分比解碼：不合法的 % 序列（例如檔名 100%）時保留原字串；
function safeDecode(text: string): string {
  // try/catch 攔下 URIError；
  try {
    // 解碼；
    return decodeURIComponent(text);
  } catch {
    // 原樣；
    return text;
  }
}

// 產生改寫函式：回傳新的 href，或 null（不改）；
export function makeNoteHrefRewriter(ctx: NoteLinkContext): (href: string) => string | null {
  // 目前筆記所在資料夾；posix.dirname 對根層檔案回傳 '.'；
  const dir = posix.dirname(ctx.from);
  // 回傳箭頭函式；
  return (href: string) => {
    // 空字串、# 開頭（同頁錨點）、/ 開頭（絕對路徑與 //host 協定相對網址）都不處理；
    if (href === '' || href.startsWith('#') || href.startsWith('/')) return null;
    // 有 scheme 的（https:、mailto:、tel:、javascript:、data: …）不處理；正規式依 URL 規格的 scheme 字元；
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return null;
    // 第一個 ? 或 # 的位置，之前是路徑、之後原樣保留；search 找不到回傳 -1；
    const cut = href.search(/[?#]/);
    // 路徑部分；
    const pathPart = cut === -1 ? href : href.slice(0, cut);
    // 查詢與錨點部分；
    const suffix = cut === -1 ? '' : href.slice(cut);
    // 副檔名必須是小寫的 .md 或 .html（區分大小寫，與發布集合的比對一致）；其他都是附件，交給 copy-local-assets；
    const ext = /\.(md|html)$/.exec(pathPart);
    // 不是筆記原始檔就不處理；
    if (!ext) return null;
    // 解碼後以目前資料夾為基準解析；posix.join 會處理 ./ 與 ../，normalize 收掉多餘的斜線；
    const resolved = posix.normalize(posix.join(dir, safeDecode(pathPart)));
    // 跑出筆記根目錄（../ 開頭）：不是任何筆記，記為未發布並保持原樣；
    if (resolved === '..' || resolved.startsWith('../')) {
      // 記下原始連結；
      ctx.onUnpublished(href);
      // 不改；
      return null;
    }
    // 指到已發布的筆記：md 改成 .html；html 筆記本來就是 .html，不用改；
    if (ctx.published.has(resolved)) {
      // html 不改；
      if (ext[1] === 'html') return null;
      // 計數；
      ctx.onRewrite();
      // 只把原始路徑結尾的 .md 換成 .html：前面的 ../、./ 與百分比編碼的寫法都保持原樣；查詢與錨點接回去；
      return `${pathPart.slice(0, -3)}.html${suffix}`;
    }
    // 被取代的舊 X.html：網址 X.html 正好是 md 頁，不改也不算未發布；
    if (ctx.superseded.has(resolved)) return null;
    // 其餘：沒發布（被排除、保留名稱、不存在）；記下並保持原樣；
    ctx.onUnpublished(resolved);
    // 不改；
    return null;
  };
}

// 改寫 html 中 a 與 area 的 href：用 parse5 的位置資訊只替換屬性值那一段原始字串，其他位元組一律不動（與 wikilink 的 HTML 改寫同一做法）；
export function rewriteNoteLinksInHtml(html: string, rewrite: (href: string) => string | null): string {
  // 沒有 href 字樣就不必解析；/i 不分大小寫；
  if (!/href/i.test(html)) return html;
  // 解析：sourceCodeLocationInfo 要求記錄位置；第三個參數 false 代表當成片段解析（bodyHtml 是 body 的內層）；
  const $ = load(html, { sourceCodeLocationInfo: true }, false);
  // 待替換清單：起訖位置與新字串；
  const edits: { start: number; end: number; value: string }[] = [];
  // 遞迴走訪；
  const walk = (nodes: AnyNode[]): void => {
    // 逐一處理；
    for (const node of nodes) {
      // 只看元素（type 為 tag；script、style 的 type 不同，也不會含 a 元素）；
      if (node.type !== 'tag') continue;
      // 斷言成元素；
      const el = node as Element;
      // a 或 area 而且有 href；parse5 會把標籤名與屬性名轉小寫；
      if ((el.name === 'a' || el.name === 'area') && el.attribs.href !== undefined) {
        // 屬性在原始字串中的位置（整個 `href="…"`）；parse5 執行時有 attrs，但 domhandler 的型別沒宣告，所以用 `as` 補上形狀；`?.` 在沒有位置資訊時回傳 undefined；
        const loc = (el.sourceCodeLocation as { attrs?: Record<string, { startOffset: number; endOffset: number }> } | null | undefined)?.attrs?.href;
        // 有位置才處理；
        if (loc) {
          // 原始的屬性文字；
          const raw = html.slice(loc.startOffset, loc.endOffset);
          // 拆成「名稱與等號」「引號」「值」；`([\s\S]*?)\2$` 要求值後面是同一個引號（或沒有引號）；
          const m = /^([^\s=]+\s*=\s*)(["']?)([\s\S]*?)\2$/.exec(raw);
          // 用解碼後的屬性值（cheerio 已還原實體）判斷要不要改、並計數；
          const next = m ? rewrite(el.attribs.href) : null;
          // 要改：在原始值上做同樣的變更（路徑結尾的 .md 換成 .html），保留原本的實體寫法、查詢與錨點；
          if (m && next !== null) {
            // 原始值；
            const value = m[3];
            // 原始值的路徑部分結尾位置；
            const cut = value.search(/[?#]/);
            // 路徑部分；
            const pathPart = cut === -1 ? value : value.slice(0, cut);
            // 查詢與錨點；
            const suffix = cut === -1 ? '' : value.slice(cut);
            // 路徑結尾是 .md 才換（理論上一定是）；
            if (pathPart.endsWith('.md')) edits.push({ start: loc.startOffset, end: loc.endOffset, value: `${m[1]}${m[2]}${pathPart.slice(0, -3)}.html${suffix}${m[2]}` });
          }
        }
      }
      // 遞迴子節點；
      walk(el.children);
    }
  };
  // 從根節點的子節點開始；
  walk($.root().get(0)?.children ?? []);
  // 沒有要改的就原樣回傳；
  if (edits.length === 0) return html;
  // 從後往前替換，前面的位置才不會偏移；
  let result = html;
  // 依起點由大到小；
  for (const e of edits.sort((a, b) => b.start - a.start)) result = result.slice(0, e.start) + e.value + result.slice(e.end);
  // 回傳；
  return result;
}
