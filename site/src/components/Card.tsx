// 從 react 匯入 ReactNode 型別，`import type` 表示只在型別檢查時使用、編譯後會被抹除；
import type { ReactNode } from 'react';

// 用 interface 宣告元件的 props 形狀，children 放卡片內容，id 加 `?` 表示可省略；
interface CardProps {
  // children 的型別 ReactNode 涵蓋文字、元素、陣列等任何可渲染內容；
  children: ReactNode;
  // 可選的 id，讓頁內錨點（#id）能跳到這張卡片；
  id?: string;
}

// `export function` 具名匯出函式元件，參數用解構 `{ children, id }` 直接取出 props 欄位；
export function Card({ children, id }: CardProps) {
  // 回傳 JSX：article 標籤加 className="card"（JSX 用 className 取代 class），樣式全由 note-theme.css 提供；
  return (
    // id 為 undefined 時 React 不會輸出該屬性，所以不用額外判斷；
    <article className="card" id={id}>
      {/* 花括號插入 children，把外部傳進來的內容放進卡片裡； */}
      {children}
    </article>
  );
}
