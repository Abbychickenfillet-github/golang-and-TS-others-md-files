// 建置後驗證共用的「走訪輸出資料夾」工具：一次把 out/ 底下所有檔案與資料夾列成平面清單，三個檢查（外洩、大小、連結）都用它；
// 匯入 fs 的同步版 API；同步版寫起來單純，out/ 只有約 1500 個項目，不需要平行；
import * as fs from 'node:fs';
// 匯入 path 模組，用來組實體路徑；
import * as path from 'node:path';

// 一個輸出項目：rel 是相對輸出資料夾、以正斜線分隔的路徑（Windows 與 Linux 一致）；isDir 表示是不是資料夾；size 是檔案位元組數（資料夾為 0）；
// `export type` 只在編譯期存在，Node 的型別剝除會把它整行拿掉；
export type OutEntry = { rel: string; isDir: boolean; size: number };

// 走訪輸出資料夾，回傳依路徑排序的項目清單；資料夾不存在或不是資料夾就丟錯，絕不當成「空的、沒問題」；
export function listOut(outDir: string): OutEntry[] {
  // statSync 在路徑不存在時會丟 ENOENT；
  const root = fs.statSync(outDir);
  // 不是資料夾（例如被當成檔案）也要丟錯；
  if (!root.isDirectory()) throw new Error(`輸出路徑不是資料夾：${outDir}`);
  // 結果清單；
  const entries: OutEntry[] = [];
  // 待走訪的資料夾堆疊；空字串代表輸出資料夾本身；
  const stack: string[] = [''];
  // 堆疊還有東西就繼續；
  while (stack.length > 0) {
    // 取出一個資料夾（相對路徑）；`as string` 因為 length 已檢查過，pop 不會是 undefined；
    const relDir = stack.pop() as string;
    // withFileTypes 讓 readdirSync 回傳 Dirent 物件，不必再逐一 stat 就知道是不是資料夾；
    for (const dirent of fs.readdirSync(path.join(outDir, relDir), { withFileTypes: true })) {
      // 這個項目的相對路徑，一律用正斜線；
      const rel = relDir === '' ? dirent.name : `${relDir}/${dirent.name}`;
      // 真正的資料夾：記錄並放進堆疊（符號連結資料夾的 isDirectory() 是 false，所以不會被跟進去）；
      if (dirent.isDirectory()) {
        // 記錄資料夾本身；
        entries.push({ rel, isDir: true, size: 0 });
        // 之後再走訪它；
        stack.push(rel);
      } else {
        // 檔案（含符號連結本身）：用 lstat 取大小，lstat 不會跟隨符號連結；
        entries.push({ rel, isDir: false, size: fs.lstatSync(path.join(outDir, rel)).size });
      }
    }
  }
  // 依路徑排序，讓輸出順序確定（比較函式用 < 與 > 以碼元順序，不依賴系統語系）；
  entries.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  // 回傳；
  return entries;
}
