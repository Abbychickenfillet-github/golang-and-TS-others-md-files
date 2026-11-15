// 讀取並驗證網站的子路徑前綴（環境變數 BASE_PATH）；這個檔案不匯入任何套件，next.config.ts 與建置腳本都能直接用；

// `export function` 具名匯出函式；參數 env 預設是 process.env，測試時可傳入假的環境物件；`Record<string, string | undefined>` 表示鍵是字串、值可能不存在；
export function getBasePath(env: Record<string, string | undefined> = process.env): string {
  // 取環境變數；`??` 在左邊是 undefined 或 null 時才用右邊的空字串；
  const raw = env.BASE_PATH ?? '';
  // 沒設定（或設成空字串）代表網站放在網域根目錄，前綴就是空字串；
  if (raw === '') return '';
  // 正規表示式：一個以上的「/ 加一段非空的路徑片段」；片段不可含 /、空白、反斜線、?、#、:，
  // 所以 //host（協定相對網址）、/a//b（空片段）、結尾的 /、https://x 這類 scheme 都不合格；`(…)+` 表示整組重複一次以上；
  if (!/^(\/[^/\s\\?#:]+)+$/.test(raw)) {
    // 格式不對就丟錯，讓建置立刻失敗（JSON.stringify 把值印成帶引號的字面形式，空白也看得出來）；
    throw new Error(`BASE_PATH 必須是 / 加路徑片段（例如 /Abby-notes），不能有 //、結尾的 /、空白、?、#、:；目前是 ${JSON.stringify(raw)}`);
  }
  // 驗證通過就原樣回傳；
  return raw;
}
