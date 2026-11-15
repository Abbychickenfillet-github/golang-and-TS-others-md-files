// 建置後驗證（npm run verify；T14 的 workflow 在 npm run build 之後執行，build 鏈本身不含它）：
//   一律失敗（結束碼 1）：私人檔案外洩（輸出裡有任何對應到 _config.yml exclude 或底線、點開頭名稱的路徑，不分大小寫、NFC 正規化）、敏感檔名（.env、.git、金鑰、建置報告等）、輸出超過大小上限；
//   STRICT_LINKS=1 才失敗：壞連結；否則印出前 30 筆（依頁面分組）、完整清單寫進 site/.verify-report.json，結束碼 0；
//   永遠只警告：缺少的 #錨點；
// 環境變數：SITE_OUT_DIR（輸出資料夾，預設 out）、NOTES_ROOT（含 _config.yml 的筆記根目錄，預設上一層）、BASE_PATH、STRICT_LINKS（只有 1 算嚴格）、
//   VERIFY_LIMIT_MB（大小上限，預設 950；GitHub Pages 約 1 GB 為未查證的暫定值）、VERIFY_FRAGMENTS（設成 0 關閉錨點檢查）；
// 邏輯都在 src/lib/verify/，本檔只負責讀環境變數、印出結果、設定結束碼；
// 用法：在 site/ 底下執行 `node scripts/verify.mjs`；
// 匯入 path 模組；
import * as path from 'node:path';
// 匯入 module 的 register：註冊 ts-resolve-hook，讓 .ts 檔裡不寫副檔名的相對匯入也能被 Node 解析；
import { register } from 'node:module';

// 註冊 hook；第二個參數是基準網址，讓相對路徑從本檔所在資料夾算起；
register('./ts-resolve-hook.mjs', import.meta.url);
// 註冊之後才動態匯入 .ts（靜態 import 會在 register 之前就被解析）；頂層 await 是 ES 模組才有的語法；
const { runVerify } = await import('../src/lib/verify/run-verify.ts');
// 匯入 _config.yml 的排除清單讀取；
const { loadExclude } = await import('../src/lib/content.ts');
// 匯入 basePath 讀取與驗證；
const { getBasePath } = await import('../src/lib/base-path.ts');

// 整段包在 try/catch：任何設定錯誤（讀不到 _config.yml、上限不是數字、basePath 不合法）都印出訊息並以結束碼 1 結束，不能默默放行；
try {
  // 輸出資料夾：與 next.config.ts 的 distDir 規則相同（SITE_OUT_DIR，預設 out）；
  const outDir = path.resolve(process.cwd(), process.env.SITE_OUT_DIR ?? 'out');
  // 筆記根目錄：與 src/lib/site.ts 的 notesRootFromEnv 規則相同（NOTES_ROOT，預設上一層）；這裡不匯入 site.ts，避免載入整個渲染管線；
  const root = path.resolve(process.cwd(), process.env.NOTES_ROOT ?? '..');
  // 讀排除清單；讀不到或格式錯誤會丟錯（失敗即關閉）；
  const exclude = await loadExclude(path.join(root, '_config.yml'));
  // 大小上限：沒設就用 950；有設就必須是大於 0 的有限數字；
  const limitText = process.env.VERIFY_LIMIT_MB;
  // `??` 在 undefined 時給預設值；
  const limitMb = limitText === undefined || limitText === '' ? 950 : Number(limitText);
  // Number.isFinite 排除 NaN 與 Infinity；
  if (!Number.isFinite(limitMb) || limitMb <= 0) throw new Error(`VERIFY_LIMIT_MB 必須是大於 0 的數字，目前是「${limitText}」`);
  // 執行全部檢查；
  const result = await runVerify({
    // 輸出資料夾；
    outDir,
    // 排除清單；
    exclude,
    // basePath 不合法會丟錯；
    basePath: getBasePath(),
    // 大小上限；
    limitMb,
    // 只有字串 '1' 才是嚴格模式；
    strictLinks: process.env.STRICT_LINKS === '1',
    // 只有字串 '0' 才關閉錨點檢查；
    fragments: process.env.VERIFY_FRAGMENTS !== '0',
    // 完整報告放在 cwd（site/）底下，已列入 .gitignore；
    reportPath: path.resolve(process.cwd(), '.verify-report.json'),
  });
  // 印出標準輸出的行；
  for (const line of result.stdout) console.log(line);
  // 印出失敗原因；console.error 寫到標準錯誤；
  for (const line of result.stderr) console.error(line);
  // 設定結束碼（不用 process.exit，讓輸出先寫完）；
  process.exitCode = result.exitCode;
} catch (error) {
  // 設定錯誤：印出訊息；
  console.error(`verify 失敗：${error instanceof Error ? error.message : String(error)}`);
  // 結束碼 1；
  process.exitCode = 1;
}
