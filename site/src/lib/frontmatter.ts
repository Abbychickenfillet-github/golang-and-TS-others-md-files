// 匯入 gray-matter（預設匯出是函式），只用它把「已確認是前言的那一段」解析成物件；
import matter from 'gray-matter';

// 前言區塊的邊界規則，markdown.ts（渲染）與 content.ts（標題與前言）都靠這一條，兩邊對同一份檔案才會得到同樣的結果：
//   開頭：第一行必須「剛好是 ---」（後面只能有空白）；`---js`、`---javascript`、`---yaml` 這類帶引擎標記的開頭不符合，
//         所以那種區塊不是前言、根本不會交給 gray-matter，也就不可能執行前言裡的程式碼（這就是不執行 js 的真正機制）；
//   結尾：之後要有「單獨一行的 ---」；沒有的話開頭那條只是分隔線（gray-matter 自己會把整篇吞成前言，所以邊界要自己先檢查）；
// 正規表示式：`(?:([\s\S]*?)\r?\n)?` 是可省略的前言內文（最短比對，可跨行，捕獲為第 1 組）；`(?:\r?\n|$)` 讓結尾可以是檔案最後；
const BLOCK_RE = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;

// 壞 YAML 區塊的「像不像前言」啟發式（R22 第 3 條，刻意保持簡單）：
//   必須同時滿足：(1) 區塊內沒有任何空白行；(2) 至少有一行「欄位 0 開頭的 key:」；(3) 沒有 Markdown 標題行（`#` 加空白開頭）；
//   三條都成立才當作「壞掉的前言」剝除；任何一條不成立就視為散文，整份文字（含開頭的 ---）留作內文，寧可多顯示也不默默吃掉內容；
// KEY_LINE：開頭是英數、底線、連字號或 CJK 漢字，之後到冒號前不含冒號與換行，然後是冒號；
const KEY_LINE = /^[A-Za-z0-9_\-一-鿿][^:\n]*:/;
// HEADING_LINE：一到六個 # 加空白或 tab，是 Markdown 標題（在 YAML 裡會被當成註解，所以不能靠 YAML 解析來區分）；
const HEADING_LINE = /^#{1,6}\s/;

// 判斷一段「解析失敗的 YAML」看起來像不像前言；
function looksLikeBrokenFrontmatter(inner: string): boolean {
  // 逐行處理；/\r?\n/ 同時切開 CRLF 與 LF；
  const lines = inner.split(/\r?\n/);
  // 有空白行（trim 後為空）就像散文，不是前言；some 只要有一行符合就回傳 true；
  if (lines.some((line) => line.trim() === '')) return false;
  // 有 Markdown 標題行就不是前言；
  if (lines.some((line) => HEADING_LINE.test(line))) return false;
  // 至少要有一行 key:，否則連「像」都談不上；
  return lines.some((line) => KEY_LINE.test(line));
}

// 判斷一個值是不是「純物件」（不是 null、不是陣列），前言必須是 key: value 的 mapping 才算數；
function isPlainObject(value: unknown): value is Record<string, unknown> {
  // typeof null 也是 'object'，所以要多擋 null；Array.isArray 擋陣列；
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// 把筆記原始文字拆成前言資料與內文；只有「合理地像前言」的開頭區塊才會被剝除，其餘一律整份保留，避免默默吃掉筆記內容；
// 規則（R22）：
//   1. 沒有合格的開頭與結尾（含 ---js 這類帶引擎標記的開頭）→ 沒有前言，整份是內文；
//   2. 區塊完全空白 → 前言，data 為 {}，剝除；
//   3. 區塊解析成「至少有一個鍵」的 mapping → 前言，data 是該 mapping，剝除；
//   4. 區塊 YAML 解析失敗 → 只有 looksLikeBrokenFrontmatter 成立才剝除（data 為 {}）；否則整份保留；
//   5. 其餘（只有註解的區塊、純量、清單、空 mapping）→ 不是前言，data 為 {}，整份保留；
//   6. 只有前言 → 內文為空字串；開頭有 BOM（﻿）先去掉；CRLF 與 LF 都認得；
export function splitFrontmatter(text: string): { data: Record<string, unknown>; body: string } {
  // 去掉檔案開頭可能的 BOM，否則認不出開頭的 ---；
  const source = text.replace(/^﻿/, '');
  // 找前言區塊；沒有就整份是內文；
  const block = BLOCK_RE.exec(source);
  // 沒有合格區塊；
  if (!block) return { data: {}, body: source };
  // 區塊內文（兩條分隔線之間），緊鄰的兩條分隔線時為 undefined，改成空字串；`??` 只在左邊是 undefined 或 null 時取右邊；
  const inner = block[1] ?? '';
  // 區塊之後的全部文字就是內文；
  const body = source.slice(block[0].length);
  // 完全空白：前言，剝除；
  if (inner.trim() === '') return { data: {}, body };
  // try/catch：YAML 壞掉時 gray-matter 會丟錯；
  try {
    // 只解析區塊本身；第二個參數傳 {} 關掉 gray-matter 以內容為鍵的快取（否則會回傳同一個物件）；
    const parsed = matter(block[0], {});
    // 是有鍵的 mapping：前言，剝除；
    if (isPlainObject(parsed.data) && Object.keys(parsed.data).length > 0) return { data: parsed.data, body };
    // 只有註解、純量、清單或空 mapping：不是前言，整份保留；
    return { data: {}, body: source };
  } catch {
    // 壞 YAML：像前言才剝除，否則整份保留；
    return looksLikeBrokenFrontmatter(inner) ? { data: {}, body } : { data: {}, body: source };
  }
}
