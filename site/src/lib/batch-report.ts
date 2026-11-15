// 匯入 Node 內建 url 模組的 pathToFileURL：把本機絕對路徑轉成 file:// 網址（中文與空白會自動百分號編碼）；
import { pathToFileURL } from 'node:url';

// 截圖視窗寬度；
export const SHOT_WIDTH = 1280;
// 截圖視窗高度：刻意固定，而不是依頁面實際高度；非常長的頁面只截到這個高度，是為了讓整批截圖大小可預期、比對報告不會被超長頁面拖垮；
export const SHOT_HEIGHT = 2600;

// 把筆記相對路徑轉成安全的檔名片段：去掉 .html、把路徑分隔與非「字母、數字、點、底線、連字號」的字元換成連字號、合併連續連字號、截到 80 字；
export function safeName(relPath: string): string {
  // 去掉結尾的 .html（不分大小寫）；
  const base = relPath.replace(/\.html$/i, '');
  // \p{L} 與 \p{N} 是 Unicode 的「字母」與「數字」類別（需要 u 旗標），所以中文會保留；其餘連續字元換成單一連字號；
  const dashed = base.replace(/[^\p{L}\p{N}._-]+/gu, '-');
  // 去掉頭尾的連字號，並截斷；Array.from 以「字元」為單位切，避免把代理對（emoji）切一半；
  const cut = Array.from(dashed.replace(/^-+|-+$/g, '')).slice(0, 80).join('');
  // 再去一次頭尾連字號（截斷可能留下結尾的 -）；空字串退回 page；
  return cut.replace(/^-+|-+$/g, '') || 'page';
}

// 截圖檔名：兩位數序號（不足補零）+ 連字號 + 安全名稱 + .png；
export function shotFileName(n: number, relPath: string): string {
  // padStart(2, '0') 把 3 補成 03，12 維持原樣；
  return `${String(n).padStart(2, '0')}-${safeName(relPath)}.png`;
}

// 把本機絕對路徑轉成 file:// 網址；
export function fileUrl(absPath: string): string {
  // pathToFileURL 回傳 URL 物件，href 是完整字串；
  return pathToFileURL(absPath).href;
}

// Windows 上 Edge 與 Chrome 的標準安裝位置（x86 與 x64 各一）；
const WIN_EDGE = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'];
const WIN_CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'];
// Linux 與 macOS 常見的指令或路徑；
const OTHER_EDGE = ['microsoft-edge', 'microsoft-edge-stable', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'];
const OTHER_CHROME = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];

// 依環境變數與平台列出候選瀏覽器（依優先順序；路徑或指令名稱）：
//   BROWSER 若是 msedge 或 chrome 這類名稱，就把對應瀏覽器的常見位置排最前面；若是其他字串，當成路徑或指令直接排第一；
//   之後依平台補上 Edge 與 Chrome 的常見位置，呼叫端依序檢查哪一個存在；
export function browserCandidates(env: { BROWSER?: string }, platform: string): string[] {
  // 依平台選常見位置；
  const edge = platform === 'win32' ? WIN_EDGE : OTHER_EDGE;
  const chrome = platform === 'win32' ? WIN_CHROME : OTHER_CHROME;
  // 結果；
  const list: string[] = [];
  // 讀環境變數並去掉空白；
  const wanted = (env.BROWSER ?? '').trim();
  // 有指定時；
  if (wanted !== '') {
    // 小寫比對名稱；
    const key = wanted.toLowerCase();
    // msedge、edge 這類名稱：Edge 的位置排前面，然後才是 Chrome；
    if (key === 'msedge' || key === 'edge' || key === 'microsoft-edge') list.push(...edge, ...chrome);
    // chrome、chromium 這類名稱：Chrome 的位置排前面；
    else if (key === 'chrome' || key === 'google-chrome' || key === 'chromium') list.push(...chrome, ...edge);
    // 其他：當成路徑或指令；
    else list.push(wanted);
  }
  // 補上預設候選（Edge 先於 Chrome，因為這台機器的 Windows 內建 Edge）；
  for (const candidate of [...edge, ...chrome]) if (!list.includes(candidate)) list.push(candidate);
  // 回傳；
  return list;
}

// 組出瀏覽器的命令列參數（網址一定放最後）：
//   --headless=new 新版無頭模式；--disable-gpu 避免無 GPU 環境失敗；--hide-scrollbars 截圖不含捲軸；
//   --window-size 視窗大小（高度決定截到多長）；--virtual-time-budget 讓頁面腳本（目錄建置、遮罩按鈕轉換）有時間跑完再截圖；
//   --user-data-dir 用獨立的暫存設定檔，避免與使用者已開啟的瀏覽器搶同一個設定檔而失敗；
export function screenshotArgs(opts: { png: string; url: string; height: number; userDataDir: string }): string[] {
  // 依序組出陣列；
  return ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${SHOT_WIDTH},${opts.height}`, '--virtual-time-budget=4000', `--user-data-dir=${opts.userDataDir}`, `--screenshot=${opts.png}`, opts.url];
}

// 索引頁的一列：path 是筆記的 repo 相對路徑；before 與 after 是相對於 report/ 的圖片路徑（沒有就省略）；
export type IndexEntry = { path: string; before?: string; after?: string };

// 跳脫 HTML 特殊字元，避免檔案路徑裡的 < & " 破壞版面；
function esc(text: string): string {
  // 依序取代；& 要最先換，不然會重複跳脫；
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 把相對圖片路徑的每一段做 URI 編碼（保留 / 分隔），讓中文檔名在 file:// 與 http:// 都能載入；
function encodePath(rel: string): string {
  // 依 / 切開、各段編碼、再接回；
  return rel.split('/').map(encodeURIComponent).join('/');
}

// 產生一格圖片（或缺圖提示）；
function figure(label: string, src: string | undefined): string {
  // 有圖：用 img，點擊在新分頁開原圖；
  if (src !== undefined) return `<figure><figcaption>${label}</figcaption><a href="${esc(encodePath(src))}" target="_blank"><img src="${esc(encodePath(src))}" alt="${label}" loading="lazy"></a></figure>`;
  // 沒圖：提示；
  return `<figure><figcaption>${label}</figcaption><div class="missing">尚無截圖</div></figure>`;
}

// 產生 report/index.html：每個檔案一列，左 before、右 after，說明文字是檔案路徑；圖片一律用相對路徑，整個資料夾搬走也能開；
export function buildIndexHtml(entries: IndexEntry[]): string {
  // 每一列；
  const rows = entries.map((e) => `<section class="row"><h2>${esc(e.path)}</h2><div class="pair">${figure('before（遷移前）', e.before)}${figure('after（遷移後）', e.after)}</div></section>`).join('\n');
  // 整份 html；樣式用 CSS 變數、顏色用 oklch，並跟隨系統的深淺色；
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>遷移前後畫面比對</title>
<style>
:root{--bg:oklch(0.97 0.01 250);--card:oklch(0.99 0.005 250);--ink:oklch(0.25 0.02 250);--line:oklch(0.8 0.02 250);--accent:oklch(0.5 0.15 250)}
@media (prefers-color-scheme:dark){:root{--bg:oklch(0.2 0.02 250);--card:oklch(0.28 0.02 250);--ink:oklch(0.93 0.01 250);--line:oklch(0.45 0.03 250);--accent:oklch(0.75 0.12 250)}}
body{margin:0;padding:16px;background:var(--bg);color:var(--ink);font-family:system-ui,"Noto Sans TC","Microsoft JhengHei",sans-serif}
h1{font-size:1.2rem}
.row{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px;margin:0 0 20px}
.row h2{font-size:.95rem;margin:0 0 10px;word-break:break-all;color:var(--accent)}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}
figure{margin:0;min-width:0}
figcaption{font-weight:600;margin-bottom:6px}
img{width:100%;height:auto;border:1px solid var(--line);display:block}
.missing{border:1px dashed var(--line);padding:40px;text-align:center}
@media (max-width:800px){.pair{grid-template-columns:1fr}}
</style>
</head>
<body>
<h1>遷移前後畫面比對（共 ${entries.length} 份）</h1>
${rows}
</body>
</html>
`;
}
