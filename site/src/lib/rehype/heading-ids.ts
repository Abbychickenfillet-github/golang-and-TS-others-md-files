// 匯入 unist-util-visit 的 visit，走訪語法樹的每個節點；
import { visit } from 'unist-util-visit';
// 匯入 hast-util-to-string 的 toString，取得一個元素內所有文字（等同瀏覽器的 textContent）；
import { toString } from 'hast-util-to-string';
// 匯入 hast 的型別；`import type` 整句只在編譯期存在；
import type { Root } from 'hast';
// 匯入 headingSlug：與 assets/notes.js 的 slug() 逐字相同的標題轉 id 規則；
import { headingSlug } from '../wikilink';

// rehype 外掛：替每個 h1 到 h6 加上 id，規則與 assets/notes.js 執行期的 buildTOC 相同，所以建置時算出的 id 等於執行期會算出的 id；
// 執行期規則（逐字對照）：`if (!h.id) { b = slug(textContent); id = b; n = 1; while (used[id]) id = b + '-' + (++n); h.id = id; } used[h.id] = true;`
export function rehypeHeadingIds(): (tree: Root) => void {
  // 外掛回傳「轉換函式」，unified 會把 hast 樹傳進來；
  return (tree) => {
    // 已使用的 id 集合：Set 檢查成員是 O(1)，語意等同執行期的 used 物件；
    const used = new Set<string>();
    // 依文件順序走訪所有元素（順序與執行期 querySelectorAll 的文件順序一致）；
    visit(tree, 'element', (node) => {
      // 只處理 h1 到 h6：正規表示式 /^h[1-6]$/ 要求整個標籤名剛好是 h 加一個 1 到 6 的數字；
      if (!/^h[1-6]$/.test(node.tagName)) return;
      // 原始 HTML 手寫的標題可能已有 id：執行期 `if (!h.id)` 會保留它，這裡一樣保留並占用；
      const existing = node.properties?.id;
      // 已有非空字串 id 就占用後結束；
      if (typeof existing === 'string' && existing !== '') {
        // 加入已使用集合；
        used.add(existing);
        // 這個標題處理完畢；
        return;
      }
      // 以標題的純文字算出基底 slug；
      const base = headingSlug(toString(node));
      // 從基底開始，被占用就加 -2、-3……（`++n` 先加再用，所以第一個重複是 -2）；
      let id = base;
      // 計數器從 1 開始；
      let n = 1;
      // 迴圈直到找到沒被用過的 id；
      while (used.has(id)) id = `${base}-${++n}`;
      // 寫回 properties（沒有 properties 時先建空物件）；
      node.properties = { ...node.properties, id };
      // 占用這個 id；
      used.add(id);
    });
  };
}
