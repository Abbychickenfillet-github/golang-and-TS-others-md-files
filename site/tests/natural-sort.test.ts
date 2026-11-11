// 從 vitest 匯入測試骨架：describe 分組、it 定義案例、expect 斷言；
import { describe, expect, it } from 'vitest';
// 匯入被測的自然排序比較函式；
import { naturalCompare } from '../src/lib/natural-sort';

// 用比較函式排序一份字串陣列，回傳新陣列（先複製再排序，不動輸入）；
const sorted = (list: string[]): string[] => [...list].sort(naturalCompare);

// 自然排序：語意與 build-index.py 的 natural_key 相同（依數字連續段切開，數字段比數值、文字段比碼點），且與機器的語系無關；
describe('naturalCompare', () => {
  // 數字段比數值：2 在 10 前面（碼點順序會是 10 在 2 前面）；
  it('2-x 排在 10-x 前面', () => {
    // 斷言；
    expect(sorted(['10-x', '2-x', '1-x'])).toEqual(['1-x', '2-x', '10-x']);
  });

  // 數字在中間；
  it('Day2 排在 Day10 前面', () => {
    // 斷言；
    expect(sorted(['Day10', 'Day2', 'Day1'])).toEqual(['Day1', 'Day2', 'Day10']);
  });

  // 補零的名稱本來就照順序，結果不變；
  it('補零的 Day03、Day16 順序不變', () => {
    // 斷言；
    expect(sorted(['Day16', 'Day03', 'Day04', 'Day15'])).toEqual(['Day03', 'Day04', 'Day15', 'Day16']);
  });

  // 文字段用碼點順序：大寫在小寫前、ASCII 在中文前；
  it('中文與 ASCII 混合時文字段依碼點順序', () => {
    // 斷言；
    expect(sorted(['中文', 'b', 'B', 'a', '10', '2'])).toEqual(['2', '10', 'B', 'a', 'b', '中文']);
  });

  // 碼點順序與 UTF-16 碼元順序不同：U+1F600 的第一個碼元（0xD83D）比 U+FF21 小，但碼點比它大；build-index.py（Python）比的是碼點；
  it('文字段比碼點而不是 UTF-16 碼元（補充平面字元排在全形字母之後）', () => {
    // 全形 Ａ 是 U+FF21，😀 是 U+1F600；
    expect(sorted(['😀', 'Ａ'])).toEqual(['Ａ', '😀']);
  });

  // 前綴相同：短的在前；
  it('前綴相同時較短的在前', () => {
    // 斷言；
    expect(sorted(['a1b', 'a1', 'a', 'a1a'])).toEqual(['a', 'a1', 'a1a', 'a1b']);
  });

  // 數值相同但寫法不同（補零）：仍要有確定的順序，不依輸入順序；
  it('數值相同但寫法不同（3 與 03）有確定的順序，與輸入順序無關', () => {
    // 兩種輸入順序；
    expect(sorted(['Day3', 'Day03'])).toEqual(sorted(['Day03', 'Day3']));
    // 完全相等回傳 0；
    expect(naturalCompare('Day3', 'Day3')).toBe(0);
  });

  // 很長的數字不會因為轉成 Number 而失去精度；
  it('超過 Number 精度的數字段也能正確比較', () => {
    // 兩個差在最後一位的 25 位數；
    expect(sorted(['x12345678901234567890123456', 'x12345678901234567890123455'])).toEqual(['x12345678901234567890123455', 'x12345678901234567890123456']);
  });

  // 以數字開頭與以文字開頭混在一起：切開後第一段是空字串，空字串在任何文字之前，所以數字開頭的在前；
  it('數字開頭的名稱排在文字開頭的前面', () => {
    // 斷言；
    expect(sorted(['a', '1', 'B', '10'])).toEqual(['1', '10', 'B', 'a']);
  });
});
