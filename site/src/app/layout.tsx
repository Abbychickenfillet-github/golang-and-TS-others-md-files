// `import type` 只匯入型別：Metadata 描述頁面 <head> 的標題等資訊，ReactNode 是任何可渲染內容；
import type { Metadata } from 'next';
// 匯入型別；
import type { ReactNode } from 'react';
// 匯入 next/script 的 Script 元件：strategy 決定腳本何時載入；
import Script from 'next/script';
// 匯入 basePath 讀取（共用樣式與腳本的網址要加上前綴）；
import { getBasePath } from '../lib/base-path';

// 網站預設的 metadata；title.template 的 %s 會被各頁 generateMetadata 回傳的標題取代；
export const metadata: Metadata = {
  // 標題設定：預設值與樣板；
  title: { default: 'Abby 的筆記', template: '%s｜Abby 的筆記' },
};

// 根 layout：所有頁面共用的 html 外殼；不用 next/font/google（離線或 CI 建置會因下載字型失敗），字型由 note-theme.css 的字型堆疊提供；
export default function RootLayout({ children }: { children: ReactNode }) {
  // 讀取前綴；
  const basePath = getBasePath();
  // 回傳 JSX；
  return (
    // lang 設成 zh-TW，讓瀏覽器與螢幕閱讀器以繁體中文處理；
    <html lang="zh-TW">
      {/* head 放共用樣式表：主題與 notes.css（.toc、.term 的樣式）； */}
      <head>
        {/* 主題樣式（色票、卡片、版面）；網址加上前綴； */}
        <link rel="stylesheet" href={`${basePath}/assets/note-theme.css`} />
        {/* 大綱與名詞 hover 的樣式； */}
        <link rel="stylesheet" href={`${basePath}/assets/notes.css`} />
      </head>
      {/* body 放頁面內容； */}
      <body>
        {/* 花括號插入各頁內容； */}
        {children}
        {/* 共用腳本：afterInteractive 在 hydration 之後才插入並執行，不會干擾 React 對 DOM 的比對（R4）；兩支腳本內建 ready() 與重複初始化防護； */}
        <Script src={`${basePath}/assets/notes.js`} strategy="afterInteractive" />
        {/* 遮罩切換腳本；note-quiz.js 不放這裡：用到它的頁面在解析時就同步呼叫 NoteQuiz，所以由頁面在自己的腳本前同步載入； */}
        <Script src={`${basePath}/assets/note-mask.js`} strategy="afterInteractive" />
      </body>
    </html>
  );
}
