// 用 `import type` 只匯入型別 NextConfig，編譯後這行會被抹掉，不會產生執行期程式碼；
import type { NextConfig } from 'next';
// 匯入 basePath 讀取與驗證（BASE_PATH 不合法會在載入設定時就丟錯）；
import { getBasePath } from './src/lib/base-path';

// 讀取並驗證子路徑前綴；空字串代表網站放在網域根目錄；
const basePath = getBasePath();
// 輸出資料夾：環境變數 SITE_OUT_DIR（建置測試用 out-fixture，避免蓋掉開發者的 out/）；
// 在 output: 'export' 下，自訂的 distDir 就是匯出目的地（中間產物仍放 .next），見 next/dist/export/utils.js 的 hasCustomExportOutput；
const outDir = process.env.SITE_OUT_DIR;

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
  // 有前綴才設定 basePath（_next 的 js／css 網址也會加上它）；`...(條件 ? {…} : {})` 是「有值才加欄位」的展開寫法；
  ...(basePath !== '' ? { basePath } : {}),
  // 有指定輸出資料夾才設定 distDir；沒指定時維持預設，匯出到 out/；
  ...(outDir ? { distDir: outDir } : {}),
};

// `export default` 把設定物件匯出，Next.js 啟動與建置時會載入它；
export default nextConfig;
