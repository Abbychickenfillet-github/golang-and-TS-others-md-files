// 建置後處理：在輸出資料夾寫一個空的 .nojekyll；
// 為什麼需要：GitHub Pages 預設用 Jekyll 處理網站，Jekyll 會略過底線開頭的資料夾（_next/），網站的 JS 與 CSS 就全部 404；有 .nojekyll 才會原樣發布；
// 順序：放在建置鏈的最後一步（在 prune-export 與 copy-local-assets 之後），這樣前面任何一步清理或複製都不會影響到它；
// 用法：在 site/ 底下執行 `node scripts/write-nojekyll.mjs`（npm run build 會自動跑）；
// 匯入 fs 的 promise 版 API；
import * as fs from 'node:fs/promises';
// 匯入 path 模組；
import * as path from 'node:path';
// 匯入 pathToFileURL，用來判斷本檔是不是被直接執行；
import { pathToFileURL } from 'node:url';

// 寫空的 .nojekyll 到 outDir；outDir 不存在會丟錯（代表 next build 沒產出，不該默默建一個空資料夾）；回傳檔案路徑；
export async function writeNojekyll(outDir) {
  // 輸出資料夾必須已存在；stat 不存在會丟 ENOENT；
  await fs.stat(outDir);
  // 目標檔案路徑；
  const file = path.join(outDir, '.nojekyll');
  // 寫入空字串（內容不重要，只看檔案存不存在）；已存在就覆蓋，所以可以重跑；
  await fs.writeFile(file, '');
  // 回傳路徑；
  return file;
}

// 直接執行時：輸出資料夾與 next.config.ts 的 distDir 規則相同（SITE_OUT_DIR，預設 out）；
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // 解析成絕對路徑；
  const outDir = path.resolve(process.cwd(), process.env.SITE_OUT_DIR ?? 'out');
  // 寫檔；
  const file = await writeNojekyll(outDir);
  // 印出結果；
  console.log(`write-nojekyll：已寫入 ${file}`);
}
