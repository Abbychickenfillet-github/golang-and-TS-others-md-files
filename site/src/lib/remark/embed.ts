// 匯入 unist-util-visit 的 visit 與 SKIP；visit 走訪語法樹，SKIP 是「不要走進這個節點的子孫」的特殊回傳值；
import { SKIP, visit } from 'unist-util-visit';
// 匯入 mdast 的型別；`import type` 整句只在編譯期存在；
import type { Image, PhrasingContent, Root, Text } from 'mdast';

// `export type` 匯出型別別名：remarkEmbed 的選項；
export type RemarkEmbedOptions = {
  // onImage：收到筆記裡寫的檔名（不含 |尺寸），回傳輸出的 src；呼叫端用它記錄「被引用的圖」；
  onImage: (name: string) => string;
};

// 圖片副檔名（不分大小寫）；正規表示式的 `$` 要求副檔名在字串結尾；
const IMAGE_EXT_RE = /\.(?:png|jpe?g|gif|webp|svg|avif|bmp)$/i;

// 找 `![[…]]`：驚嘆號、兩個 [、一個以上不含 [ 或 ] 的字元（捕獲為 inner）、兩個 ]；g 旗標找全部；
const EMBED_RE = /!\[\[([^[\]]+)\]\]/g;

// 尺寸寫法：`300` 或 `300x200`（寬 x 高）；捕獲群組 1 是寬、2 是高（可省略）；
const SIZE_RE = /^(\d+)(?:x(\d+))?$/;

// 把一個圖片嵌入的內文（`[[` 與 `]]` 之間）轉成圖片節點；不是圖片就回傳 undefined，讓原文保持純文字；
function toImage(inner: string, onImage: (name: string) => string): Image | undefined {
  // 表格儲存格裡的轉義 `\|` 先還原成 `|`，再以第一個 | 切成「檔名」與「尺寸或別名」；
  const text = inner.replace(/\\\|/g, '|');
  // 第一個 | 的位置，沒有就是 -1；
  const pipe = text.indexOf('|');
  // 檔名：| 之前去頭尾空白；
  const name = (pipe === -1 ? text : text.slice(0, pipe)).trim();
  // | 之後的部分，沒有就是空字串；
  const extra = pipe === -1 ? '' : text.slice(pipe + 1).trim();
  // 不是圖片副檔名就不處理（非圖片嵌入維持純文字）；
  if (!IMAGE_EXT_RE.test(name)) return undefined;
  // 是不是尺寸寫法；
  const size = SIZE_RE.exec(extra);
  // 預設的 alt：檔名去掉資料夾與副檔名；split('/') 取最後一段、再用 replace 去掉副檔名；
  const baseName = (name.split('/').at(-1) as string).replace(IMAGE_EXT_RE, '');
  // 有非數字的別名就當 alt，否則用預設；
  const alt = extra !== '' && !size ? extra : baseName;
  // 由呼叫端決定輸出的 src；
  const src = onImage(name);
  // 輸出給 hast 的屬性：用 data.hProperties 直接指定，避免 remark-rehype 對網址做額外的百分比編碼；
  const props: Record<string, string> = { src, alt };
  // 有寬就加寬；
  if (size) props.width = size[1];
  // 有高就加高；
  if (size?.[2]) props.height = size[2];
  // 組出 mdast 的 image 節點；
  return { type: 'image', url: src, alt, title: null, data: { hProperties: props } };
}

// remark 外掛：把文字裡的圖片嵌入 `![[圖.png]]` 轉成圖片節點；只處理 text 節點，所以行內程式碼與圍欄程式碼天然不受影響；
export function remarkEmbed(opts: RemarkEmbedOptions): (tree: Root) => void {
  // 外掛回傳「轉換函式」，unified 會把語法樹傳進來；
  return (tree) => {
    // visit 走訪每個節點；回呼收到節點、它在父節點 children 的位置、父節點；
    visit(tree, 'text', (node, position, parent) => {
      // 需要有父節點與位置才能替換；
      if (!parent || position === undefined) return undefined;
      // 新的子節點列表；
      const out: PhrasingContent[] = [];
      // 已處理到的位置；
      let last = 0;
      // 是否真的換過（找到非圖片嵌入時不動它）；
      let changed = false;
      // matchAll 回傳所有比對結果；
      for (const m of node.value.matchAll(EMBED_RE)) {
        // 轉成圖片節點；
        const image = toImage(m[1], opts.onImage);
        // 非圖片嵌入：略過，原文留在前後文字裡；
        if (!image) continue;
        // 比對起點；
        const start = m.index as number;
        // 前面的文字補成 text 節點；
        if (start > last) out.push({ type: 'text', value: node.value.slice(last, start) } as Text);
        // 加入圖片；
        out.push(image);
        // 更新位置；
        last = start + m[0].length;
        // 標記有改動；
        changed = true;
      }
      // 沒改動就不替換；
      if (!changed) return undefined;
      // 補上最後一段文字；
      if (last < node.value.length) out.push({ type: 'text', value: node.value.slice(last) } as Text);
      // splice 把原本的一個 text 節點換成多個新節點；
      parent.children.splice(position, 1, ...out);
      // 回傳 [SKIP, 下一個位置]：不走進新節點，並從新節點之後繼續；
      return [SKIP, position + out.length];
    });
  };
}
