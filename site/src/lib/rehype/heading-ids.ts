// 匯入 hast-util-to-string 的 toString，取得一個元素內所有文字（等同瀏覽器的 textContent）；
import { toString } from 'hast-util-to-string';
// 匯入 hast 的型別；`import type` 整句只在編譯期存在；
import type { Element, Nodes, Root } from 'hast';
// 匯入 headingSlug：與 assets/notes.js 的 slug() 逐字相同的標題轉 id 規則；
import { headingSlug } from '../wikilink';

// 一個標題與它是否位在「執行期不處理的容器」內；
type Heading = { node: Element; skipped: boolean };

// 取得元素的 class 清單（hast 的 className 通常是陣列，但手寫 HTML 經 rehype-raw 後也可能是字串）；
function classesOf(node: Element): string[] {
  // className 屬性；
  const value: unknown = node.properties?.className;
  // 陣列就轉成字串陣列；字串就依空白切開；其餘視為沒有；
  if (Array.isArray(value)) return value.map(String);
  // 字串依空白切；
  if (typeof value === 'string') return value.split(/\s+/);
  // 沒有 class；
  return [];
}

// 這個元素是不是 notes.js 排除的容器：選擇器 `nav.toc, .auto-toc, .tipcard`；
function isExcludedContainer(node: Element): boolean {
  // 取 class 清單；
  const classes = classesOf(node);
  // nav 加 toc，或任何元素帶 auto-toc 或 tipcard；
  return (node.tagName === 'nav' && classes.includes('toc')) || classes.includes('auto-toc') || classes.includes('tipcard');
}

// 依文件順序收集所有 h1 到 h6，並記錄每個是否位在被排除的容器內；遞迴走訪，skipped 是「祖先裡已經有被排除的容器」；
function collectHeadings(node: Nodes, skipped: boolean, out: Heading[]): void {
  // 只有 root 與 element 有 children；
  if (node.type !== 'root' && node.type !== 'element') return;
  // 逐一處理子節點；
  for (const child of node.children) {
    // 只看元素；
    if (child.type !== 'element') continue;
    // 這個元素是標題：記錄；正規表示式 /^h[1-6]$/ 要求標籤名剛好是 h 加一個 1 到 6 的數字；
    if (/^h[1-6]$/.test(child.tagName)) out.push({ node: child, skipped });
    // 往下走：自己若是被排除的容器，底下全部標為 skipped；
    collectHeadings(child, skipped || isExcludedContainer(child), out);
  }
}

// rehype 外掛：替標題加上 id。分兩輪：
//   第一輪只處理 h2、h3，規則逐行對照 assets/notes.js 的 buildTOC，所以這兩種標題在建置時算出的 id 一定等於執行期會算出的 id（[[筆記#標題]] 的錨點因此不會失效）：
//     - 文字（trim 後）為空的標題略過，不給 id；位在 `nav.toc, .auto-toc, .tipcard` 內的標題略過；
//     - 已經有 id（手寫 HTML）就保留並占用該 id；
//     - 否則用 headingSlug 算基底，被占用就加 -2、-3……（計數從 1 開始，`++n` 先加再用，所以第一個重複是 -2）；
//   第二輪處理 h1、h4 到 h6：這是「刻意的擴充」，執行期不會替它們編號，但 [[筆記#某個 h4 標題]] 需要錨點才能跳得到；
//     - 同一套 slug 函式與去重格式，空文字、被排除容器同樣略過；
//     - 去重對象是「全部已用過的 id」，且在第一輪之後才處理，所以永遠不會改變任何 h2、h3 的 id（# Docker 在前、## Docker 在後時，h2 是 docker、h1 讓位成 docker-2）；
export function rehypeHeadingIds(): (tree: Root) => void {
  // 外掛回傳「轉換函式」，unified 會把 hast 樹傳進來；
  return (tree) => {
    // 依文件順序收集所有標題；
    const headings: Heading[] = [];
    // 從 root 開始，起始時不在任何被排除的容器內；
    collectHeadings(tree, false, headings);
    // 已使用的 id 集合：Set 檢查成員是 O(1)，語意等同執行期的 used 物件；
    const used = new Set<string>();
    // 處理一個標題：給 id、保留手寫 id，或因文字為空而略過；
    const assign = (node: Element): void => {
      // 取標題純文字；
      const text = toString(node);
      // 文字為空的標題略過（執行期 `&& h.textContent.trim()` 過濾掉它）；
      if (text.trim() === '') return;
      // 已有非空字串 id（手寫 HTML）：保留並占用；
      const existing = node.properties?.id;
      // 已有 id；
      if (typeof existing === 'string' && existing !== '') {
        // 占用；
        used.add(existing);
        // 結束；
        return;
      }
      // 基底 slug；
      const base = headingSlug(text);
      // 從基底開始找沒被用過的 id；
      let id = base;
      // 計數器從 1 開始；
      let n = 1;
      // 被占用就加後綴；
      while (used.has(id)) id = `${base}-${++n}`;
      // 寫回 properties（沒有 properties 時先建空物件）；
      node.properties = { ...node.properties, id };
      // 占用；
      used.add(id);
    };
    // 第一輪：只有 h2、h3，且不在被排除容器內；
    for (const h of headings) if (!h.skipped && (h.node.tagName === 'h2' || h.node.tagName === 'h3')) assign(h.node);
    // 第二輪：其餘的 h1、h4 到 h6（不在被排除容器內）；手寫 id 在這輪也會被占用，之後的標題會避開；
    for (const h of headings) if (!h.skipped && h.node.tagName !== 'h2' && h.node.tagName !== 'h3') assign(h.node);
  };
}
