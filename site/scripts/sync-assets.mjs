// 匯入 fs 的 promise 版 API，用 `import * as` 收成命名空間 fs；
import * as fs from 'node:fs/promises';
// 匯入 path 模組，用來組合與解析路徑；
import * as path from 'node:path';
// 匯入 url 模組的 pathToFileURL，用來把檔案路徑轉成 file:// URL 以便和 import.meta.url 比對；
import { pathToFileURL } from 'node:url';

// JSDoc 區塊註解：讓 TypeScript 在 allowJs 下推得出參數與回傳型別，測試檔 import 時才有型別檢查；
/**
 * 把 srcDir 底下的所有檔案（含子資料夾）複製到 destDir，並回傳複製的檔案數。
 * @param {string} srcDir 來源資料夾
 * @param {string} destDir 目的資料夾
 * @returns {Promise<number>} 複製的檔案數
 */
// `export async function` 匯出具名的非同步函式，呼叫後回傳 Promise；
export async function syncAssets(srcDir, destDir) {
  // 確保目的資料夾存在，recursive 讓不存在的上層一併建立、已存在時不丟錯；
  await fs.mkdir(destDir, { recursive: true });
  // 讀出來源資料夾的所有項目，withFileTypes 讓回傳的每筆是 Dirent 物件，可直接問它是不是資料夾；
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  // 用 let 宣告計數器，後面會累加；
  let count = 0;
  // for...of 搭配 await 逐一處理每個項目，保持順序並避免同時開太多檔案；
  for (const entry of entries) {
    // 組出此項目在來源端的完整路徑；
    const from = path.join(srcDir, entry.name);
    // 組出此項目在目的端的完整路徑；
    const to = path.join(destDir, entry.name);
    // 如果此項目是資料夾，就遞迴處理；
    if (entry.isDirectory()) {
      // 遞迴呼叫自己複製子資料夾，並把子資料夾內的檔案數加進 count；`+=` 是加法賦值；
      count += await syncAssets(from, to);
      // 若是檔案則進入 else 分支；
    } else {
      // fs.copyFile 複製單一檔案，已存在的同名檔會被覆蓋；
      await fs.copyFile(from, to);
      // 複製完成後計數加一；`+= 1` 等同 count = count + 1；
      count += 1;
    }
  }
  // 回傳累計的檔案數；
  return count;
}

// 判斷此檔是否被當成程式入口執行（`node scripts/sync-assets.mjs`），被 import 時不執行下面的區塊；
// `process.argv[1]` 是入口腳本路徑，轉成 file URL 後與 `import.meta.url`（本模組自己的 URL）比對；
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // 讀環境變數 NOTES_ROOT 當筆記庫根目錄，`??` 在左邊是 undefined 或 null 時才用右邊預設值 '..'；
  const notesRoot = process.env.NOTES_ROOT ?? '..';
  // 把來源解析成絕對路徑：筆記庫根目錄底下的 assets 資料夾，path.resolve 以 cwd（site/）為基準；
  const src = path.resolve(process.cwd(), notesRoot, 'assets');
  // 把目的地解析成 site/public/assets，Next.js 會把 public 底下的檔案原樣放進輸出；
  const dest = path.resolve(process.cwd(), 'public', 'assets');
  // 先呼叫 syncAssets，用 .then 在完成時印出複製了幾個檔案；
  syncAssets(src, dest)
    // 箭頭函式接收檔案數 n，用樣板字串（反引號搭配 ${}）組出訊息；
    .then((n) => console.log(`syncAssets：已把 ${src} 的 ${n} 個檔案複製到 ${dest}`))
    // 失敗時印出錯誤並把結束碼設成 1，讓 npm 知道這一步失敗而中止 build；
    .catch((err) => {
      // console.error 把錯誤寫到 stderr；
      console.error(err);
      // 設定結束碼為 1（非 0 代表失敗）；
      process.exitCode = 1;
    });
}
