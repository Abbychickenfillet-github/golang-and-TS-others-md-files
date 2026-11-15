// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本檔只測純字串，改用 node 環境；
// 從 vitest 匯入測試骨架；
import { describe, expect, it } from 'vitest';
// 匯入被測函式；
import { pruneSharedRules, pruneSharedRulesDetailed, sharedSelectors } from '../src/lib/parse-html';

// 選擇器清單（逗號分隔）的規則：只有「共用樣式對那個選擇器宣告了這條規則的每一個屬性」時，才把該選擇器從清單拿掉；
// 否則留在清單裡（共用樣式與頁面兩邊都套用，頁面的宣告靠原始碼順序勝出），不再默默丟掉頁面額外的宣告；
describe('pruneSharedRules：選擇器清單逐選擇器做宣告層級判斷', () => {
  // 真實案例一（延遲 Latency 頁）：`button, select, input{font…}`，共用樣式的 button 只宣告了 font-family；頁面還寫了 font-size；
  const buttonTheme = sharedSelectors('button{font-family:x;padding:1px}');

  // button 沒被涵蓋全部屬性（font-size 共用樣式沒宣告）：整份清單原樣保留，頁面的 button font-size 不會消失；
  it('button, select, input{font-family; font-size}：button 沒被完全涵蓋，清單原樣保留', () => {
    // 輸入；
    const css = 'button, select, input{font-family:inherit;font-size:12px}';
    // 修剪後完全相同；
    expect(pruneSharedRules(css, buttonTheme)).toBe(css);
  });

  // 共用樣式完全涵蓋時才拿掉：這裡只有 font-family；
  it('共用樣式涵蓋該規則全部屬性時，把共用選擇器從清單拿掉', () => {
    // 輸入；
    expect(pruneSharedRules('button, select{font-family:inherit}', buttonTheme)).toBe('select{font-family:inherit}');
  });

  // 真實案例二（JS 相等性頁）：`code,pre,.mono{font-family}`；共用樣式的 code 與 pre 都宣告 font-family：兩個都拿掉，只剩 .mono；
  it('code,pre,.mono{font-family}：code 與 pre 都被涵蓋，只剩 .mono', () => {
    // 合成主題；
    const theme = sharedSelectors('code{font-family:a}pre{font-family:b}');
    // 修剪；
    expect(pruneSharedRules('code,pre,.mono{font-family:m}', theme)).toBe('.mono{font-family:m}');
  });

  // 只有 pre 被涵蓋、code 沒有（共用樣式的 code 宣告別的屬性）：code 留下；
  it('只有部分選擇器被涵蓋時，只拿掉被涵蓋的那幾個', () => {
    // pre 宣告 font-family，code 宣告 padding；
    const theme = sharedSelectors('pre{font-family:b}code{padding:1px}');
    // 修剪；
    expect(pruneSharedRules('code,pre,.mono{font-family:m}', theme)).toBe('code, .mono{font-family:m}');
  });

  // 清單裡的選擇器全部是共用的：維持單一選擇器的宣告層級做法（移除被涵蓋的屬性，其餘保留，選擇器清單不變）；
  it('清單全是共用選擇器時，移除被涵蓋的屬性並保留其餘', () => {
    // body 宣告 margin、.card 宣告 margin 與 padding；
    const theme = sharedSelectors('body{margin:0}.card{margin:1px;padding:2px}');
    // margin 兩邊都有、extra 兩邊都沒有：margin 移除、extra 保留；
    expect(pruneSharedRules('body, .card{margin:0;extra:1}', theme)).toBe('body, .card{extra:1}');
    // 全部被涵蓋才整條移除；
    expect(pruneSharedRules('body, .card{margin:0}', theme)).toBe('');
  });

  // 統計：只被拿掉的選擇器計入 selectorsRemoved，整條規則沒被移除就不計 rulesRemoved；
  it('統計只計被拿掉的選擇器', () => {
    // 輸入；
    const result = pruneSharedRulesDetailed('code,pre,.mono{font-family:m}', sharedSelectors('code{font-family:a}pre{font-family:b}'));
    // 規則仍在；
    expect(result?.tally.rulesRemoved).toBe(0);
    // 兩個選擇器被拿掉；
    expect(result?.tally.selectorsRemoved).toEqual(['code', 'pre']);
  });

  // 舊式手寫集合（沒有宣告標記）維持「共用選擇器直接拿掉」；
  it('沒有宣告標記的舊集合維持原行為', () => {
    // 手寫集合；
    expect(pruneSharedRules('.card, .mine{a:b}', new Set(['.card']))).toBe('.mine{a:b}');
  });
});
