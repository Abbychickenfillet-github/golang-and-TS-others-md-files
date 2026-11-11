// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本檔只測純字串，改用 node 環境；
// 從 vitest 匯入測試骨架；
import { describe, expect, it } from 'vitest';
// 匯入被測函式；
import { hasOwnDarkPalette, parseHtmlNote } from '../src/lib/parse-html';
import { migrateHtml } from '../src/lib/migrate-html';

// 失敗類別 B（12 頁抽樣檢查）：頁面自己設計了深色配色（body 背景是深色、卡片也是深色、文字是淺色），
// 遷移後 body 的背景與文字色被主題的淺色取代，頁面自己的深色卡片上就出現深色字，完全看不清楚；
// 這類頁面不抽換共用樣式（網站建置與遷移工具一致）：整份 CSS 原樣保留；
describe('hasOwnDarkPalette：偵測頁面自帶的深色配色', () => {
  // body 直接寫深色背景；
  it('body 背景是深色字面值', () => {
    expect(hasOwnDarkPalette('body{background:#0b1020;color:#e6e9f5}')).toBe(true);
    expect(hasOwnDarkPalette('html,body{background-color:rgb(10,12,20);color:#eee}')).toBe(true);
  });

  // 透過 :root 的自訂屬性與 var() 間接取得；
  it('body 背景是 var(--bg)，而 :root 的 --bg 是深色', () => {
    expect(hasOwnDarkPalette(':root{--bg:#0b1020;--fg:#e6e9f5}body{background:var(--bg);color:var(--fg)}')).toBe(true);
    // 帶備用值的 var；
    expect(hasOwnDarkPalette('body{background:var(--nope,#101010);color:hsl(0,0%,90%)}')).toBe(true);
  });

  // 漸層背景取第一個顏色；
  it('漸層背景取第一個顏色判斷', () => {
    expect(hasOwnDarkPalette('body{background:linear-gradient(180deg,#0b1020,#1b2030);color:#fff}')).toBe(true);
  });

  // color-scheme: dark 也算；
  it('color-scheme: dark', () => {
    expect(hasOwnDarkPalette(':root{color-scheme:dark}')).toBe(true);
  });

  // 淺色頁面、沒有 body 背景、@media 深色模式覆寫都不算；
  it('淺色背景、沒有 body 背景、prefers-color-scheme 區塊內的深色都不算', () => {
    expect(hasOwnDarkPalette('body{background:#faf9f7}')).toBe(false);
    // 背景是深色但文字也是深色（內容放在自己的淺色卡片上，例如樣板頁的紫底白卡）：不算；
    expect(hasOwnDarkPalette(':root{--bg:#4827ca;--ink:#23303b}body{background:var(--bg);color:var(--ink)}')).toBe(false);
    // 只有深背景沒有文字色：不算；
    expect(hasOwnDarkPalette('body{background:#000}')).toBe(false);
    expect(hasOwnDarkPalette('body{margin:0}')).toBe(false);
    expect(hasOwnDarkPalette(':root{--bg:#faf9f7}body{background:var(--bg)}')).toBe(false);
    expect(hasOwnDarkPalette('@media (prefers-color-scheme: dark){body{background:#000}}')).toBe(false);
    // 無法解析的 CSS 不丟錯；
    expect(hasOwnDarkPalette('body{background:#000')).toBe(false);
  });
});

// 網站建置與遷移工具對這類頁面的行為；
describe('自帶深色配色的頁面不抽換共用樣式', () => {
  // 共用集合：.card 與 --bg；
  const shared = new Set(['body', 'body{', 'body{background', 'body{color', '.card', '--bg']);
  // 深色頁面；
  const darkCss = ':root{--bg:#0b1020}body{background:var(--bg);color:#e6e9f5}.card{padding:1px}';

  // 網站建置：pageCss 保留全部規則；
  it('parseHtmlNote 保留整份 CSS（含共用選擇器與自訂屬性）', () => {
    // 解析；
    const note = parseHtmlNote(`<html><head><style>${darkCss}</style></head><body></body></html>`, shared);
    // 全都在；
    expect(note.pageCss).toContain('--bg:#0b1020');
    expect(note.pageCss).toContain('body{background:var(--bg)');
    expect(note.pageCss).toContain('.card{padding:1px}');
  });

  // 遷移：跳過並說明原因，檔案不變；
  it('migrateHtml 跳過並說明原因', () => {
    // 輸入；
    const input = `<html><head><style>${darkCss}</style></head><body><p>x</p></body></html>`;
    // 遷移；
    const result = migrateHtml(input, '../assets/', shared);
    // 不變；
    expect(result.changed).toBe(false);
    expect(result.html).toBe(input);
    expect(result.stats.skipped).toMatch(/深色/);
  });
});
