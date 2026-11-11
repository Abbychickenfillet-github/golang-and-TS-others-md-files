// 匯入 fs 的 promise 版 API，用來寫檔、改名、改模式與刪除；
import * as fs from 'node:fs/promises';
// 匯入 path 模組，用來組出同資料夾的暫存檔路徑；
import * as path from 'node:path';

// 可注入的檔案操作（測試用來模擬失敗；正式使用不傳，走 fs 的真實函式）；
export type AtomicWriteOps = {
  // 把資料寫成暫存檔；
  writeFile: (target: string, data: Buffer) => Promise<void>;
  // 把暫存檔改名覆蓋目標；
  rename: (from: string, to: string) => Promise<void>;
};

// 原子寫入：先把資料寫到「同一個資料夾」的暫存檔，成功後才用 rename 覆蓋目標（同一個檔案系統內的 rename 要嘛成功要嘛沒發生，不會留下寫到一半的檔案）；
// 保留原檔的檔案模式；任何一步失敗都會刪掉暫存檔並把錯誤丟出去，原檔維持完整；
export async function atomicWriteFile(file: string, data: Buffer, ops: Partial<AtomicWriteOps> = {}): Promise<void> {
  // 真實操作或注入的操作；`??` 在左邊是 undefined 時取右邊；
  const writeFile = ops.writeFile ?? ((target: string, buf: Buffer) => fs.writeFile(target, buf));
  const rename = ops.rename ?? ((from: string, to: string) => fs.rename(from, to));
  // 暫存檔放在目標旁邊（同一個檔案系統，rename 才是原子的）；名稱含行程編號與隨機數避免撞名，前面加點讓它在多數工具中不顯眼；
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`);
  // try/catch：失敗時清暫存檔再丟出；
  try {
    // 先寫暫存檔；
    await writeFile(temp, data);
    // 保留原檔的模式（目標不存在時 stat 會丟錯，那就用預設模式）；
    try {
      // 讀原檔模式並套到暫存檔；`& 0o7777` 只留權限位；
      const { mode } = await fs.stat(file);
      await fs.chmod(temp, mode & 0o7777);
    } catch {
      // 目標不存在或不能 stat：略過；
    }
    // 改名覆蓋；
    await rename(temp, file);
  } catch (error) {
    // 清掉暫存檔（不存在也沒關係）；
    await fs.rm(temp, { force: true });
    // 把原本的錯誤丟出去；
    throw error;
  }
}
