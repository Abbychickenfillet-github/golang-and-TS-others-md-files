// 從同資料夾匯入 MaskButtons，讓兩顆按鈕的屬性只維護一份；
import { MaskButtons } from './MaskButtons';

// 用 interface 宣告元件的 props 形狀；
interface QuizHeaderProps {
  // id 放在 h2 上，讓頁內錨點（#id）能跳到這個標題；
  id: string;
  // title 是標題文字；
  title: string;
}

// `export function` 具名匯出函式元件，參數用解構 `{ id, title }` 取出 props 欄位；
export function QuizHeader({ id, title }: QuizHeaderProps) {
  // 回傳 JSX：外層 div 套 quiz-head，flex 排版由 note-theme.css 負責；
  return (
    <div className="quiz-head">
      {/* h2 在左，id 屬性對應 props； */}
      <h2 id={id}>{title}</h2>
      {/* .quiz-actions 在右，包住 MaskButtons 輸出的兩顆按鈕；元件用 `<名稱 />` 的自閉合寫法呼叫； */}
      <div className="quiz-actions">
        <MaskButtons />
      </div>
    </div>
  );
}
