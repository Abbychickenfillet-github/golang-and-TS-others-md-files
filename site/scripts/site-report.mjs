// ===== `npm run build` 的整條建置鏈（package.json 的 build；任何一步失敗就停在那一步，後面不會執行）=====
//   1. scripts/sync-assets.mjs       把筆記根目錄的 assets/（共用樣式與腳本）複製到 public/assets，讓 Next 原樣放進輸出；
//   2. scripts/site-report.mjs       （本檔）建置前整站檢查，寫 .build-report.json；STRICT_LINKS=1 且有歧義 wikilink 時在這裡失敗；
//   3. next build                    靜態匯出所有頁面（首頁與每篇筆記）到 out/（或 SITE_OUT_DIR）；
//   4. scripts/fix-export-names.mjs  把 Next 跳脫過的檔名（# ? \ → %23 等）改回與網址一致的原名；
//   5. scripts/prune-export.mjs      刪掉 Next 的 RSC 產物（X.txt、__next.*、__PAGE__.txt）；必須早於第 6 步，否則會誤刪同名的 .txt 附件；
//   6. scripts/copy-local-assets.mjs 把筆記引用的本地附件（圖片、pdf、頁面自己的 js／css…）複製進輸出，指到不發布的檔案只警告不複製；
//   7. scripts/write-nojekyll.mjs    寫空的 .nojekyll，GitHub Pages 才不會用 Jekyll 忽略 _next/；放最後，前面任何清理都碰不到它；
// 建置前的整站檢查：載入網站、把每篇筆記用與頁面相同的 renderNote 渲染一次，彙整所有警告後印出摘要並寫成 .build-report.json；
// 為什麼不在 next build 裡彙整：Next 用多個 worker 行程平行渲染頁面，每個行程只看得到自己那批頁面，沒有「全部頁面都渲染完」的掛鉤；
// 這支腳本在 next build 之前單獨跑完全部筆記，結果完整且確定；STRICT_LINKS=1 且有歧義連結時以結束碼 1 結束，npm 的 && 串接會讓 build 停在這裡；
// 用法：在 site/ 底下執行 `node scripts/site-report.mjs`（npm run build 會自動先跑它）；
// 匯入 fs 的 promise 版 API，用來寫報告檔；
import * as fs from 'node:fs/promises';
// 匯入 path 模組，用來組報告檔路徑；
import * as path from 'node:path';
// 匯入 module 的 register：註冊 ts-resolve-hook，讓 .ts 檔裡不寫副檔名的相對匯入也能被 Node 解析；
import { register } from 'node:module';

// 註冊 hook；第二個參數是基準網址，讓相對路徑從本檔所在資料夾算起；
register('./ts-resolve-hook.mjs', import.meta.url);
// 註冊之後才動態匯入 .ts（靜態 import 會在 register 之前就被解析）；頂層 await 是 ES 模組才有的語法；
const { loadSite, notesRootFromEnv, ambiguousKeysOf } = await import('../src/lib/site.ts');
// 匯入與頁面共用的渲染函式；
const { renderNote } = await import('../src/lib/render-note.ts');
// 匯入摘要格式化、嚴格模式檢查與 JSON 轉換；
const { formatReport, assertStrictLinks, reportToJson } = await import('../src/lib/report.ts');
// 匯入 basePath 讀取與驗證；
const { getBasePath } = await import('../src/lib/base-path.ts');

// 記下開始時間，最後印出耗時；Date.now() 回傳毫秒數；
const started = Date.now();
// basePath 不合法會在這裡丟錯；
const basePath = getBasePath();
// 載入網站（slug 衝突會在這裡丟錯）；
const site = await loadSite(notesRootFromEnv());
// 逐篇渲染，警告都寫進 site.report；for...of 搭配 await 依序處理；
for (const note of site.notes) await renderNote(site, note, basePath);
// 印出根目錄與篇數；
console.log(`site-report：${site.root}，發布 ${site.notes.length} 篇（md ${site.notes.filter((n) => n.kind === 'md').length}、html ${site.notes.filter((n) => n.kind === 'html').length}），耗時 ${((Date.now() - started) / 1000).toFixed(1)} 秒`);
// 印出摘要；
console.log(formatReport(site.report, ambiguousKeysOf(site)));
// 報告檔放在 site/ 底下（cwd），11b 用其中的 images 複製圖片；
const reportPath = path.resolve(process.cwd(), '.build-report.json');
// 寫成縮排 2 格的 JSON；
// pages 是每篇筆記的 slug 片段陣列，建置後的 fix-export-names.mjs 依它把 Next 跳脫過的檔名改回原名；
await fs.writeFile(reportPath, `${JSON.stringify({ root: site.root, basePath, notes: site.notes.length, pages: site.notes.map((n) => n.slug), ...reportToJson(site.report) }, null, 2)}\n`, 'utf8');
// 印出報告檔位置；
console.log(`site-report：報告已寫入 ${reportPath}`);
// 嚴格模式：有歧義連結就丟錯，未捕捉的錯誤會讓 Node 以結束碼 1 結束；
assertStrictLinks(site.report);
