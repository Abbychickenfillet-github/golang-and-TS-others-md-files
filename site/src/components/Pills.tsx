// 用 interface 宣告 props 形狀，items 是字串陣列，每個字串是一顆標籤的文字；
interface PillsProps {
  // `string[]` 表示字串組成的陣列型別；
  items: string[];
}

// `export function` 具名匯出函式元件，解構取出 items；
export function Pills({ items }: PillsProps) {
  // 回傳 JSX；
  return (
    // 外層 div 套 pills 類別，橫向排列與字距都由 note-theme.css 處理，這裡不寫任何 style；
    <div className="pills">
      {/* 用 map 把每個字串轉成一個 span，花括號內是 JS 表達式； */}
      {items.map((item) => (
        // key 是 React 列表必備屬性，用標籤文字當識別（同一組標籤不會重複）；
        <span className="pill" key={item}>
          {/* 插入標籤文字； */}
          {item}
        </span>
      ))}
    </div>
  );
}
