// 從 react 匯入 ReactNode 型別，`import type` 表示只在型別檢查時使用、編譯後會被抹除；
import type { ReactNode } from 'react';

// 用 interface 宣告元件的 props 形狀；
interface SnapDeckProps {
  // children 放卡片牆裡的每一張卡；
  children: ReactNode;
}

// `export function` 具名匯出函式元件，解構取出 children；
export function SnapDeck({ children }: SnapDeckProps) {
  // 回傳 JSX：div 套 snap-deck 類別，捲動吸附只在這個容器內生效，由 note-theme.css 提供；
  return (
    <div className="snap-deck">
      {/* 花括號插入 children，把外部傳進來的卡片放進容器裡； */}
      {children}
    </div>
  );
}
