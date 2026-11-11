// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本檔要讀寫暫存資料夾，改用 node 環境；
// 從 vitest 匯入測試骨架；
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// 匯入 fs 的 promise 版 API；
import * as fs from 'node:fs/promises';
// 匯入 os 的 tmpdir 與 path 的 join；
import { tmpdir } from 'node:os';
import * as path from 'node:path';
// 匯入被測函式；
import { atomicWriteFile } from '../src/lib/atomic-write';

// 每個測試用自己的暫存資料夾；
let dir = '';
beforeEach(async () => {
  // mkdtemp 建立唯一的資料夾；
  dir = await fs.mkdtemp(path.join(tmpdir(), 'atomic-write-'));
});
afterEach(async () => {
  // 清掉；
  await fs.rm(dir, { recursive: true, force: true });
});

describe('atomicWriteFile：先寫同資料夾的暫存檔再改名覆蓋，失敗時原檔完整且不留暫存檔', () => {
  // 正常：內容被換掉，資料夾裡沒有多餘的檔案；
  it('成功時覆蓋內容且不留暫存檔', async () => {
    // 原檔；
    const file = path.join(dir, 'a.html');
    await fs.writeFile(file, 'old');
    // 寫入；
    await atomicWriteFile(file, Buffer.from('new', 'utf8'));
    // 內容已換；
    expect(await fs.readFile(file, 'utf8')).toBe('new');
    // 資料夾裡只有這一個檔案；
    expect(await fs.readdir(dir)).toEqual(['a.html']);
  });

  // 保留原檔權限（POSIX 才有意義；Windows 的 mode 只有唯讀位，仍可比較）；
  it('保留原檔的檔案模式', async () => {
    // 原檔設成 0o640；
    const file = path.join(dir, 'b.html');
    await fs.writeFile(file, 'old');
    await fs.chmod(file, 0o640);
    // 記下原本的模式；
    const before = (await fs.stat(file)).mode;
    // 寫入；
    await atomicWriteFile(file, Buffer.from('new'));
    // 模式相同；
    expect((await fs.stat(file)).mode).toBe(before);
  });

  // 模擬改名失敗：原檔完整、暫存檔被清掉、錯誤往外丟；
  it('改名失敗時原檔不變、暫存檔被清掉、錯誤丟出', async () => {
    // 原檔；
    const file = path.join(dir, 'c.html');
    await fs.writeFile(file, 'original');
    // 注入會失敗的 rename；
    await expect(
      atomicWriteFile(file, Buffer.from('new'), {
        rename: async () => {
          throw new Error('模擬改名失敗');
        },
      }),
    ).rejects.toThrow('模擬改名失敗');
    // 原檔完整；
    expect(await fs.readFile(file, 'utf8')).toBe('original');
    // 沒有殘留暫存檔；
    expect(await fs.readdir(dir)).toEqual(['c.html']);
  });

  // 模擬寫入暫存檔失敗（寫到一半）：原檔不變、暫存檔被清掉；
  it('寫暫存檔失敗時原檔不變、暫存檔被清掉', async () => {
    // 原檔；
    const file = path.join(dir, 'd.html');
    await fs.writeFile(file, 'original');
    // 注入先建檔再失敗的 writeFile；
    await expect(
      atomicWriteFile(file, Buffer.from('new'), {
        writeFile: async (target) => {
          // 先留下半成品；
          await fs.writeFile(target, 'partial');
          throw new Error('磁碟已滿');
        },
      }),
    ).rejects.toThrow('磁碟已滿');
    // 原檔完整；
    expect(await fs.readFile(file, 'utf8')).toBe('original');
    // 半成品被清掉；
    expect(await fs.readdir(dir)).toEqual(['d.html']);
  });
});
