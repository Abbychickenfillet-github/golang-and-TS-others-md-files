// `export function` 具名匯出函式元件，不需要 props，所以參數列留空；
export function MaskButtons() {
  // 回傳 JSX：用 fragment `<>...</>` 包住兩顆按鈕，fragment 不會在 DOM 多生一層元素；
  return (
    <>
      {/* 第一顆按鈕：type="button" 避免在表單內被當成送出鍵；data-note-action 是給 Task 5 腳本辨識動作的資料屬性；aria-label 讓純 emoji 按鈕有可朗讀的名稱； */}
      <button type="button" data-note-action="mask-all" aria-label="全部遮起來">
        {/* 按鈕文字只放 emoji，不加其他字； */}
        🙈
      </button>
      {/* 第二顆按鈕：全部顯示，屬性規則同上； */}
      <button type="button" data-note-action="show-all" aria-label="全部顯示">
        {/* 按鈕文字只放 emoji，不加其他字； */}
        👀
      </button>
    </>
  );
}
