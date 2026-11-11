// 匯入 fs 的 promise 版 API，用來讀筆記原文；
import * as fs from 'node:fs/promises';
// 匯入 path 模組，用 join 組出筆記的實體路徑；
import * as path from 'node:path';
// 匯入 Markdown 渲染函式；副檔名寫 .ts 讓 Node 型別剝除也能載入（報告腳本會用到）；
import { renderMarkdown } from './markdown.ts';
// 匯入 html 筆記解析函式；
import { parseHtmlNote } from './parse-html.ts';
// `import type` 只匯入型別；
import type { ParsedHtmlNote } from './parse-html.ts';
// 匯入 HTML 版的 wikilink 改寫函式；
import { rewriteWikilinksInHtml } from './wikilink.ts';
// 匯入 R33 的原始檔連結改寫（產生改寫函式、改寫 html 的 a／area）；
import { makeNoteHrefRewriter, rewriteNoteLinksInHtml } from './note-links.ts';
// 匯入型別；
import type { NoteEntry } from './content.ts';
// 匯入型別；
import type { LoadedSite, SiteReport } from './site.ts';

// md 筆記的渲染結果；`export type` 匯出型別別名；
export type RenderedMd = { kind: 'md'; note: NoteEntry; html: string; frontmatter: Record<string, unknown> };
// html 筆記的渲染結果：parsed 是 parseHtmlNote 的結果（bodyHtml 已改寫 wikilink），needsQuiz 表示原頁載入過 note-quiz.js；
export type RenderedHtml = { kind: 'html'; note: NoteEntry; parsed: ParsedHtmlNote; needsQuiz: boolean };
// 兩者的聯集；用 kind 欄位區分（辨別聯集）；
export type RenderedNote = RenderedMd | RenderedHtml;

// 把 relPath 逐段做百分比編碼後接上 basePath，得到瀏覽器可用的網址；encodeURIComponent 會處理空白、#、+、%、中文；
export function encodeSitePath(relPath: string, basePath: string): string {
  // split 切段、map 逐段編碼、join 接回；
  return `${basePath}/${relPath.split('/').map(encodeURIComponent).join('/')}`;
}

// 在報告的「鍵 → 筆記集合」Map 裡加一筆；泛用的小工具；
function addTo(map: Map<string, Set<string>>, key: string, from: string): void {
  // 取出或新建集合；
  const set = map.get(key) ?? new Set<string>();
  // 加入筆記；
  set.add(from);
  // 寫回；
  map.set(key, set);
}

// 依筆記所在資料夾與圖片名稱找出圖片的 relPath；找不到回傳 undefined；同名多張時挑最近的並記入報告；
export function resolveImage(site: Pick<LoadedSite, 'images'>, noteRelPath: string, name: string, report: SiteReport): string | undefined {
  // 去掉開頭的 ./ 與 /，統一成正斜線；
  const clean = name.replace(/\\/g, '/').replace(/^\.?\//, '');
  // 筆記所在資料夾（根層為空字串）；lastIndexOf 找最後一個 /；
  const dir = noteRelPath.includes('/') ? noteRelPath.slice(0, noteRelPath.lastIndexOf('/')) : '';
  // 依序嘗試：相對筆記資料夾的路徑、從根目錄算的完整路徑；
  for (const key of [dir === '' ? clean : `${dir}/${clean}`, clean]) {
    // 只接受「完整路徑剛好相同」的那筆；
    const hit = site.images.get(key)?.find((p) => p === key);
    // 找到就回傳；
    if (hit) return hit;
  }
  // 再用檔名找（Obsidian 預設只寫檔名）；
  const candidates = site.images.get(clean.split('/').at(-1) as string);
  // 沒有任何候選就是找不到；
  if (!candidates || candidates.length === 0) return undefined;
  // 只有一張就是它；
  if (candidates.length === 1) return candidates[0];
  // 多張：優先同資料夾（或其子資料夾）的那張，否則取排序第一張；
  const near = candidates.find((p) => dir !== '' && p.startsWith(`${dir}/`)) ?? candidates[0];
  // 記入報告讓 Abby 知道有同名圖；
  report.ambiguousImages.set(clean, candidates);
  // 回傳挑中的那張；
  return near;
}

// renderNote 的選項：strictLinks 為 true 時，遇到歧義 wikilink 立刻丟錯（頁面路由依 STRICT_LINKS 設定，讓直接跑 next build 也繞不過）；
// 建置前的 site-report.mjs 不開它，因為它要先收集全部歧義再一次列出；
export type RenderOptions = { strictLinks?: boolean };

// 渲染一篇筆記；report 收集連結與圖片的警告（預設寫進 site.report）；basePath 是網址前綴；
export async function renderNote(site: LoadedSite, note: NoteEntry, basePath: string, report: SiteReport = site.report, options: RenderOptions = {}): Promise<RenderedNote> {
  // 讀原文；
  const source = await fs.readFile(path.join(site.root, note.relPath), 'utf8');
  // 找不到的 wikilink：記下內文與這篇筆記；箭頭函式；
  const onMissing = (raw: string) => addTo(report.missingLinks, raw.trim(), note.relPath);
  // 有歧義的 wikilink：記下候選與這篇筆記；
  const onAmbiguous = (raw: string, candidates: string[]) => {
    // 以去頭尾空白的內文為鍵；
    const key = raw.trim();
    // 嚴格模式：直接丟錯，訊息點名筆記、連結與候選；
    if (options.strictLinks) throw new Error(`STRICT_LINKS=1：${note.relPath} 的 [[${key}]] 有歧義（候選：${candidates.join('、')}），請加上資料夾前綴`);
    // 取出或新建紀錄；
    const entry = report.ambiguousLinks.get(key) ?? { candidates, from: new Set<string>() };
    // 加入這篇；
    entry.from.add(note.relPath);
    // 寫回；
    report.ambiguousLinks.set(key, entry);
  };
  // R33：md 與 html 共用的「原始檔連結改寫」函式；已發布集合取自網站的發布清單（已去掉被取代與保留名稱的）；
  const rewriteHref = makeNoteHrefRewriter({
    from: note.relPath, // 目前筆記；
    published: new Set(site.notes.map((n) => n.relPath)), // 已發布的原始檔；
    superseded: new Set(site.report.superseded.map((s) => s.relPath)), // 被取代的舊 html；
    onRewrite: () => (report.noteLinksRewritten += 1), // 每改寫一個加一；
    onUnpublished: (target) => report.unpublishedNoteLinks.add(`${note.relPath} → ${target}`), // 記下「筆記 → 目標」；
  });
  // md 走 Markdown 管線；
  if (note.kind === 'md') {
    // 圖片嵌入的回呼：找得到就記錄並回傳編碼後的網址，找不到就記入報告並把名稱原樣當 src；
    const onImage = (name: string) => {
      // 解析圖片；
      const relPath = resolveImage(site, note.relPath, name, report);
      // 找不到；
      if (relPath === undefined) {
        // 記入報告；
        addTo(report.missingImages, name, note.relPath);
        // 原樣回傳名稱；
        return name;
      }
      // 記錄要複製的圖片；
      report.images.add(relPath);
      // 回傳網址；
      return encodeSitePath(relPath, basePath);
    };
    // 渲染；
    const { html, frontmatter } = await renderMarkdown(source, { index: site.index, onMissing, onAmbiguous, onImage, basePath, rewriteHref });
    // 回傳 md 結果；
    return { kind: 'md', note, html, frontmatter };
  }
  // html：先解析；
  const parsed = parseHtmlNote(source);
  // 改寫 body 內的 wikilink；
  const withWikilinks = rewriteWikilinksInHtml(parsed.bodyHtml, site.index, onMissing, onAmbiguous, basePath);
  // 再改寫 a／area 指到筆記原始檔的 href（R33）；wikilink 產生的是 / 開頭的絕對網址，不受影響；
  const bodyHtml = rewriteNoteLinksInHtml(withWikilinks, rewriteHref);
  // 原頁有沒有載入 note-quiz.js（parseHtmlNote 會把它當共用腳本濾掉，但頁面的 inline 腳本會在解析時同步呼叫 NoteQuiz）；/i 不分大小寫；
  const needsQuiz = /<script[^>]*\ssrc\s*=\s*["']?[^"'\s>]*note-quiz\.js/i.test(source);
  // 回傳 html 結果；`...parsed` 展開後覆寫 bodyHtml；
  return { kind: 'html', note, parsed: { ...parsed, bodyHtml }, needsQuiz };
}

// 依 slug 片段找筆記；Next 給的片段可能已解碼或仍是百分比編碼，兩種都試；
export function findNoteBySlug(site: LoadedSite, slug: string[]): NoteEntry | undefined {
  // 安全解碼：decodeURIComponent 遇到單獨的 %（例如檔名 100%）會丟錯，此時保留原字串；
  const decode = (s: string) => {
    // try/catch 攔下 URIError；
    try {
      // 解碼；
      return decodeURIComponent(s);
    } catch {
      // 解碼失敗就原樣；
      return s;
    }
  };
  // 原樣與解碼後兩種鍵；
  const keys = [slug.join('/'), slug.map(decode).join('/')];
  // 找第一個符合的筆記；
  return site.notes.find((n) => keys.includes(n.slug.join('/')));
}
