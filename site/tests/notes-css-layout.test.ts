// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本檔只解析 CSS 文字，改用 node 環境；
// 從 vitest 匯入測試骨架；
import { describe, expect, it } from 'vitest';
// 匯入 Node 內建的同步讀檔函式；
import { readFileSync } from 'node:fs';
// 匯入 path 模組；
import * as path from 'node:path';
// 匯入 postcss 解析 CSS；
import postcss from 'postcss';

// vitest 從 site/ 執行，`..` 是 repo 根目錄；
const repoRoot = path.resolve(process.cwd(), '..');
// 讀兩個共用樣式檔；
const notesCss = readFileSync(path.join(repoRoot, 'assets', 'notes.css'), 'utf8');
const themeCss = readFileSync(path.join(repoRoot, 'assets', 'note-theme.css'), 'utf8');

// 工具：找頂層（不在 @media 內）選擇器完全等於 selector 的規則，回傳它的宣告表（屬性 → 值）；找不到回傳 null；
function declsOf(css: string, selector: string, inMedia?: string): Record<string, string> | null {
  // 解析；
  const root = postcss.parse(css);
  // 結果；
  let found: Record<string, string> | null = null;
  // 走訪每條規則；
  root.walkRules((rule) => {
    // 父層：頂層或指定的 @media；
    const parent = rule.parent;
    const parentOk = inMedia === undefined ? parent?.type === 'root' : parent?.type === 'atrule' && (parent as postcss.AtRule).params.replace(/\s+/g, '') === inMedia.replace(/\s+/g, '');
    // 選擇器清單（逗號拆開）含目標、而且父層符合；
    if (parentOk && rule.selectors.some((s) => s.replace(/\s+/g, ' ').trim() === selector)) {
      // 收宣告；
      found = { ...(found ?? {}) };
      rule.walkDecls((d) => {
        (found as Record<string, string>)[d.prop] = d.value;
      });
    }
  });
  // 回傳；
  return found;
}

// R36：頁面自帶版面時，側邊大綱要是黏在左側的卡片；
describe('notes.css：.layout > nav.toc 側欄（R36）', () => {
  // 側欄卡片的版面屬性；
  it('是黏住的 250px 側欄卡片，用主題變數上色', () => {
    // 取宣告；
    const d = declsOf(notesCss, '.layout > nav.toc');
    // 存在；
    expect(d).not.toBeNull();
    // 黏住、固定寬、不被壓縮；
    expect(d?.position).toBe('sticky');
    expect(d?.flex).toBe('0 0 250px');
    // 高度限制與卡片外觀；
    expect(d?.['max-height']).toBe('calc(100vh - 36px)');
    expect(d?.overflow).toBe('auto');
    expect(d?.['border-radius']).toBe('14px');
    // 顏色用大綱自己的 --toc-* 變數（帶備用值），不借頁面配色，頁面深色時大綱仍是白底深字；
    expect(d?.background).toMatch(/^var\(--toc-bg,/);
    expect(d?.border).toMatch(/var\(--toc-line,/);
  });

  // 清單不要項目符號，避免與連結文字的編號重複；
  it('ol 沒有項目符號與縮排', () => {
    // 取宣告；
    const d = declsOf(notesCss, '.layout > nav.toc ol');
    // 無項目符號；
    expect(d?.['list-style']).toBe('none');
    expect(d?.padding).toBe('0');
  });

  // 連結的外觀與狀態；
  it('連結是區塊、有 hover 與 active 狀態', () => {
    // 一般；
    expect(declsOf(notesCss, '.layout > nav.toc a')?.display).toBe('block');
    // hover；
    expect(declsOf(notesCss, '.layout > nav.toc a:hover')?.background).toMatch(/var\(--toc-soft/);
    // active（與 here 共用規則）；
    expect(declsOf(notesCss, '.layout > nav.toc a.active')?.['font-weight']).toBe('600');
  });

  // 窄螢幕：變成一般區塊；
  it('860px 以下側欄變成一般區塊', () => {
    // 取窄螢幕宣告；
    const d = declsOf(notesCss, '.layout > nav.toc', '(max-width:860px)');
    // 不再黏住、滿寬、不限高；
    expect(d?.position).toBe('static');
    expect(d?.width).toBe('100%');
    expect(d?.['max-height']).toBe('none');
  });

  // 不寫死白色；新增顏色用 oklch；
  it('新增的規則不含 #fff 且備用色用 oklch', () => {
    // 取出本區塊的文字（從標題註解到下一個 ::-webkit-scrollbar）；
    const start = notesCss.indexOf('頁面自帶版面');
    const end = notesCss.indexOf('.toc::-webkit-scrollbar { width');
    const block = notesCss.slice(start, end);
    // 有內容；
    expect(block.length).toBeGreaterThan(200);
    // 不含白色字面值；
    expect(block).not.toMatch(/#fff(?:fff)?\b/i);
    // 有 oklch；
    expect(block).toContain('oklch(');
  });

  // 主題的兩欄 flex 版面：.layout 橫向、.content 可伸縮，860px 以下改為上下堆疊；
  it('note-theme.css 的 .layout／.content 重現兩欄版面', () => {
    // .layout 橫向 flex、兩欄頂端對齊；
    const layout = declsOf(themeCss, '.layout');
    expect(layout?.display).toBe('flex');
    expect(layout?.['align-items']).toBe('flex-start');
    // .content 可伸縮且不被長內容撐破；
    const content = declsOf(themeCss, '.content');
    expect(content?.flex).toBe('1 1 auto');
    expect(content?.['min-width']).toBe('0');
    // 窄螢幕堆疊；
    expect(declsOf(themeCss, '.layout', '(max-width:860px)')?.['flex-direction']).toBe('column');
  });
});
