// 建置後處理（R30）：刪掉 Next 為「用戶端換頁」產生的 RSC 產物，網站只用一般 <a> 整頁載入，用不到它們；
// 只刪這三種，其餘一律不動（_next/ 整個不碰）：
//   1. 頁面旁的 X.txt（X 必須是頁面：.build-report.json 的 pages、或根層的 index、_not-found、404，而且 X.html 存在）；
//   2. 檔名以 __next. 開頭的檔案（每頁同名資料夾裡的 __next._full.txt 等）；
//   3. 檔名是 __PAGE__.txt 的檔案；
// 刪完再由下往上移除「因此變空」的資料夾；可以重跑（第二次什麼都不刪）；
// 另外列出「X.html 與資料夾 X/ 並存、且 X/ 裡有真頁面」的情況（例如 a.md 與 a/ 底下的筆記），這是舊網站本來就有的並存；
// 用法：在 site/ 底下執行 `node scripts/prune-export.mjs`（npm run build 會在 fix-export-names 之後自動跑）；
// 匯入 fs 的 promise 版 API；
import * as fs from 'node:fs/promises';
// 匯入 path 模組；
import * as path from 'node:path';
// 匯入 pathToFileURL，用來判斷本檔是不是被直接執行；
import { pathToFileURL } from 'node:url';

// Next 自己的頁面（不在筆記清單裡，但旁邊也有 .txt）；
const BUILTIN_PAGES = ['index', '_not-found', '404'];

// 判斷檔案存不存在；
async function exists(p) {
  // fs.access 不存在時 reject，用 then 的兩個回呼轉成布林；
  return fs.access(p).then(() => true, () => false);
}

// 遞迴清理 dir（相對 outDir 的路徑是 rel）；回傳這個資料夾清理後是否變空；stats 累積刪除數；
async function pruneDir(outDir, rel, pageSet, stats) {
  // 實體路徑；
  const dir = path.join(outDir, rel);
  // 讀出項目；withFileTypes 讓每筆可以問是不是資料夾；
  const entries = await fs.readdir(dir, { withFileTypes: true });
  // 剩下幾個項目；
  let remaining = entries.length;
  // 逐項處理；
  for (const entry of entries) {
    // 這個項目的相對路徑（正斜線）；
    const childRel = rel === '' ? entry.name : `${rel}/${entry.name}`;
    // 資料夾：_next 不碰，其他遞迴；
    if (entry.isDirectory()) {
      // 根層的 _next 是 Next 的靜態資源；
      if (childRel === '_next') continue;
      // 遞迴；變空就刪掉這個資料夾；
      if (await pruneDir(outDir, childRel, pageSet, stats)) {
        // rmdir 只刪空資料夾，萬一不空會丟錯而不是誤刪；
        await fs.rmdir(path.join(outDir, childRel));
        // 計數；
        stats.folders += 1;
        // 少一個項目；
        remaining -= 1;
      }
      // 下一項；
      continue;
    }
    // 是不是頁面旁的 X.txt：去掉 .txt 後是頁面，而且 X.html 存在；
    const pageTxt = entry.name.endsWith('.txt') && pageSet.has(childRel.slice(0, -4)) && (await exists(path.join(outDir, `${childRel.slice(0, -4)}.html`)));
    // 三種要刪的檔案之一；
    if (pageTxt || entry.name.startsWith('__next.') || entry.name === '__PAGE__.txt') {
      // 先取大小再刪；
      const { size } = await fs.stat(path.join(outDir, childRel));
      // 刪檔；
      await fs.unlink(path.join(outDir, childRel));
      // 計數；
      stats.files += 1;
      // 累計位元組；
      stats.bytes += size;
      // 少一個項目；
      remaining -= 1;
    }
  }
  // 根目錄永遠不算變空（不刪 outDir 本身）；
  return rel !== '' && remaining === 0;
}

// 清理輸出資料夾；pages 是每篇筆記的 slug 陣列；回傳 { files, bytes, folders }；
export async function pruneExport(outDir, pages) {
  // 頁面集合：筆記 slug 用 / 接起來，加上 Next 自己的頁面；
  const pageSet = new Set([...pages.map((slug) => slug.join('/')), ...BUILTIN_PAGES]);
  // 計數器；
  const stats = { files: 0, bytes: 0, folders: 0 };
  // 從根層開始；
  await pruneDir(outDir, '', pageSet, stats);
  // 回傳；
  return stats;
}

// 列出「X.html 與資料夾 X/ 並存」的 X（相對路徑，正斜線，排序）；清理之後剩下的資料夾都含真內容；
export async function findCoexistingFolders(outDir) {
  // 結果；
  const found = [];
  // 遞迴走訪；
  const walk = async (rel) => {
    // 讀出項目；
    const entries = await fs.readdir(path.join(outDir, rel), { withFileTypes: true });
    // 這層的資料夾名稱集合；
    const dirs = new Set(entries.filter((e) => e.isDirectory()).map((e) => e.name));
    // 逐項處理；
    for (const entry of entries) {
      // 相對路徑；
      const childRel = rel === '' ? entry.name : `${rel}/${entry.name}`;
      // 根層的 _next 不看；
      if (childRel === '_next') continue;
      // 資料夾就遞迴；
      if (entry.isDirectory()) await walk(childRel);
      // X.html 且同層有 X/ 資料夾；
      else if (entry.name.endsWith('.html') && dirs.has(entry.name.slice(0, -5))) found.push(childRel.slice(0, -5));
    }
  };
  // 從根層開始；
  await walk('');
  // 排序後回傳；
  return found.sort();
}

// 直接執行時：讀報告、清理 SITE_OUT_DIR（預設 out）；
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // 輸出資料夾，與 next.config.ts 的 distDir 規則相同；
  const outDir = path.resolve(process.cwd(), process.env.SITE_OUT_DIR ?? 'out');
  // 讀 site-report.mjs 寫的報告；
  const report = JSON.parse(await fs.readFile(path.resolve(process.cwd(), '.build-report.json'), 'utf8'));
  // 清理；
  const stats = await pruneExport(outDir, report.pages);
  // 印出結果；toFixed(1) 取一位小數；
  console.log(`prune-export：刪除 ${stats.files} 個 RSC 檔（${(stats.bytes / 1024 / 1024).toFixed(1)} MB）、${stats.folders} 個變空的資料夾`);
  // 並存的資料夾；
  const coexisting = await findCoexistingFolders(outDir);
  // 印出數量與前 10 個；
  console.log(`prune-export：頁面 X.html 與資料夾 X/ 並存（X/ 裡有真頁面）：${coexisting.length} 個${coexisting.length > 0 ? `，前 10 個：\n  ${coexisting.slice(0, 10).join('\n  ')}` : ''}`);
}
