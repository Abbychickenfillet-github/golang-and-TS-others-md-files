// 匯入 unist-util-visit 的 visit：走訪語法樹的每個節點；
import { visit } from 'unist-util-visit';
// 匯入 mdast 的型別；`import type` 只在編譯期存在；
import type { Definition, Image, Link, Root } from 'mdast';

// `export type` 匯出型別別名：外掛選項；rewrite 回傳新的網址，回傳 null 或 undefined 代表不改；
export type RemarkRewriteHrefOptions = { rewrite: (href: string) => string | null | undefined };

// remark 外掛：改寫 Markdown 連結（[t](url)）、參考定義（[r]: url）與圖片（![a](url)）的網址；
// 只看這三種節點，所以行內程式碼與圍欄程式碼裡長得像連結的文字天然不受影響；
export function remarkRewriteHref(opts: RemarkRewriteHrefOptions): (tree: Root) => void {
  // 外掛回傳轉換函式；
  return (tree) => {
    // 第二個參數是要走訪的節點型別清單；回呼收到每個符合的節點；
    visit(tree, ['link', 'definition', 'image'], (node) => {
      // 三種節點都有 url 欄位；`as` 把聯集斷言成其中之一的形狀；
      const target = node as Link | Definition | Image;
      // 交給呼叫端決定；
      const next = opts.rewrite(target.url);
      // 有新網址才改（null 與 undefined 都略過；`!= null` 同時排除兩者）；
      if (next != null) target.url = next;
    });
  };
}
