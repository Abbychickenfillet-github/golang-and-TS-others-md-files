// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本檔只測純字串與讀檔，改用 node 環境；
// 從 vitest 匯入測試骨架；
import { describe, expect, it } from 'vitest';
// 匯入 Node 內建的同步讀檔函式；
import { readFileSync } from 'node:fs';
// 匯入 path 模組；
import * as path from 'node:path';
// 匯入被測函式；
import { parseHtmlNote, pruneSharedRules, sharedSelectors, sharedSelectorsOf } from '../src/lib/parse-html';

// vitest 從 site/ 執行，`..` 是 repo 根目錄；
const repoRoot = path.resolve(process.cwd(), '..');

// R37：修剪依「上下文」判斷——@media／@supports 內的規則只有在共用樣式於「同一個條件」下也定義了同一個選擇器時才抽掉；
describe('pruneSharedRules：上下文感知（R37）', () => {
  // 共用集合：頂層 .toc、print 條件下的 .toolbar、深色模式的 .dark-only（頂層鍵）、頂層的 --bg；
  const ctxShared = new Set(['.toc', 'media print|.toolbar', '.dark-only', '--bg']);

  // 頂層選擇器照舊被抽掉；
  it('頂層選擇器在共用集合內就抽掉', () => {
    // 輸入；
    expect(pruneSharedRules('.toc{a:b}.my{c:d}', ctxShared)).toBe('.my{c:d}');
  });

  // 共用樣式沒有 print 版本時，@media print 內的同名選擇器要保留；
  it('同一個選擇器在 @media print 內、共用樣式沒有 print 規則時不抽掉', () => {
    // .toc 只有頂層鍵，沒有 `media print|.toc`；
    const out = pruneSharedRules('@media print{.toc{display:none}}', ctxShared);
    // 原樣保留；
    expect(out).toBe('@media print{.toc{display:none}}');
  });

  // 共用樣式在同一條件下也有定義時才抽掉；
  it('共用樣式在同一個 @media 條件下定義了同一個選擇器時抽掉', () => {
    // .toolbar 有 `media print|.toolbar`，.toc 沒有；
    const out = pruneSharedRules('@media print{.toolbar,.toc{display:none}}', ctxShared);
    // 只剩 .toc；
    expect(out).toBe('@media print{.toc{display:none}}');
  });

  // 條件的寫法差異（空白、大小寫）不影響比對；
  it('條件正規化：空白與大小寫不同也視為同一個條件', () => {
    // 輸入用大寫與多餘空白；
    const out = pruneSharedRules('@MEDIA   print{.toolbar{x:y}}', ctxShared);
    // 被抽掉並移除空的 @media；
    expect(out.trim()).toBe('');
  });

  // 條件不同就不算同一個；
  it('不同的 @media 條件不抽掉', () => {
    // 共用樣式的 .toolbar 只在 print，頁面把它放在 max-width 條件；
    const out = pruneSharedRules('@media (max-width:860px){.toolbar{x:y}}', ctxShared);
    // 保留；
    expect(out).toBe('@media (max-width:860px){.toolbar{x:y}}');
  });

  // 深色模式維持與上下文無關：頂層鍵就能抽掉 prefers-color-scheme 區塊內的規則；
  it('prefers-color-scheme 區塊維持與上下文無關', () => {
    // .dark-only 只有頂層鍵；
    const out = pruneSharedRules('@media (prefers-color-scheme: dark){.dark-only{a:b}.mine{c:d}}', ctxShared);
    // .dark-only 被抽掉、.mine 留下；
    expect(out).toContain('.mine');
    expect(out).not.toContain('.dark-only');
  });

  // 深色區塊內的 :root 自訂屬性同樣與上下文無關（--bg 只有頂層鍵）；
  it('深色區塊內的 :root 用頂層自訂屬性鍵', () => {
    // 輸入；
    const out = pruneSharedRules('@media (prefers-color-scheme:dark){:root{--bg:#111;--mine:#222}}', ctxShared);
    // --bg 被抽掉、--mine 留下；
    expect(out).not.toContain('--bg');
    expect(out).toContain('--mine');
  });

  // 非深色 @media 內的 :root：自訂屬性要同條件才抽；
  it(':root 在一般 @media 內時，自訂屬性要同條件才抽掉', () => {
    // 頂層有 --bg，但這個 :root 在 max-width 條件下；
    const out = pruneSharedRules('@media (max-width:860px){:root{--bg:#000;--mine:#111}}', ctxShared);
    // 兩個都保留；
    expect(out).toContain('--bg');
    expect(out).toContain('--mine');
    // 共用集合若有同條件的鍵就抽掉；
    const out2 = pruneSharedRules('@media (max-width:860px){:root{--bg:#000;--mine:#111}}', new Set(['media (max-width:860px)|--bg']));
    expect(out2).not.toContain('--bg');
    expect(out2).toContain('--mine');
  });

  // sharedSelectors 對巢狀規則產生 `條件|選擇器` 的鍵；
  it('sharedSelectors 對巢狀規則產生 `條件|選擇器` 的鍵', () => {
    // 合成主題：頂層 .a、print 內 .b、深色內 .c；
    const set = sharedSelectors('.a{x:y}@media print{.b{x:y}}@media (prefers-color-scheme:dark){.c{x:y}}');
    // 頂層鍵；
    expect(set.has('.a')).toBe(true);
    // 條件鍵；
    expect(set.has('media print|.b')).toBe(true);
    expect(set.has('.b')).toBe(false);
    // 深色維持與上下文無關：收成頂層鍵；
    expect(set.has('.c')).toBe(true);
  });

  // <style media="print"> 的內容在 print 條件下判斷（網站建置與遷移一致）；
  it('<style media="print"> 內的規則以 print 條件比對', () => {
    // 共用集合有 `media print|.toolbar` 但沒有 .toc 的 print 版本；
    const note = parseHtmlNote('<head><style media="print">.toolbar{a:b}.toc{c:d}</style></head><body></body>', ctxShared);
    // .toolbar 被抽掉、.toc 保留；
    expect(note.pageCss).toContain('.toc{c:d}');
    expect(note.pageCss).not.toContain('.toolbar');
  });

  // 真實共用樣式：樣板頁 @media print 內的 .toc 沒有 print 版本，要留下；.toolbar 與 .quiz 有，要抽掉；
  it('真實共用樣式：print 內的 .toolbar、.quiz 抽掉，.toc 留下', () => {
    // 載入真實聯集；
    const real = sharedSelectorsOf(['note-theme.css', 'notes.css'].map((name) => readFileSync(path.join(repoRoot, 'assets', name), 'utf8')));
    // 樣板頁的 print 規則；
    const out = pruneSharedRules('@media print{.toolbar,.toc,.quiz{display:none}mark.hl.masked{color:inherit!important;background:var(--hl-core)!important}}', real);
    // 只剩 .toc；
    expect(out).toBe('@media print{.toc{display:none}}');
  });
});
