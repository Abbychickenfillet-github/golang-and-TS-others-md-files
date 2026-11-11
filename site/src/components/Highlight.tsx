// 從 react 匯入 ReactNode 型別，`import type` 表示只在型別檢查時使用、編譯後會被抹除；
import type { ReactNode } from 'react';
// 從 Legend 匯入螢光筆種類型別（controller 裁定 R10：型別只有一個來源，不在這裡重複宣告）；
import type { HighlightKind } from './Legend';

// 用 interface 宣告元件的 props 形狀；
interface HighlightProps {
  // kind 限定為六種語意名稱之一，打錯字時 TypeScript 會在編譯時報錯；
  kind: HighlightKind;
  // children 放被螢光筆標起來的文字；
  children: ReactNode;
}

// `export function` 具名匯出函式元件，解構取出 kind 與 children；
export function Highlight({ kind, children }: HighlightProps) {
  // 回傳 JSX：mark 是語意化的標記文字標籤；
  return (
    // className 用樣板字串（template literal）組出 `hl hl-core` 之類的類別，顏色由 note-theme.css 提供；
    <mark className={`hl hl-${kind}`}>
      {/* 花括號插入 children，把外部傳進來的文字放進標記裡； */}
      {children}
    </mark>
  );
}
