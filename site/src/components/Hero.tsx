// 從 react 匯入 ReactNode 型別，`import type` 只在型別檢查時存在；
import type { ReactNode } from 'react';
// 匯入同資料夾的 Pills 元件，`./` 表示相對於目前檔案；
import { Pills } from './Pills';

// 用 interface 宣告 props 形狀；
interface HeroProps {
  // title 是頁首大標題文字；
  title: string;
  // pills 是標籤文字陣列，空陣列代表不顯示標籤列；
  pills: string[];
  // meta 加 `?` 表示可省略，可放來源、日期等任何節點；
  meta?: ReactNode;
}

// `export function` 具名匯出函式元件，解構取出三個 props；
export function Hero({ title, pills, meta }: HeroProps) {
  // 回傳 JSX；
  return (
    // header 搭配 hero 類別對應 note-theme.css 的 header.hero 漸層標題卡；
    <header className="hero">
      {/* h1 放頁面主標題； */}
      <h1>{title}</h1>
      {/* `&&` 短路運算：pills 有元素（長度非 0）才渲染 Pills，否則整段不輸出； */}
      {pills.length > 0 && <Pills items={pills} />}
      {/* `!== undefined &&` 判斷 meta 有傳才輸出 .meta 外框，用 div 包住，因為 meta 內可能是任意節點； */}
      {meta !== undefined && <div className="meta">{meta}</div>}
    </header>
  );
}
