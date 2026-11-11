// 從 vitest/config 匯入 defineConfig，它只是個提供型別提示的輔助函式，原樣回傳你傳入的設定物件；
import { defineConfig } from 'vitest/config';

// `export default` 把設定物件當成此模組的預設匯出，vitest 啟動時會讀取它；
export default defineConfig({
  // test 區塊放 vitest 專屬設定；
  test: {
    // environment 設成 jsdom，讓測試裡有模擬的 document／window（之後的元件測試會用到）；
    environment: 'jsdom',
    // include 用 glob 限定只執行 tests 資料夾底下的測試檔，避免掃到 node_modules 或 .next；
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
