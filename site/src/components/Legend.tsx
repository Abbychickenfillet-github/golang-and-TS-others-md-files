// 用 `export type` 匯出螢光筆種類的聯合型別（union type），以 `|` 列出所有允許的字面值，Task 4 會匯入它；
export type HighlightKind = 'core' | 'warn' | 'ok' | 'term' | 'data' | 'note';

// 用 interface 宣告 props 形狀，items 是由 kind 與 label 組成的物件陣列；
interface LegendProps {
  // `{ ... }[]` 是內聯物件型別加陣列，kind 限定為 HighlightKind，label 是圖例文字；
  items: { kind: HighlightKind; label: string }[];
}

// `export function` 具名匯出函式元件，解構取出 items；
export function Legend({ items }: LegendProps) {
  // 回傳 JSX；
  return (
    // 外層 div 套 legend 類別，字距 1.18em 由 note-theme.css 的 .legend span 負責；
    <div className="legend">
      {/* 用 map 把每項轉成一個 span； */}
      {items.map((item) => (
        // 用樣板字串（template literal）組出 hl-core、hl-warn 等類別名，key 用 kind 識別；
        <span className={`hl-${item.kind}`} key={item.kind}>
          {/* 插入圖例文字； */}
          {item.label}
        </span>
      ))}
    </div>
  );
}
