// 匯入 unist-util-visit 的 visit，走訪 mdast 的每個節點；
import { visit } from 'unist-util-visit';
// 匯入 mdast 的型別；`import type` 整句只在編譯期存在；
import type { Parent, PhrasingContent, Root, Text } from 'mdast';

// 一個 `==` 記號：canOpen 表示它可以當「開頭」（後面緊接非空白），canClose 表示它可以當「結尾」（前面緊接非空白）；
type Marker = { kind: 'marker'; canOpen: boolean; canClose: boolean };
// 一個原樣保留的節點（文字片段或其他行內節點）；
type Keep = { kind: 'keep'; node: PhrasingContent };
// 拆開後的片段：不是記號就是原樣節點；
type Piece = Marker | Keep;

// 恰好兩個等號：`(?<!=)` 是「前面不是 =」的後行斷言、`(?!=)` 是「後面不是 =」的先行斷言，所以 `===` 與 `====` 都不算；
const MARKER_RE = /(?<!=)==(?!=)/g;

// 判斷一個字元是不是非空白：undefined（超出字串）視為不存在；
const isNonSpace = (char: string | undefined): boolean => char !== undefined && !/\s/.test(char);

// 把一組行內子節點拆成片段：文字節點依 `==` 切開，其他節點原樣放進去；
function toPieces(children: PhrasingContent[]): Piece[] {
  // 結果片段；
  const pieces: Piece[] = [];
  // 逐個子節點處理，i 用來判斷「文字節點邊界外面還有沒有鄰居」；
  children.forEach((child, i) => {
    // 不是文字節點（例如 inlineCode、strong、link）原樣保留；
    if (child.type !== 'text') {
      // 放進片段；
      pieces.push({ kind: 'keep', node: child });
      // 處理下一個；
      return;
    }
    // 目前文字已切到的位置；
    let last = 0;
    // matchAll 回傳所有比對結果（正規表示式必須帶 g 旗標）；
    for (const m of child.value.matchAll(MARKER_RE)) {
      // 記號在文字中的起點；m.index 在 matchAll 的結果一定有值，所以用 `as number` 斷言；
      const start = m.index as number;
      // 記號的終點；
      const end = start + 2;
      // 記號前面的文字（如果有）先放進片段；
      if (start > last) pieces.push({ kind: 'keep', node: { type: 'text', value: child.value.slice(last, start) } as Text });
      // 前一個字元：記號在文字開頭時，改看「前一個兄弟節點存不存在」（例如粗體後面緊接 ==）；
      const prevOk = start > 0 ? isNonSpace(child.value[start - 1]) : i > 0;
      // 後一個字元：記號在文字結尾時，改看「後一個兄弟節點存不存在」；
      const nextOk = end < child.value.length ? isNonSpace(child.value[end]) : i < children.length - 1;
      // 放進記號；
      pieces.push({ kind: 'marker', canOpen: nextOk, canClose: prevOk });
      // 更新位置；
      last = end;
    }
    // 最後一段文字；
    if (last < child.value.length) pieces.push({ kind: 'keep', node: { type: 'text', value: child.value.slice(last) } as Text });
  });
  // 回傳片段；
  return pieces;
}

// 把相鄰的文字節點合併成一個（未配對的 == 被還原成文字後，會與前後文字相鄰）；
function mergeText(nodes: PhrasingContent[]): PhrasingContent[] {
  // 結果；
  const out: PhrasingContent[] = [];
  // 逐一檢查；
  for (const node of nodes) {
    // 結果最後一個節點；`.at(-1)` 取最後一個元素；
    const prev = out.at(-1);
    // 前後都是文字就把內容接起來；
    if (prev && prev.type === 'text' && node.type === 'text') prev.value += node.value;
    // 否則照放；
    else out.push(node);
  }
  // 回傳；
  return out;
}

// 把片段轉回節點：成對的記號包成 mark 節點，沒配對的記號還原成文字 `==`；
function toNodes(pieces: Piece[]): PhrasingContent[] {
  // 先決定哪些記號配成一對：pairs 記錄「開頭位置 → 結尾位置」；
  const pairs = new Map<number, number>();
  // 目前等待結尾的開頭位置，-1 表示沒有；
  let pending = -1;
  // 依序掃描片段；
  pieces.forEach((piece, k) => {
    // 只看記號；
    if (piece.kind !== 'marker') return;
    // 沒有等待中的開頭：能當開頭就記下來；
    if (pending === -1) {
      // 能開頭才記；
      if (piece.canOpen) pending = k;
      // 結束這個記號；
      return;
    }
    // 有等待中的開頭：能當結尾就配成一對；不能當結尾就當普通文字，等待中的開頭不變；
    if (piece.canClose) {
      // 記錄配對；
      pairs.set(pending, k);
      // 清掉等待狀態；
      pending = -1;
    }
  });
  // 輸出節點；
  const out: PhrasingContent[] = [];
  // 用 while 手動前進，因為遇到成對的開頭時要一次跳到結尾之後；
  let k = 0;
  // 走完全部片段；
  while (k < pieces.length) {
    // 目前片段；
    const piece = pieces[k];
    // 是這一對的開頭：包住中間所有片段；
    const close = pairs.get(k);
    // 有結尾位置才是成對（0 以外的值都是真值，但位置不會是 0 因為結尾一定在開頭之後）；
    if (close !== undefined) {
      // 中間片段轉成節點（沒配對的記號在裡面會被還原成文字）；
      const inner = toNodes(pieces.slice(k + 1, close));
      // mark 節點：remark-rehype 看到未知節點型別時，用 data.hName 決定輸出的標籤；子節點照一般方式轉換；
      out.push({ type: 'mark', data: { hName: 'mark' }, children: inner } as unknown as PhrasingContent);
      // 跳到結尾之後；
      k = close + 1;
      // 下一輪；
      continue;
    }
    // 沒配對的記號還原成文字；
    if (piece.kind === 'marker') out.push({ type: 'text', value: '==' } as Text);
    // 原樣節點直接放；
    else out.push(piece.node);
    // 下一個片段；
    k += 1;
  }
  // 合併相鄰文字後回傳；
  return mergeText(out);
}

// remark 外掛：把 Obsidian 的 `==字==` 轉成 <mark>；只處理文字節點，所以行內程式碼與圍欄程式碼（內容在 value 欄位、不是 text 節點）天然不受影響；
export function remarkHighlight(): (tree: Root) => void {
  // 外掛回傳「轉換函式」，unified 會把語法樹傳進來；
  return (tree) => {
    // 走訪每個節點；
    visit(tree, (node) => {
      // 只看有 children 的節點；`'children' in node` 是型別縮小的寫法；
      if (!('children' in node)) return;
      // 轉成有 children 的父節點型別，方便讀寫；
      const parent = node as Parent;
      // 沒有任何文字節點含 == 就不需要處理（絕大多數節點都在這裡直接結束）；
      if (!parent.children.some((c) => c.type === 'text' && c.value.includes('=='))) return;
      // 拆片段再組回來；
      parent.children = toNodes(toPieces(parent.children as PhrasingContent[])) as Parent['children'];
    });
  };
}
