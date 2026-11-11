// 匯入 gray-matter（預設匯出是函式），只用它把「已確認是前言的那一段」解析成物件；
import matter from 'gray-matter';

// 前言區塊的邊界規則，markdown.ts（渲染）與 content.ts（標題與前言）都靠這一條，兩邊對同一份檔案才會得到同樣的結果：
//   開頭：第一行必須「剛好是 ---」（後面只能有空白）；`---js`、`---javascript`、`---yaml` 這類帶引擎標記的開頭不符合，
//         所以那種區塊不是前言、根本不會交給 gray-matter，也就不可能執行前言裡的程式碼（這就是不執行 js 的真正機制）；
//   結尾：之後要有「單獨一行的 ---」；沒有的話開頭那條只是分隔線（gray-matter 自己會把整篇吞成前言，所以邊界要自己先檢查）；
// 正規表示式：`(?:([\s\S]*?)\r?\n)?` 是可省略的前言內文（最短比對，可跨行）；`(?:\r?\n|$)` 讓結尾可以是檔案最後；
const BLOCK_RE = /^---[ \t]*\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/;

// 判斷一個值是不是「純物件」（不是 null、不是陣列），前言必須是 key: value 的 mapping 才算數；
function isPlainObject(value: unknown): value is Record<string, unknown> {
  // typeof null 也是 'object'，所以要多擋 null；Array.isArray 擋陣列；
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// 把筆記原始文字拆成前言資料與內文；
// 規則：
//   1. 沒有合格的開頭與結尾 → 沒有前言，整份是內文；
//   2. 前言 YAML 壞掉 → data 為 {}，前言區塊從內文拿掉（免得 YAML 原文出現在頁面上或被當成標題）；
//   3. 前言不是 mapping（例如兩條分隔線夾一段普通文字）→ data 為 {}，整份是內文（它其實是分隔線）；
//   4. 只有前言 → 內文為空字串；
//   5. 開頭有 BOM（﻿）先去掉；CRLF 與 LF 都認得；
export function splitFrontmatter(text: string): { data: Record<string, unknown>; body: string } {
  // 去掉檔案開頭可能的 BOM，否則認不出開頭的 ---；
  const source = text.replace(/^﻿/, '');
  // 找前言區塊；沒有就整份是內文；
  const block = BLOCK_RE.exec(source);
  // 沒有合格區塊（含 ---js 這類帶引擎標記的開頭）；
  if (!block) return { data: {}, body: source };
  // 區塊之後的全部文字就是內文；
  const body = source.slice(block[0].length);
  // try/catch：YAML 壞掉時 gray-matter 會丟錯；
  try {
    // 只解析區塊本身；第二個參數傳 {} 關掉 gray-matter 以內容為鍵的快取（否則會回傳同一個物件）；
    const parsed = matter(block[0], {});
    // 不是 mapping：當成沒有前言，整份是內文；
    if (!isPlainObject(parsed.data)) return { data: {}, body: source };
    // 正常：回傳前言物件與去掉區塊的內文；
    return { data: parsed.data, body };
  } catch {
    // 壞 YAML：data 為 {}，區塊已從 body 拿掉；
    return { data: {}, body };
  }
}
