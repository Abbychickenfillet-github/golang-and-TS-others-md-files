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
// 匯入前言拆分函式（與 content.ts 共用）；
import { splitFrontmatter } from './frontmatter';
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

// 把 Markdown 筆記渲染成 HTML 字串（建置時呼叫）；async 函式一律回傳 Promise；
export async function renderMarkdown(source: string, ctx: RenderContext): Promise<RenderResult> {
  // 先拆出前言與內文；與 content.ts 共用 frontmatter.ts，兩邊對同一份檔案的判斷一致（含 ---js 不是前言、不執行程式碼）；
  const { data: frontmatter, body: content } = splitFrontmatter(source);
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
    // footnoteLabelTagName: 'p' 把註腳區塊的隱藏標籤從預設的 <h2> 改成 <p>（仍帶 sr-only 類別與 id="footnote-label"，aria-describedby 還指得到它），
    // 否則 notes.js 會把它放進大綱，並讓只有一個真標題的短文湊滿「至少 2 個標題」的門檻；footnoteLabel 改成中文；
    .use(remarkRehype, { allowDangerousHtml: true, footnoteLabelTagName: 'p', footnoteLabel: '註腳' })
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
