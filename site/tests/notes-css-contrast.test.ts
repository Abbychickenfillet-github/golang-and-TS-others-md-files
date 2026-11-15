// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本檔只解析 CSS 文字，改用 node 環境；
// 從 vitest 匯入測試骨架；
import { describe, expect, it } from 'vitest';
// 匯入 Node 內建的同步讀檔函式；
import { readFileSync } from 'node:fs';
// 匯入 path 模組；
import * as path from 'node:path';

// vitest 從 site/ 執行，`..` 是 repo 根目錄；
const repoRoot = path.resolve(process.cwd(), '..');
// 讀兩個共用樣式檔；
const notesCss = readFileSync(path.join(repoRoot, 'assets', 'notes.css'), 'utf8');
const themeCss = readFileSync(path.join(repoRoot, 'assets', 'note-theme.css'), 'utf8');

// 12 頁抽樣檢查發現的失敗類別：notes.css 寫死的淺色文字在主題的中明度灰藍頁面底色上看不清楚；表格的長網址撐出右側被裁掉；
describe('共用樣式：在主題底色上的可讀性', () => {
  // 「各對話來源」收合列的文字與邊線改用主題變數（備用值才是原本寫死的顏色）；
  it('details.fold 的文字與邊線用主題變數', () => {
    // 摘要文字用 --sub；
    expect(notesCss).toMatch(/details\.fold > summary \{[^}]*color: var\(--sub, #8a93a6\)/);
    // 說明文字用 --sub；
    expect(notesCss).toMatch(/details\.fold > summary::after \{[^}]*color: var\(--sub, #9aa3b5\)/);
    // 邊線用 --line；
    expect(notesCss).toMatch(/details\.fold \{[^}]*border-top: 1px dashed var\(--line, #c9d4e8\)/);
  });

  // 表格儲存格允許長字串（網址）在任意位置換行，避免表格被撐寬後在右側被裁掉；
  it('表格儲存格可在任意位置換行', () => {
    // 找到 th,td 規則；
    const rule = /th,td\{[^}]*\}/.exec(themeCss)?.[0] ?? '';
    // 含 overflow-wrap:anywhere；
    expect(rule).toContain('overflow-wrap:anywhere');
    // notes.css 晚於主題載入，它的 td、th 規則也必須是 anywhere，否則會被 break-word 蓋回去（break-word 不縮小表格最小寬度）；
    expect(notesCss).toMatch(/td, th \{ overflow-wrap: anywhere; \}/);
    expect(notesCss).not.toMatch(/p, li, td, th/);
  });
});
