// 建置後處理：把已發布筆記「引用到的本地非筆記檔案」（圖片、pdf、zip、頁面自己的 .js／.css 等）複製進輸出資料夾，路徑與筆記庫相同；
// 為什麼路徑要相同：html 筆記用「相對於頁面」的網址引用附件，md 的圖片嵌入用「/」開頭的絕對網址（basePath＋逐段編碼的 relPath），保持原路徑兩種都找得到；
// 引用來源：（1）md 管線記錄的 ![[圖片]]，取自 site-report.mjs 寫的 .build-report.json 的 images；（2）html 筆記的 src、href、srcset、poster、樣式表與腳本；（3）md 裡的 [x](相對路徑) 與 ![x](相對路徑)；
// 隱私：指到「不發布」檔案（_config.yml 的 exclude、點或底線開頭、node_modules）的引用絕不複製，只列入警告；找不到的檔案也列入警告；
// 順序：必須在 prune-export.mjs 之後執行，否則 prune 會把檔名恰好與頁面同名的 .txt 附件當成 RSC 產物刪掉（測試會檢查 package.json 的順序）；
// 為什麼不重新渲染全部筆記：圖片清單已由建置前的 site-report.mjs 算好，這裡只要 loadSite（讀檔，不渲染）加上掃描引用，數秒內完成；
// 用法：在 site/ 底下執行 `node scripts/copy-local-assets.mjs`（npm run build 會在 prune-export 之後自動跑）；
// 匯入 fs 的 promise 版 API；
import * as fs from 'node:fs/promises';
// 匯入 path 模組；
import * as path from 'node:path';
// 匯入 module 的 register：註冊 ts-resolve-hook，讓 .ts 檔裡不寫副檔名的相對匯入也能被 Node 解析；
import { register } from 'node:module';

// 註冊 hook；第二個參數是基準網址，讓相對路徑從本檔所在資料夾算起；
register('./ts-resolve-hook.mjs', import.meta.url);
// 註冊之後才動態匯入 .ts（靜態 import 會在 register 之前就被解析）；頂層 await 是 ES 模組才有的語法；
const { loadSite, notesRootFromEnv } = await import('../src/lib/site.ts');
// 匯入排除清單讀取；
const { loadExclude } = await import('../src/lib/content.ts');
// 匯入收集、複製與報告函式；
const { collectLocalAssets, copyLocalAssets, dirSize, formatLocalAssetsReport, localAssetsToJson } = await import('../src/lib/local-assets.ts');

// 記下開始時間，最後印出耗時；
const started = Date.now();
// 輸出資料夾：與 next.config.ts 的 distDir 規則相同（SITE_OUT_DIR，預設 out）；
const outDir = path.resolve(process.cwd(), process.env.SITE_OUT_DIR ?? 'out');
// 報告檔路徑（site-report.mjs 寫的）；
const reportPath = path.resolve(process.cwd(), '.build-report.json');
// 輸出資料夾必須已存在（本腳本在 next build 之後執行）；
if (!(await fs.stat(outDir).then((s) => s.isDirectory(), () => false))) throw new Error(`找不到輸出資料夾 ${outDir}，請先執行 next build`);
// 讀建置前報告；找不到就丟錯，因為圖片清單在裡面；
const buildReport = JSON.parse(await fs.readFile(reportPath, 'utf8').catch(() => { throw new Error(`找不到 ${reportPath}，請先執行 node scripts/site-report.mjs`); }));
// 載入網站（與 site-report 相同的發布清單）；
const site = await loadSite(notesRootFromEnv());
// 報告檔必須是同一個筆記根目錄算出來的，避免拿別的筆記庫的圖片清單來複製；
if (path.resolve(buildReport.root) !== site.root) throw new Error(`.build-report.json 的 root（${buildReport.root}）與目前的筆記根目錄（${site.root}）不同，請重新執行 site-report.mjs`);
// 排除清單；
const exclude = await loadExclude(path.join(site.root, '_config.yml'));
// 收集要複製的檔案與警告；
const report = await collectLocalAssets(site, exclude, buildReport.images ?? []);
// 複製；
const stats = await copyLocalAssets(site.root, outDir, report.files);
// 複製後輸出資料夾的總大小；
const outBytes = await dirSize(outDir);
// 印出摘要；
console.log(`copy-local-assets：${site.root} → ${outDir}，耗時 ${((Date.now() - started) / 1000).toFixed(1)} 秒`);
// 印出報告本體；
console.log(formatLocalAssetsReport(report, stats, outBytes));
// 把結果併進 .build-report.json（site-report 每次建置都會重寫整份檔案，所以不會殘留舊資料）；展開運算子保留原有欄位；
await fs.writeFile(reportPath, `${JSON.stringify({ ...buildReport, localAssets: localAssetsToJson(report, stats, outBytes) }, null, 2)}\n`, 'utf8');
