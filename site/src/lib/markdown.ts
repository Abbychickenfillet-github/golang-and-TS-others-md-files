// 匯入 unified 的 unified 函式，用來把各個處理階段串成一條管線；
import { unified } from 'unified';
// 匯入 remark-parse，把 Markdown 字串解析成 mdast 語法樹；
import remarkParse from 'remark-parse';
// 匯入 remark-gfm，支援表格、任務清單、刪除線、自動連結、註腳；
import remarkGfm from 'remark-gfm';
// 匯入 remark-rehype，把 mdast 轉成 hast（HTML 語法樹）；
import remarkRehype from 'remark-rehype';
// 匯入 rehype-raw，把 Markdown 內的原始 HTML 片段解析成真正的 hast 元素；
import rehypeRaw from 'rehype-raw';
// 匯入 rehype-stringify，把 hast 輸出成 HTML 字串；
import rehypeStringify from 'rehype-stringify';
// 匯入 gray-matter（預設匯出是函式），把 md 的前言與內文拆開；
import matter from 'gray-matter';
// 匯入 Task 8 的 wikilink 外掛；
import { remarkWikilink } from './wikilink';
// 匯入自寫的 remark 外掛：圖片嵌入；
import { remarkEmbed } from './remark/embed';
// 匯入自寫的 remark 外掛：==螢光筆==；
import { remarkHighlight } from './remark/highlight';
// 匯入自寫的 remark 外掛：callout；
import { remarkCallout } from './remark/callout';
// 匯入自寫的 rehype 外掛：替標題加 id；
import { rehypeHeadingIds } from './rehype/heading-ids';

// `export type` 匯出型別別名：renderMarkdown 的第二個參數；
export type RenderContext = {
  // index：buildWikilinkIndex 建出的 wikilink 索引；
  index: Map<string, string>;
  // onMissing：wikilink 找不到目標時的回呼，參數是 `[[` 與 `]]` 之間的原始文字；
  onMissing: (raw: string) => void;
  // onAmbiguous：wikilink 有歧義時的回呼，參數是原始內文與候選 relPath；
  onAmbiguous: (raw: string, candidates: string[]) => void;
  // onImage：收到 `![[圖.png]]` 裡寫的檔名（不含 |尺寸），回傳輸出的 src；呼叫端據此記錄「被引用的圖」；
  onImage: (name: string) => string;
  // basePath：網站部署在子路徑時的前綴，省略代表網站根目錄；
  basePath?: string;
};

// `export type` 匯出型別別名：renderMarkdown 的回傳值；
export type RenderResult = {
  // html：筆記內文轉成的 HTML 字串（不含前言）；
  html: string;
  // frontmatter：前言物件，沒有前言就是 {}；
  frontmatter: Record<string, unknown>;
};

// 停用 gray-matter 的 `---js` 引擎：前言裡的 JavaScript 會被執行（eval），筆記內容不該有這種能力；
// 作法：把 js 與 javascript 兩個引擎換成會丟錯的函式，遇到 `---js` 前言就丟錯；
const NO_JS_ENGINE = (): never => {
  // 丟出說明原因的錯；
  throw new Error('frontmatter 不支援 ---js 引擎');
};

// 判斷一個值是不是「純物件」（不是 null、不是陣列），前言必須是 key: value 的 mapping 才算數；
function isPlainObject(value: unknown): value is Record<string, unknown> {
  // typeof null 也是 'object'，所以要多擋 null；Array.isArray 擋陣列；
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// 把原始文字拆成前言與內文；
function splitFrontmatter(source: string): { frontmatter: Record<string, unknown>; content: string } {
  // 去掉檔案開頭可能的 BOM（﻿），否則認不出開頭的 ---；
  const text = source.replace(/^﻿/, '');
  // 沒有開頭的 --- 行就一定沒有前言，不必呼叫 gray-matter；正規表示式：開頭三個 -、可有空白、然後換行（CRLF 或 LF）；
  if (!/^---[ \t]*\r?\n/.test(text)) return { frontmatter: {}, content: text };
  // 開頭是 --- 時，必須有「單獨一行的 ---」當結尾才算前言；否則它只是分隔線，gray-matter 卻會把整篇當成前言，所以先自己檢查；
  if (!/^---[ \t]*\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/.test(text)) return { frontmatter: {}, content: text };
  // try/catch：YAML 壞掉或遇到 ---js 時 gray-matter 會丟錯；
  try {
    // 第二個參數傳選項物件：同時關掉 gray-matter 以內容為鍵的快取（回傳同一物件）並停用 js 引擎；
    const parsed = matter(text, { engines: { js: NO_JS_ENGINE, javascript: NO_JS_ENGINE } });
    // 解析結果不是 mapping（例如兩條分隔線中間夾一段普通文字被當成 YAML 純量）就視為沒有前言，整篇照常渲染；
    if (!isPlainObject(parsed.data)) return { frontmatter: {}, content: text };
    // 回傳前言物件與去掉前言的內文；
    return { frontmatter: parsed.data, content: parsed.content };
  } catch {
    // 壞掉的前言：與 content.ts 一致視為沒有前言（frontmatter 為 {}），但把那一段從內文拿掉，免得 YAML 原文出現在頁面上；
    return { frontmatter: {}, content: text.replace(/^---[ \t]*\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/, '') };
  }
}

// 把 Markdown 筆記渲染成 HTML 字串（建置時呼叫）；async 函式一律回傳 Promise；
export async function renderMarkdown(source: string, ctx: RenderContext): Promise<RenderResult> {
  // 先拆出前言與內文；
  const { frontmatter, content } = splitFrontmatter(source);
  // 組管線：每個 .use 加一個階段，順序就是處理順序；
  const file = await unified()
    // 解析 Markdown 成 mdast；
    .use(remarkParse)
    // GFM 語法；
    .use(remarkGfm)
    // ![[圖.png]] 轉成 <img>；放在 wikilink 之前，嵌入先被取走，連結外掛就只會看到純文字的 [[…]]；
    .use(remarkEmbed, { onImage: ctx.onImage })
    // [[wikilink]] 轉成連結；放在 == 之前，這樣 [[a==b]] 這種連結內文不會被當成螢光筆記號；
    .use(remarkWikilink, { index: ctx.index, onMissing: ctx.onMissing, onAmbiguous: ctx.onAmbiguous, basePath: ctx.basePath })
    // ==字== 轉成 <mark>；
    .use(remarkHighlight)
    // `> [!note] 標題` 轉成 callout 結構；放在 wikilink 與 == 之後，標題與內文裡的連結、螢光筆已經是節點；
    .use(remarkCallout)
    // 轉成 hast，allowDangerousHtml 讓 Markdown 裡的原始 HTML 以 raw 節點保留下來（交給 rehype-raw 解析）；
    .use(remarkRehype, { allowDangerousHtml: true })
    // 解析 raw 節點成真正的元素；
    .use(rehypeRaw)
    // 替 h1 到 h6 加 id（放在 rehype-raw 之後，手寫 HTML 標題也一併處理）；
    .use(rehypeHeadingIds)
    // 輸出 HTML 字串；
    .use(rehypeStringify, { allowDangerousHtml: true })
    // process 跑完整條管線並回傳 VFile，String(file) 取得輸出字串；
    .process(content.replace(/\r\n?/g, '\n'));
  // 回傳結果；
  return { html: String(file), frontmatter };
}
