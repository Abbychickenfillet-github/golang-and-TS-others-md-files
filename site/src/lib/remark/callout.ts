// 匯入 unist-util-visit 的 visit，走訪語法樹的每個節點；
import { visit } from 'unist-util-visit';
// 匯入 mdast 的型別；`import type` 整句只在編譯期存在；
import type { Blockquote, Paragraph, PhrasingContent, Root, Text } from 'mdast';

// callout 開頭：`[!型別]`、可選的摺疊記號 + 或 -、之後的空白；型別是不含 ] 與空白的任意字元（所以中文型別也行）；
const HEAD_RE = /^\[!([^\]\s]+)\]([+-])?[ \t]*/;

// 摺疊記號對應的 data-fold 值；
const FOLD: Record<string, string> = { '+': 'open', '-': 'closed' };

// 型別的首字大寫，用作省略標題時的預設標題（note → Note）；charAt(0) 取第一個字元，slice(1) 取其餘；
const capitalize = (type: string): string => type.charAt(0).toUpperCase() + type.slice(1);

// 建一個空的 text 節點的簡寫；
const text = (value: string): Text => ({ type: 'text', value });

// 把標題行的行內節點尾端空白去掉，並丟掉變空的文字節點；
function cleanTitle(nodes: PhrasingContent[]): PhrasingContent[] {
  // 複製一份，避免改到呼叫端的陣列；
  const out = [...nodes];
  // 最後一個節點若是文字，去掉結尾空白；
  const last = out.at(-1);
  // 是文字節點才處理；
  if (last && last.type === 'text') out[out.length - 1] = text(last.value.trimEnd());
  // 濾掉空字串的文字節點；
  return out.filter((n) => !(n.type === 'text' && n.value === ''));
}

// 把第一個段落拆成「標題行的行內節點」與「其餘內文的行內節點」；
// 規則：標題到第一個換行為止（換行可能是文字裡的 \n，也可能是行尾兩個空白產生的 break 節點）；
function splitParagraph(first: Text, rest: PhrasingContent[], headLength: number): { title: PhrasingContent[]; body: PhrasingContent[] } {
  // 標題與內文累積；
  const title: PhrasingContent[] = [];
  // 內文累積；
  const body: PhrasingContent[] = [];
  // 第一個文字節點扣掉 `[!type]` 之後剩下的部分；
  const remaining = first.value.slice(headLength);
  // 第一個換行的位置；
  const nl = remaining.indexOf('\n');
  // 第一個文字節點裡就有換行：標題在換行前、內文從換行後開始，其餘節點全屬於內文；
  if (nl !== -1) {
    // 標題文字；
    title.push(text(remaining.slice(0, nl)));
    // 換行之後的文字開頭屬於內文；
    body.push(text(remaining.slice(nl + 1)));
    // 其餘節點都是內文；
    body.push(...rest);
    // 回傳；
    return { title: cleanTitle(title), body: body.filter((n) => !(n.type === 'text' && n.value === '')) };
  }
  // 否則標題行延伸到後面的節點：先放第一個文字節點剩下的部分；
  title.push(text(remaining));
  // 逐個節點往後找換行；
  for (let i = 0; i < rest.length; i += 1) {
    // 目前節點；
    const node = rest[i];
    // break 節點就是強制換行：它本身丟掉，之後全是內文；
    if (node.type === 'break') {
      // 之後的節點都是內文；
      body.push(...rest.slice(i + 1));
      // 結束；
      return { title: cleanTitle(title), body };
    }
    // 文字節點含換行：換行前屬於標題、後屬於內文；
    if (node.type === 'text' && node.value.includes('\n')) {
      // 換行位置；
      const at = node.value.indexOf('\n');
      // 換行前加進標題；
      title.push(text(node.value.slice(0, at)));
      // 換行後開頭是內文，再加上其餘節點；
      body.push(text(node.value.slice(at + 1)), ...rest.slice(i + 1));
      // 結束；
      return { title: cleanTitle(title), body: body.filter((n) => !(n.type === 'text' && n.value === '')) };
    }
    // 其他節點（粗體、連結、行內程式碼……）仍在標題行裡；
    title.push(node);
  }
  // 整個段落都是標題行，沒有內文；
  return { title: cleanTitle(title), body };
}

// remark 外掛：把 Obsidian callout（`> [!type] 標題` 開頭的引用區塊）轉成
// `<div class="callout callout-type" data-callout="type">`，裡面有 `callout-title` 與 `callout-content` 兩個 div；
// 沒有 `[!…]` 開頭的引用區塊不動，仍然輸出 <blockquote>；
export function remarkCallout(): (tree: Root) => void {
  // 外掛回傳「轉換函式」；
  return (tree) => {
    // 我們自己產生的 content 區塊記在這裡，走訪時略過，避免內文第一行剛好長得像 [!x] 時被誤判成另一層 callout；WeakSet 只放物件且不阻止回收；
    const generated = new WeakSet<Blockquote>();
    // 只走訪 blockquote 節點；
    visit(tree, 'blockquote', (node) => {
      // 自己產生的內容區塊不處理；
      if (generated.has(node)) return;
      // 第一個子節點必須是段落；
      const para = node.children[0];
      // 不是段落就是一般引用；
      if (!para || para.type !== 'paragraph') return;
      // 段落的第一個行內節點必須是文字；
      const first = para.children[0];
      // 不是文字就是一般引用；
      if (!first || first.type !== 'text') return;
      // 檢查開頭是不是 `[!型別]`；
      const head = HEAD_RE.exec(first.value);
      // 不是就保持 blockquote；
      if (!head) return;
      // 型別一律小寫；
      const type = head[1].toLowerCase();
      // 摺疊記號；
      const fold = head[2] ? FOLD[head[2]] : undefined;
      // 拆出標題行與內文；
      const { title, body } = splitParagraph(first, para.children.slice(1), head[0].length);
      // 標題節點：用 paragraph 型別搭配 hName 改成 div，行內內容照一般方式轉換；沒有標題就用型別的首字大寫；
      const titleNode: Paragraph = { type: 'paragraph', children: title.length > 0 ? title : [text(capitalize(type))], data: { hName: 'div', hProperties: { className: ['callout-title'] } } };
      // 內容區塊的子節點：內文段落（若有）加上原本引用區塊的其餘區塊；
      const contentChildren: Blockquote['children'] = [];
      // 有內文才加段落；
      if (body.length > 0) contentChildren.push({ type: 'paragraph', children: body });
      // 其餘區塊（清單、程式碼、巢狀引用……）原樣放進去；
      contentChildren.push(...node.children.slice(1));
      // 外層屬性：class 與 data 屬性，摺疊記號有才加；
      const props: Record<string, string | string[]> = { className: ['callout', `callout-${type}`], 'data-callout': type };
      // 有摺疊記號才加 data-fold；
      if (fold) props['data-fold'] = fold;
      // 外層改成 div：保留 blockquote 型別讓 remark-rehype 照區塊處理（子節點之間插入換行），再用 hName 換標籤；
      node.data = { hName: 'div', hProperties: props };
      // 新的子節點：標題加（有內容才有的）內容區塊；
      node.children = [titleNode];
      // 有內容才加 content，避免輸出空 div；
      if (contentChildren.length > 0) {
        // 內容區塊同樣用 blockquote 型別加 hName 換成 div；
        const content: Blockquote = { type: 'blockquote', children: contentChildren, data: { hName: 'div', hProperties: { className: ['callout-content'] } } };
        // 記錄為自己產生的，走訪時略過它本身（它的子孫仍會被走訪，所以巢狀 callout 照常處理）；
        generated.add(content);
        // 加入；
        node.children.push(content);
      }
    });
  };
}
