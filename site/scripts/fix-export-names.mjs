// 建置後處理：Next 匯出時會把路徑片段裡的 # ? \ 百分比編碼成 %23 %3F %5C 當檔名（見 next/dist/shared/lib/router/utils/escape-path-delimiters.js），
// 例如筆記「特殊/C# 筆記」被寫成 out/特殊/C%23 筆記.html；但連結網址 /特殊/C%23%20筆記 被伺服器解碼後找的是 C# 筆記.html，
// 所以這支腳本依 .build-report.json 的 pages（每篇筆記的 slug）把被跳脫的檔名與資料夾名改回原名，讓「網址、檔名、wikilink」三者一致；
// 用法：在 site/ 底下執行 `node scripts/fix-export-names.mjs`（npm run build 會在 next build 之後自動跑）；
// 匯入 fs 的 promise 版 API；
import * as fs from 'node:fs/promises';
// 匯入 path 模組；
import * as path from 'node:path';
// 匯入 pathToFileURL，用來判斷本檔是不是被直接執行；
import { pathToFileURL } from 'node:url';

// 與 Next 的 escapePathDelimiters 相同的跳脫；escapeEncoded 為 true 時連已編碼的 %23 等也再編碼一次；
export function escapeSegment(segment, escapeEncoded) {
  // 正規表示式：# ? \ 這幾個字元（以及可選的 %2f %23 %3f %5c），每個比對到的字串交給 encodeURIComponent；/gi 全域、不分大小寫；
  return segment.replace(new RegExp(`([/#?\\\\]${escapeEncoded ? '|%(2f|23|3f|5c)' : ''})`, 'gi'), (char) => encodeURIComponent(char));
}

// 判斷路徑存不存在；fs.access 不存在時會 reject，用 then／catch 轉成布林；
async function exists(p) {
  // 存在回傳 true，否則 false；
  return fs.access(p).then(() => true, () => false);
}

// 把 dir 底下名為 escaped 的項目改名成 wanted；wanted 已存在就不動並回傳 false（避免覆蓋）；
async function renameIfNeeded(dir, wanted, escapedNames, log) {
  // 目標名稱已存在就不用改；
  if (await exists(path.join(dir, wanted))) return false;
  // 逐一嘗試可能被跳脫的名稱；
  for (const escaped of escapedNames) {
    // 與目標相同就跳過；
    if (escaped === wanted) continue;
    // 被跳脫的名稱存在才改名；
    if (await exists(path.join(dir, escaped))) {
      // fs.rename 改名（同一資料夾內）；
      await fs.rename(path.join(dir, escaped), path.join(dir, wanted));
      // 記錄；
      log.push(`${path.join(dir, escaped)} → ${wanted}`);
      // 改過了；
      return true;
    }
  }
  // 沒有可改的；
  return false;
}

// 依 slug 清單修正輸出資料夾內的檔名；回傳改名紀錄陣列；
export async function fixExportNames(outDir, pages) {
  // 改名紀錄；
  const log = [];
  // 逐篇處理；
  for (const slug of pages) {
    // 目前所在的資料夾（實際存在的路徑）；
    let dir = outDir;
    // 逐段處理；entries() 同時給出索引與片段；
    for (const [i, segment] of slug.entries()) {
      // 兩種跳脫方式的結果；new Set 去重；
      const variants = [...new Set([escapeSegment(segment, false), escapeSegment(segment, true)])];
      // 不需要跳脫的片段（大多數）直接往下走；every 檢查全部變體都等於原名；
      if (variants.every((v) => v === segment)) {
        // 進入下一層；
        dir = path.join(dir, segment);
        // 下一段；
        continue;
      }
      // 最後一段：頁面檔（.html）、RSC 資料（.txt）與同名資料夾都要改；中間段：只有資料夾；
      const suffixes = i === slug.length - 1 ? ['.html', '.txt', ''] : [''];
      // 逐一改名；
      for (const suffix of suffixes) await renameIfNeeded(dir, `${segment}${suffix}`, variants.map((v) => `${v}${suffix}`), log);
      // 進入下一層（改名後的原名）；
      dir = path.join(dir, segment);
    }
  }
  // 回傳紀錄；
  return log;
}

// 直接執行時：讀報告、修正 SITE_OUT_DIR（預設 out）；被 import 時不執行；
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // 輸出資料夾，與 next.config.ts 的 distDir 規則相同；
  const outDir = path.resolve(process.cwd(), process.env.SITE_OUT_DIR ?? 'out');
  // 讀 site-report.mjs 寫的報告；
  const report = JSON.parse(await fs.readFile(path.resolve(process.cwd(), '.build-report.json'), 'utf8'));
  // 修正；
  const log = await fixExportNames(outDir, report.pages);
  // 印出結果；
  console.log(`fix-export-names：改名 ${log.length} 個項目${log.length > 0 ? `\n  ${log.join('\n  ')}` : ''}`);
}
