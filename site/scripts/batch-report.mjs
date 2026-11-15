// ===== 遷移前後的畫面比對報告（給 Abby 看的本機審查工具，不在 CI 執行）=====
// 用法（在 site/ 底下執行；路徑都是「筆記根目錄底下的相對路徑」，也可以給絕對路徑）：
//   node scripts/batch-report.mjs before <檔案…>    對每個 html 檔（file:// 網址）截圖，存到 report/before/<序號>-<安全檔名>.png
//   （執行 migrate-html-notes.mjs --apply 遷移）
//   node scripts/batch-report.mjs after <檔案…>     同一批檔案遷移後再截一次，存到 report/after/
//   node scripts/batch-report.mjs index             把 before 與 after 並排，寫成 report/index.html（圖片用相對路徑）
// 選項：--root <筆記根目錄>（預設環境變數 NOTES_ROOT，再退回上一層）；環境變數 BROWSER=msedge|chrome|<路徑> 可指定瀏覽器；
// 瀏覽器用本機已安裝的 Edge／Chrome，不下載任何東西；report/ 已列入 .gitignore；
// 每個階段的資料夾（before 或 after）在每次執行時會先清空並重寫 manifest.json，所以一批一批做，做完這批請先把 report/ 看完或搬走；
// 匯入 fs 與 fs 的 promise 版：existsSync 同步檢查檔案是否存在，promises 用來讀寫檔；
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import * as fs from 'node:fs/promises';
// 匯入 os 的 tmpdir：存放瀏覽器的暫存設定檔；
import { tmpdir } from 'node:os';
// 匯入 path 模組，用來組路徑與算相對路徑；
import * as path from 'node:path';
// 匯入 child_process 的 spawnSync：同步執行瀏覽器子行程並等它結束；
import { spawnSync } from 'node:child_process';
// 匯入 module 的 register：註冊 ts-resolve-hook，讓 .ts 檔裡不寫副檔名的相對匯入也能被 Node 解析；
import { register } from 'node:module';

// 註冊 hook；第二個參數是基準網址；
register('./ts-resolve-hook.mjs', import.meta.url);
// 註冊之後才動態匯入 .ts 純函式（檔名淨化、網址、瀏覽器參數、索引頁）；
const { SHOT_HEIGHT, browserCandidates, buildIndexHtml, fileUrl, screenshotArgs, shotFileName } = await import('../src/lib/batch-report.ts');

// 用法說明；
const USAGE = '用法：node scripts/batch-report.mjs before|after <檔案…> [--root <目錄>]；node scripts/batch-report.mjs index';

// 報告資料夾：site/report（cwd 是 site/）；
const reportDir = path.resolve(process.cwd(), 'report');

// 找一個可用的瀏覽器：依候選順序，路徑形式的檢查檔案是否存在，指令名稱形式的用 --version 試跑；
function findBrowser() {
  // 候選清單；
  for (const candidate of browserCandidates(process.env, process.platform)) {
    // 含路徑分隔：是檔案路徑，檢查存在即可；
    if (/[\\/]/.test(candidate)) {
      // 存在就用；
      if (existsSync(candidate)) return candidate;
    } else {
      // 指令名稱：試跑 --version，成功（結束碼 0）才算可用；
      const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
      // 可用；
      if (probe.status === 0) return candidate;
    }
  }
  // 都沒有：丟錯並說明怎麼指定；
  throw new Error('找不到 Edge 或 Chrome；請安裝其中一個，或用環境變數 BROWSER 指定瀏覽器的完整路徑');
}

// 解析參數：第一個是子指令，其餘是檔案路徑，--root 吃下一個值；
function parseArgs(argv) {
  // 子指令；
  const [command, ...rest] = argv;
  // 預設 root；
  let root = process.env.NOTES_ROOT ?? '..';
  // 檔案清單；
  const files = [];
  // 逐一處理；
  for (let i = 0; i < rest.length; i++) {
    // --root 後面是值；
    if (rest[i] === '--root') {
      // 沒給值就丟錯；
      if (i + 1 >= rest.length) throw new Error(`--root 後面需要一個值\n${USAGE}`);
      // 取值並前進；
      root = rest[i + 1];
      i += 1;
    } else files.push(rest[i]);
  }
  // 回傳；
  return { command, root: path.resolve(process.cwd(), root), files };
}

// 等檔案出現並寫完：每 200 毫秒檢查一次，檔案存在、大於 0 位元組、而且連續兩次大小相同才算寫完；超過 timeoutMs 回傳 false；
async function waitForFile(file, timeoutMs) {
  // 截止時間；
  const deadline = Date.now() + timeoutMs;
  // 上一次看到的大小；
  let last = -1;
  // 還沒逾時就繼續檢查；
  while (Date.now() < deadline) {
    // 檔案存在才讀大小；
    if (existsSync(file)) {
      // 取大小；
      const { size } = await fs.stat(file);
      // 大於 0 且與上次相同：寫完了；
      if (size > 0 && size === last) return true;
      // 記下這次的大小；
      last = size;
    }
    // 睡 200 毫秒；setTimeout 搭配 Promise 就是 async 版的 sleep；
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  // 逾時；
  return false;
}

// 對一批檔案截圖；phase 是 before 或 after；回傳是否全部成功；
async function shoot(phase, root, files) {
  // 至少要有一個檔案；
  if (files.length === 0) throw new Error(`${phase} 需要至少一個檔案路徑\n${USAGE}`);
  // 找瀏覽器；
  const browser = findBrowser();
  // 這個階段的資料夾：先清空再建立，避免留下上一批的舊圖；
  const dir = path.join(reportDir, phase);
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  // 瀏覽器用的暫存設定檔資料夾（每張截圖各用一個子資料夾，因為 Edge 的啟動程序會在截圖完成前就結束、真正的瀏覽器行程晚一點才關，共用設定檔會互相卡住）；
  const profile = mkdtempSync(path.join(tmpdir(), 'batch-report-'));
  // manifest：記錄序號、檔案路徑與截圖檔（相對於 report/）；
  const manifest = [];
  // 失敗計數；
  let failed = 0;
  // try/finally：不管成功失敗都清掉暫存設定檔；
  try {
    // 逐檔處理；entries() 同時給索引與項目；
    for (const [index, input] of files.entries()) {
      // 序號從 1 起；
      const n = index + 1;
      // 絕對路徑與統一正斜線的相對路徑；
      const abs = path.isAbsolute(input) ? input : path.resolve(root, input);
      const rel = path.relative(root, abs).replace(/\\/g, '/');
      // 檔案不存在就回報並繼續；
      if (!existsSync(abs)) {
        // 記一筆失敗；
        console.error(`${rel}: 找不到檔案`);
        failed += 1;
        continue;
      }
      // 截圖檔名與完整路徑；
      const name = shotFileName(n, rel);
      const png = path.join(dir, name);
      // 組參數並執行瀏覽器；timeout 60 秒避免卡住；每張截圖用自己的設定檔子資料夾；
      const result = spawnSync(browser, screenshotArgs({ png, url: fileUrl(abs), height: SHOT_HEIGHT, userDataDir: path.join(profile, String(n)) }), { encoding: 'utf8', timeout: 60_000 });
      // 成功條件：圖檔真的產生且寫完了；不能看結束碼，因為 Edge 的啟動程序幾十毫秒就以 0 結束，PNG 是之後才由真正的瀏覽器行程寫出的；
      if (!(await waitForFile(png, 60_000))) {
        // 回報失敗與瀏覽器的 stderr 前 200 字；
        console.error(`${rel}: 截圖失敗（等了 60 秒仍沒有圖檔；結束碼 ${result.status}）${String(result.stderr ?? '').slice(0, 200)}`);
        failed += 1;
        continue;
      }
      // 記進 manifest；
      manifest.push({ n, path: rel, png: `${phase}/${name}` });
      // 進度；
      console.log(`${phase}: ${rel} → report/${phase}/${name}`);
    }
  } finally {
    // 清暫存設定檔；瀏覽器行程可能還沒完全結束而佔著檔案，所以讓 rmSync 重試幾次，仍失敗就算了（留在系統暫存資料夾，不影響結果）；
    try {
      // maxRetries 與 retryDelay 是 Node 內建的重試選項；
      rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
    } catch {
      // 忽略清理失敗；
    }
  }
  // 寫 manifest；
  await fs.writeFile(path.join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  // 回傳是否全部成功；
  return failed === 0;
}

// 讀一個階段的 manifest；沒有就回傳空陣列；
async function readManifest(phase) {
  // try/catch：檔案不存在視為沒有這個階段；
  try {
    // 讀並解析；
    return JSON.parse(await fs.readFile(path.join(reportDir, phase, 'manifest.json'), 'utf8'));
  } catch {
    // 空；
    return [];
  }
}

// 產生 index.html；
async function writeIndex() {
  // 兩個階段的 manifest；
  const before = await readManifest('before');
  const after = await readManifest('after');
  // 依檔案路徑配對：先 before 的順序，再補只在 after 出現的；Map 保持插入順序；
  const byPath = new Map();
  // before 的每筆；
  for (const item of before) byPath.set(item.path, { path: item.path, before: item.png });
  // after 的每筆：已有就補上 after，沒有就新增；
  for (const item of after) byPath.set(item.path, { ...(byPath.get(item.path) ?? { path: item.path }), after: item.png });
  // 沒有任何截圖就提示先截圖；
  if (byPath.size === 0) throw new Error('report/ 底下沒有任何截圖，請先執行 before 或 after');
  // 寫檔；
  const indexPath = path.join(reportDir, 'index.html');
  await fs.writeFile(indexPath, buildIndexHtml([...byPath.values()]), 'utf8');
  // 告知位置；
  console.log(`索引已寫入 ${indexPath}（共 ${byPath.size} 份）`);
}

// 主流程；
async function main() {
  // 解析參數；
  const { command, root, files } = parseArgs(process.argv.slice(2));
  // 子指令分流；
  if (command === 'before' || command === 'after') return (await shoot(command, root, files)) ? 0 : 1;
  // 索引；
  if (command === 'index') {
    // 寫索引；
    await writeIndex();
    // 成功；
    return 0;
  }
  // 其他：說明用法；
  throw new Error(USAGE);
}

// 執行主流程；錯誤轉成訊息與結束碼 1；
try {
  // 設定結束碼；
  process.exitCode = await main();
} catch (error) {
  // 印訊息；
  console.error(error instanceof Error ? error.message : String(error));
  // 結束碼；
  process.exitCode = 1;
}
