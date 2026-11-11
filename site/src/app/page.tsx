// 匯入快取版的網站載入函式；
import { getSite } from '../lib/site';
// 匯入網址編碼工具；
import { encodeSitePath } from '../lib/render-note';
// 匯入 basePath 讀取；
import { getBasePath } from '../lib/base-path';

// 暫時的首頁（11b 會換成依資料夾分組的正式首頁）：列出所有筆記的連結，讓 next build 有 / 這個路由；
export default async function Home() {
  // 載入網站；
  const site = await getSite();
  // 讀取前綴；
  const basePath = getBasePath();
  // 回傳 JSX；
  return (
    // 與筆記頁相同的外層結構；
    <div className="wrap">
      {/* 主要內容區； */}
      <main className="content">
        {/* 頁面標題； */}
        <h1>Abby 的筆記</h1>
        {/* 筆記清單； */}
        <ul>
          {/* 每篇一個連結；網址是 slug 逐段編碼；relPath 唯一，當 key； */}
          {site.notes.map((note) => (
            // 清單項目；
            <li key={note.relPath}>
              {/* 一般 a 連結（整頁載入，讓每頁自己的腳本都會執行）； */}
              <a href={encodeSitePath(note.slug.join('/'), basePath)}>{note.title}</a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
