// 從 vitest 匯入測試骨架函式：describe 分組、it 定義單一案例、expect 斷言、beforeEach／afterEach 是每個案例前後的鉤子（hook）；
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// 匯入 Node 內建的檔案系統 promise 版 API，用 `import * as` 把整個模組收進一個命名空間物件 fs；
import * as fs from 'node:fs/promises';
// 匯入 os 模組，用它取得系統暫存資料夾路徑；
import * as os from 'node:os';
// 匯入 path 模組，用 path.join 以正確的分隔符號組合路徑；
import * as path from 'node:path';
// 匯入待測函式 syncAssets；`.mjs` 副檔名要寫出來，因為 ESM 的相對匯入不會自動補副檔名；
import { syncAssets } from '../scripts/sync-assets.mjs';

// describe 把同一主題的案例包成一組，第一個參數是組名；
describe('syncAssets', () => {
  // 宣告 root 變數放每個案例專屬的暫存根目錄，`let` 因為會在 beforeEach 重新賦值；
  let root: string;

  // beforeEach 的 async 回呼會在每個案例開始前執行一次；
  beforeEach(async () => {
    // fs.mkdtemp 在系統暫存資料夾底下建立一個名稱帶隨機尾碼的新資料夾，並回傳其路徑；
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-assets-'));
  });

  // afterEach 在每個案例結束後清理暫存資料夾，避免殘留；
  afterEach(async () => {
    // fs.rm 搭配 recursive 刪除整個資料夾樹，force 讓目標不存在時也不丟錯；
    await fs.rm(root, { recursive: true, force: true });
  });

  // it 定義一個案例：描述「複製所有檔案（含子資料夾）並回傳檔案數」；
  it('複製所有檔案（含子資料夾）並回傳複製的檔案數', async () => {
    // 組出來源資料夾路徑 root/src；
    const src = path.join(root, 'src');
    // 組出目的資料夾路徑 root/dest（刻意不先建立，驗證函式會自己建立）；
    const dest = path.join(root, 'dest');
    // 建立來源的子資料夾 src/b，recursive 讓 src 本身一併建立；
    await fs.mkdir(path.join(src, 'b'), { recursive: true });
    // 寫入來源檔 a.css；
    await fs.writeFile(path.join(src, 'a.css'), 'body{}');
    // 寫入來源子資料夾內的檔 b/c.js；
    await fs.writeFile(path.join(src, 'b', 'c.js'), 'let x=1;');

    // 呼叫待測函式並用 await 等它的 Promise 完成，結果存進 count；
    const count = await syncAssets(src, dest);

    // 斷言回傳值為 2（兩個檔案）；toBe 用 Object.is 嚴格比對；
    expect(count).toBe(2);
    // 斷言目的地的 a.css 內容與來源一致；
    expect(await fs.readFile(path.join(dest, 'a.css'), 'utf8')).toBe('body{}');
    // 斷言目的地的 b/c.js 內容與來源一致；
    expect(await fs.readFile(path.join(dest, 'b', 'c.js'), 'utf8')).toBe('let x=1;');
  });
});
