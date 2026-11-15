// 用 interface 宣告元件的 props 形狀；
interface BlankProps {
  // answer 是這個填空的標準答案，之後由 Task 5 的腳本讀取來比對；
  answer: string;
}

// `export function` 具名匯出函式元件，解構取出 answer；
export function Blank({ answer }: BlankProps) {
  // 回傳 JSX：input 是空元素，必須自閉合 `/>`；
  // className 套 blank 外觀；data-a 是自訂資料屬性（data-*），把答案放進 DOM 供腳本讀取；
  return <input className="blank" data-a={answer} />;
}
