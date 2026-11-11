// 用 `import type` 只匯入型別 NextConfig，編譯後這行會被抹掉，不會產生執行期程式碼；
import type { NextConfig } from 'next';

// 宣告設定物件並用 `: NextConfig` 型別註記，讓編輯器能檢查欄位名稱與值；
const nextConfig: NextConfig = {
  // output 設成 'export' 讓 `next build` 產出純靜態檔到 out/，可直接部署到 GitHub Pages；
  output: 'export',
  // trailingSlash 設成 false，路徑不加結尾斜線（/a 而不是 /a/），輸出檔會是 a.html；
  trailingSlash: false,
  // images 區塊放圖片相關設定；
  images: {
    // unoptimized 設成 true 關閉 Next 內建圖片最佳化，靜態輸出沒有伺服器可做這件事；
    unoptimized: true,
  },
};

// `export default` 把設定物件匯出，Next.js 啟動與建置時會載入它；
export default nextConfig;
