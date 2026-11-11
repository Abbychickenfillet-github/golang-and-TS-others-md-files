// 從 vitest 匯入測試骨架：describe 分組、it 定義案例、expect 斷言、afterEach 是每個案例結束後的鉤子；
import { afterEach, describe, expect, it } from 'vitest';
// 從 Testing Library 匯入 render（把元件畫進 jsdom）與 cleanup（清掉已畫的 DOM）；
import { cleanup, render } from '@testing-library/react';
// 匯入首頁分組函式；
import { buildHomeSections } from '../src/lib/home';
// 匯入首頁清單元件；
import { HomeIndex } from '../src/components/HomeIndex';
// `import type` 只匯入型別；
import type { NoteEntry } from '../src/lib/content';

// 每個案例結束後手動 cleanup（vitest 沒開 globals，Testing Library 不會自動掛清理鉤子）；
afterEach(cleanup);

// 造一篇假筆記：relPath 決定種類、slug；title 省略時用檔名；
function note(relPath: string, title?: string): NoteEntry {
  // 副檔名決定種類；
  const kind = relPath.endsWith('.md') ? 'md' : 'html';
  // slug 是去掉副檔名後依 / 切開；
  const slug = relPath.replace(/\.(md|html)$/, '').split('/');
  // 回傳物件；title 傳空字串可以模擬「沒有標題」；
  return { kind, relPath, slug, title: title ?? (slug.at(-1) as string), frontmatter: {} };
}

// 分組函式；
describe('buildHomeSections', () => {
  // 沒有筆記就沒有區塊；
  it('沒有筆記時回傳空陣列', () => {
    // 斷言；
    expect(buildHomeSections([])).toEqual([]);
  });

  // 根目錄的筆記放在最前面的「根目錄」區塊，頂層資料夾各自是一個 h2 區塊；
  it('根目錄的筆記先出現，頂層資料夾各一個 level 2 區塊，筆記數含子資料夾', () => {
    // 準備；
    const sections = buildHomeSections([note('b/x.md'), note('root.md'), note('a/y.md'), note('a/sub/z.md')]);
    // 區塊標題依序是根目錄、a、b；
    expect(sections.filter((s) => s.level === 2).map((s) => s.heading)).toEqual(['根目錄', 'a', 'b']);
    // a 含自己的 1 篇與子資料夾的 1 篇，共 2；
    expect(sections.find((s) => s.heading === 'a')?.count).toBe(2);
    // 根目錄 1 篇；
    expect(sections[0]).toMatchObject({ heading: '根目錄', level: 2, count: 1 });
  });

  // 巢狀資料夾是接在頂層區塊後面的 level 3 區塊，標題帶路徑前綴（相對於頂層資料夾）；
  it('巢狀資料夾是路徑前綴的 level 3 區塊，排在該頂層資料夾自己的筆記之後', () => {
    // 準備：a 底下有直接筆記、子資料夾 sub、子子資料夾 sub/deep；
    const sections = buildHomeSections([note('a/sub/deep/d.md'), note('a/sub/s.md'), note('a/top.md')]);
    // 順序：a(h2)、a 的直接筆記已在 a 區塊裡、sub(h3)、sub/deep(h3)；
    expect(sections.map((s) => [s.level, s.heading])).toEqual([
      [2, 'a'],
      [3, 'sub'],
      [3, 'sub/deep'],
    ]);
    // a 區塊只放 a 自己的筆記；
    expect(sections[0].items.map((i) => i.path)).toEqual(['a/top']);
    // sub 區塊只放 sub 自己的筆記；
    expect(sections[1].items.map((i) => i.path)).toEqual(['a/sub/s']);
  });

  // 只有子資料夾有筆記的頂層資料夾，h2 仍然存在（才有大綱）但沒有自己的筆記；
  it('頂層資料夾沒有直接筆記時仍有 h2 區塊，items 為空', () => {
    // 準備；
    const sections = buildHomeSections([note('a/sub/s.md')]);
    // 斷言；
    expect(sections[0]).toMatchObject({ heading: 'a', level: 2, count: 1, items: [] });
    // 子資料夾接在後面；
    expect(sections[1]).toMatchObject({ heading: 'sub', level: 3 });
  });

  // 排序是碼點順序（JS 的 < 比較），不是 localeCompare：大寫在小寫前、ASCII 在中文前；
  it('資料夾與筆記依碼點順序排序，不受輸入順序影響', () => {
    // 輸入故意亂序；
    const input = [note('中/z.md'), note('b/x.md'), note('B/x.md'), note('a/c.md'), note('a/B.md'), note('a/a.md'), note('a/中.md')];
    // 區塊順序：B、a、b、中；
    expect(buildHomeSections(input).filter((s) => s.level === 2).map((s) => s.heading)).toEqual(['B', 'a', 'b', '中']);
    // a 裡面的筆記順序：B、a、c、中；
    expect(buildHomeSections(input).find((s) => s.heading === 'a')?.items.map((i) => i.path)).toEqual(['a/B', 'a/a', 'a/c', 'a/中']);
    // 反向輸入得到同樣結果；
    expect(buildHomeSections([...input].reverse())).toEqual(buildHomeSections(input));
  });

  // 標題取 NoteEntry.title，空的就退回檔名；
  it('標題用 NoteEntry.title，空白標題退回檔名', () => {
    // 準備：一篇有標題、一篇標題是空白；
    const items = buildHomeSections([note('a/x.md', '漂亮標題'), note('a/y.md', '   ')])[0].items;
    // 依檔名排序，x 在 y 前；
    expect(items.map((i) => i.title)).toEqual(['漂亮標題', 'y']);
  });

  // 互動版 html（檔名以 -互動版 結尾）要標記；md 就算檔名結尾相同也不標；
  it('只有檔名以 -互動版 結尾的 html 標記為互動版', () => {
    // 準備；
    const items = buildHomeSections([note('a/x-互動版.html'), note('a/x.md'), note('a/y-互動版.md'), note('a/z.html')])[0].items;
    // 取出被標記的 path；
    expect(items.filter((i) => i.interactive).map((i) => i.path)).toEqual(['a/x-互動版']);
  });

  // 同一個 slug 片段陣列不會被改動（避免汙染傳入的 NoteEntry）；
  it('不修改傳入的筆記陣列', () => {
    // 準備並複製一份；
    const input = [note('b/x.md'), note('a/y.md')];
    // 先記下順序；
    const before = input.map((n) => n.relPath);
    // 執行；
    buildHomeSections(input);
    // 順序不變；
    expect(input.map((n) => n.relPath)).toEqual(before);
  });
});

// 首頁清單元件；
describe('HomeIndex', () => {
  // 準備一組含中文、空白、# 的筆記；
  const sections = buildHomeSections([note('前端/日期 物件.md', '日期物件'), note('前端/日期 物件-互動版.html', '日期物件互動版'), note('特殊/C# 筆記.md'), note('root.md')]);

  // 結構；
  it('輸出 Hero（標題 Abby Notes、篇數）與一張卡片，每個資料夾是一個 h2', () => {
    // 畫出來；
    const { container } = render(<HomeIndex sections={sections} total={4} basePath="" />);
    // 頁首標題；
    expect(container.querySelector('header.hero h1')?.textContent).toBe('Abby Notes');
    // 篇數放在 meta；
    expect(container.querySelector('header.hero .meta')?.textContent).toBe('共 4 篇筆記');
    // 只有一張卡片（notes.js 只會對第一個 article 建大綱，所以全部區塊要放在同一張裡）；
    expect(container.querySelectorAll('article.card')).toHaveLength(1);
    // h2 的文字：根目錄、前端、特殊（含篇數）；
    expect(Array.from(container.querySelectorAll('article.card h2'), (h) => h.textContent)).toEqual(['根目錄（1）', '前端（2）', '特殊（1）']);
    // 沒有 inline style；
    expect(container.querySelectorAll('[style]')).toHaveLength(0);
  });

  // 連結網址：逐段 encodeURIComponent，開頭是 basePath；
  it('連結 href 是 basePath 加逐段百分比編碼的 slug，文字是標題', () => {
    // 帶前綴畫出來；
    const { container } = render(<HomeIndex sections={sections} total={4} basePath="/blog" />);
    // 取出所有連結；
    const links = Array.from(container.querySelectorAll('li > a'), (a) => [a.getAttribute('href'), a.textContent]);
    // 斷言：根目錄、前端兩篇、特殊一篇；
    expect(links).toEqual([
      ['/blog/root', 'root'],
      ['/blog/%E5%89%8D%E7%AB%AF/%E6%97%A5%E6%9C%9F%20%E7%89%A9%E4%BB%B6', '日期物件'],
      ['/blog/%E5%89%8D%E7%AB%AF/%E6%97%A5%E6%9C%9F%20%E7%89%A9%E4%BB%B6-%E4%BA%92%E5%8B%95%E7%89%88', '日期物件互動版'],
      ['/blog/%E7%89%B9%E6%AE%8A/C%23%20%E7%AD%86%E8%A8%98', 'C# 筆記'],
    ]);
  });

  // 互動版要看得出來；
  it('互動版筆記旁有可見的「互動版」標記，其他沒有', () => {
    // 畫出來；
    const { container } = render(<HomeIndex sections={sections} total={4} basePath="" />);
    // 每個 li 的標記文字；
    const marks = Array.from(container.querySelectorAll('li'), (li) => li.querySelector('.pill')?.textContent ?? null);
    // 只有第三個（前端的互動版）有；
    expect(marks).toEqual([null, null, '互動版', null]);
  });

  // 巢狀資料夾用 h3；
  it('巢狀資料夾輸出成 h3', () => {
    // 準備；
    const nested = buildHomeSections([note('a/sub/s.md')]);
    // 畫出來；
    const { container } = render(<HomeIndex sections={nested} total={1} basePath="" />);
    // 一個 h2、一個 h3；
    expect(Array.from(container.querySelectorAll('h2'), (h) => h.textContent)).toEqual(['a（1）']);
    // h3 是路徑前綴標題（不含篇數）；
    expect(Array.from(container.querySelectorAll('h3'), (h) => h.textContent)).toEqual(['sub（1）']);
  });
});
