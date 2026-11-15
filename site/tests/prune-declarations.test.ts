// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本檔只測純字串，改用 node 環境；
// 從 vitest 匯入測試骨架；
import { describe, expect, it } from 'vitest';
// 匯入被測函式；
import { pruneSharedRulesDetailed, pruneSharedRules, sharedSelectors } from '../src/lib/parse-html';

// 宣告層級修剪（失敗類別 A：頁面對共用選擇器另外加的宣告，例如 body 的 padding，不能被整條規則一起刪掉）：
// 共用選擇器的規則，只移除「共用樣式的同一個選擇器、同一個條件下也宣告了的屬性」，共用樣式沒有宣告的屬性保留；
describe('pruneSharedRules：宣告層級（共用樣式沒宣告的屬性要保留）', () => {
  // 合成主題：body 宣告了 margin 與 background；.card 宣告 padding；print 條件下 .toolbar 宣告 display；
  const theme = sharedSelectors('body{margin:0;background:blue}.card{padding:10px;border:1px solid}@media print{.toolbar{display:none}}');

  // sharedSelectors 除了選擇器鍵，還為每個選擇器放「有宣告資訊」的標記與每個屬性的鍵；
  it('sharedSelectors 收錄宣告資訊鍵', () => {
    // 標記與屬性鍵；
    expect(theme.has('body{')).toBe(true);
    expect(theme.has('body{margin')).toBe(true);
    expect(theme.has('body{background')).toBe(true);
    // 條件下的鍵；
    expect(theme.has('media print|.toolbar{display')).toBe(true);
    // 沒宣告的屬性沒有鍵；
    expect(theme.has('body{padding')).toBe(false);
  });

  // 共用樣式沒宣告的 padding 要保留，宣告了的 margin、background 移除；
  it('body 規則只留下共用樣式沒有宣告的 padding', () => {
    // 頁面的 body 規則；
    const out = pruneSharedRules('body{margin:0;padding:40px 16px 80px;background:red}', theme);
    // 只剩 padding；
    expect(out).toBe('body{padding:40px 16px 80px}');
  });

  // 全部屬性都被共用樣式宣告：整條規則移除（與選擇器層級的行為一致）；
  it('宣告全被共用樣式涵蓋時整條規則移除', () => {
    // 輸入；
    const result = pruneSharedRulesDetailed('.card{padding:1px;border:0}.mine{a:b}', theme);
    // 只剩 .mine；
    expect(result?.css).toBe('.mine{a:b}');
    // 統計：移除一條規則；
    expect(result?.tally.rulesRemoved).toBe(1);
  });

  // 條件不同不算：@media print 內的 .card 在共用樣式沒有 print 版本，整條保留（R37）；
  it('條件下的規則只比對同條件的宣告', () => {
    // print 內的 .toolbar 宣告 display 與 color：display 被涵蓋、color 保留；
    expect(pruneSharedRules('@media print{.toolbar{display:none;color:red}}', theme)).toBe('@media print{.toolbar{color:red}}');
    // 頂層的 .toolbar 沒有共用定義：原樣；
    expect(pruneSharedRules('.toolbar{display:none}', theme)).toBe('.toolbar{display:none}');
  });

  // 屬性名稱大小寫不影響；自訂屬性宣告在非 :root 規則內一律保留；
  it('屬性名稱不分大小寫，非 :root 規則內的自訂屬性保留', () => {
    // 大寫屬性；
    expect(pruneSharedRules('body{MARGIN:0;--x:1}', theme)).toBe('body{--x:1}');
  });

  // 選擇器清單只有部分共用：（R39 後續調整，原本是「丟掉共用選擇器」）逐選擇器做宣告層級判斷，
  // body 的共用樣式沒宣告 padding，所以 body 留在清單裡；共用樣式涵蓋全部屬性時才拿掉；
  it('選擇器清單部分共用時逐選擇器判斷', () => {
    // body 沒被完全涵蓋（padding）：清單原樣；
    expect(pruneSharedRules('body, .mine{margin:0;padding:1px}', theme)).toBe('body, .mine{margin:0;padding:1px}');
    // body 被完全涵蓋（margin、background）：拿掉；
    expect(pruneSharedRules('body, .mine{margin:0;background:red}', theme)).toBe('.mine{margin:0;background:red}');
  });

  // 沒有宣告資訊的共用集合（舊式手寫集合）維持選擇器層級：整條移除；
  it('共用集合沒有宣告標記時整條規則移除（相容舊集合）', () => {
    // 手寫集合；
    expect(pruneSharedRules('.card{padding:1px;zzz:2}', new Set(['.card']))).toBe('');
  });

  // keepComments：保留註解與格式，第一個倖存宣告換到原本第一個宣告的那一行；
  it('keepComments 模式保留註解與縮排', () => {
    // 多行格式的規則；
    const css = 'body{\n  margin:0;\n  /* 頁面留白 */\n  padding:40px;\n  background:red;\n}\n';
    // 修剪；
    const out = pruneSharedRulesDetailed(css, theme, { keepComments: true })?.css;
    // 結果；
    expect(out).toBe('body{\n  /* 頁面留白 */\n  padding:40px;\n}\n');
  });
});
