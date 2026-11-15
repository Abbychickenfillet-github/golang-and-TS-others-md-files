// 建置後驗證：輸出資料夾裡不得有「被排除的私人檔案」，也不得有敏感檔名（R32：這兩項一律讓 verify 失敗）；
// 匯入排除樣式的比對函式：isExcluded 與 listNotes 用的是同一份，所以「什麼算被排除」只有一種定義；
import { assertSupportedPatterns, isExcluded } from '../content';
// 匯入走訪工具；
import { listOut } from './walk';

// Next 自己會產生的底線或點開頭項目（只允許出現在輸出的最上層）：_next/（靜態資源）、.nojekyll（建置鏈最後一步寫的）、_not-found（404 頁）；
// 這些名稱雖然符合「底線或點開頭不發布」的規則，但不是筆記，是網站本身需要的；Set 讓 has() 查詢是常數時間；
const GENERATED_ROOT_ENTRIES = new Set(['_next', '.nojekyll', '_not-found.html', '_not-found']);

// 判斷一個輸出檔案是不是 Next 自己產生的最上層項目（本身，或在它底下）；大小寫要完全相同，`_NEXT` 不算；
function isGenerated(rel: string): boolean {
  // 第一段路徑；
  const first = rel.split('/')[0];
  // 在允許清單內才算；
  return GENERATED_ROOT_ENTRIES.has(first);
}

// 用「每一層前綴」檢查一條路徑是不是被排除：任何一層（資料夾或最後的檔案）被排除就整條算排除；
// 路徑與樣式都已經轉成小寫與 NFC，所以大小寫與 Unicode 寫法不同都不能繞過；
function pathExcluded(rel: string, patterns: string[]): boolean {
  // 切成片段；
  const parts = rel.split('/');
  // 逐層檢查；
  for (let i = 0; i < parts.length; i += 1) {
    // 到第 i 層為止的路徑；slice 取前 i+1 段再 join 接回；
    const prefix = parts.slice(0, i + 1).join('/');
    // 不是最後一段就是資料夾；
    const isDir = i < parts.length - 1;
    // 任何一層被排除，整條都算；
    if (isExcluded(prefix, isDir, patterns)) return true;
  }
  // 每一層都沒被排除；
  return false;
}

// 找出輸出資料夾裡對應到被排除路徑的檔案，回傳它們（原始大小寫）的相對路徑；找不到回傳空陣列；
// 比對方式：路徑與樣式一律轉 NFC 並轉小寫（不分大小寫的檔案系統上 Private/ 與 private/ 是同一個資料夾）；
// 輸出的 a/b.html 可能是由 a/b.md 轉出來的，所以 .html 檔同時用 .md 的名稱再比對一次（docs/*.md 這類樣式才抓得到）；
export function findPrivateLeaks(outDir: string, exclude: string[]): string[] {
  // 不支援的樣式（**、[ ]、{ }）失敗即關閉：丟錯，而不是默默比對不到；
  assertSupportedPatterns(exclude);
  // 樣式轉 NFC 與小寫；
  const patterns = exclude.map((p) => p.normalize('NFC').toLowerCase());
  // 外洩清單；
  const leaks: string[] = [];
  // 逐一檢查每個檔案（資料夾本身沒有內容，它底下的檔案會被檢查到）；
  for (const entry of listOut(outDir)) {
    // 資料夾與 Next 自己產生的最上層項目略過；
    if (entry.isDir || isGenerated(entry.rel)) continue;
    // 正規化後的路徑；
    const norm = entry.rel.normalize('NFC').toLowerCase();
    // 要比對的名稱：本身；若是 .html，再加上把 .html 換成 .md 的名稱；
    const candidates = norm.endsWith('.html') ? [norm, `${norm.slice(0, -'.html'.length)}.md`] : [norm];
    // 任何一個名稱被排除就算外洩；
    if (candidates.some((candidate) => pathExcluded(candidate, patterns))) leaks.push(entry.rel);
  }
  // 回傳；
  return leaks;
}

// 組出「列出前 limit 個路徑」的文字；超過的用「另有 N 個」收尾；
function listPaths(paths: string[], limit: number): string {
  // 前 limit 個，每個一行；
  const shown = paths.slice(0, limit).map((p) => `  - ${p}`).join('\n');
  // 超過就補一行；
  return paths.length > limit ? `${shown}\n  …另有 ${paths.length - limit} 個` : shown;
}

// 輸出資料夾有被排除的路徑就丟錯；錯誤訊息只含路徑，不含檔案內容；
export function assertNoPrivate(outDir: string, exclude: string[]): void {
  // 找外洩；
  const leaks = findPrivateLeaks(outDir, exclude);
  // 有就丟錯；
  if (leaks.length > 0) throw new Error(`私人檔案外洩：輸出資料夾裡有 ${leaks.length} 個路徑對應到被排除的原始路徑（_config.yml 的 exclude，或底線、點開頭的名稱）：\n${listPaths(leaks, 50)}`);
}

// 敏感檔名的判斷規則；全部以小寫比對；每個函式收「小寫的單一名稱（不含路徑）」，回傳是不是敏感；
// `(name: string) => boolean` 是函式型別；
const SENSITIVE_RULES: ((name: string) => boolean)[] = [
  // .env、.env.local、.envrc…（環境變數檔常含金鑰）；
  (name) => name.startsWith('.env'),
  // .git、.gitignore、.github、.gitattributes…（版本控制資料）；
  (name) => name.startsWith('.git'),
  // 開發過程產生的報告與雜物：這些在 site/ 底下，不該出現在 out/；
  (name) => ['.build-report.json', '.verify-report.json', '.ds_store', 'thumbs.db', 'node_modules', '.superpowers', '.npmrc'].includes(name),
  // 憑證與金鑰副檔名；
  (name) => ['.pem', '.key', '.pfx', '.p12'].some((ext) => name.endsWith(ext)),
  // SSH 金鑰（id_rsa、id_rsa.pub、id_ed25519…）；
  (name) => ['id_rsa', 'id_ed25519', 'id_ecdsa', 'id_dsa'].some((prefix) => name.startsWith(prefix)),
];

// 找出輸出資料夾裡名稱敏感的項目（檔案或資料夾，任何深度），回傳相對路徑；node_modules 這類資料夾只回報資料夾本身；
export function findSensitive(outDir: string): string[] {
  // 逐一檢查每個項目自己的名稱（路徑最後一段）；
  return listOut(outDir)
    // 取最後一段轉小寫後，任何一條規則成立就保留；`.at(-1)` 取陣列最後一個元素；
    .filter((entry) => {
      // 項目名稱；
      const name = (entry.rel.split('/').at(-1) ?? entry.rel).toLowerCase();
      // some 只要有一條規則成立就是敏感；
      return SENSITIVE_RULES.some((rule) => rule(name));
    })
    // 只留路徑；
    .map((entry) => entry.rel);
}

// 輸出資料夾有敏感檔名就丟錯；訊息只列路徑，絕不讀取或印出檔案內容；
export function assertNoSensitive(outDir: string): void {
  // 找敏感項目；
  const found = findSensitive(outDir);
  // 有就丟錯；
  if (found.length > 0) throw new Error(`輸出資料夾裡有 ${found.length} 個敏感檔名（環境變數檔、金鑰、.git、建置報告或雜物），不可部署：\n${listPaths(found, 50)}`);
}
