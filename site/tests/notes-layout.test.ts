// 從 vitest 匯入測試骨架：describe 分組、it 定義單一案例、expect 斷言、beforeEach 是每個案例前的鉤子；
import { beforeEach, describe, expect, it } from 'vitest';
// 匯入 Node 內建的同步讀檔函式；
import { readFileSync } from 'node:fs';
// 匯入 resolve，把多段路徑合成一條絕對路徑；
import { resolve } from 'node:path';

// vitest 從 site/ 執行，jsdom 環境下 import.meta.url 不是 file 網址，所以用 process.cwd() 加相對路徑定位共用腳本；
const scriptSource: string = readFileSync(resolve(process.cwd(), '../assets/notes.js'), 'utf8');

// 型別：notes.js 在 window 上留的初始化旗標；
type NotesWindow = Window & { __notesInit?: boolean };

// 工具函式：把腳本丟進 jsdom 視窗執行一次（等於瀏覽器載入 <script>）；jsdom 的 readyState 不是 loading，所以 ready 會同步執行；
function loadScript(): void {
  // window.eval 在視窗的全域範圍執行字串；
  window.eval(scriptSource);
}

// 工具函式：換掉 body 內容，並重設腳本的初始化旗標，讓每個案例都能重新載入腳本；
function setBody(html: string): void {
  // 清掉旗標；
  (window as NotesWindow).__notesInit = undefined;
  // innerHTML 賦值會把字串解析成 DOM；
  document.body.innerHTML = html;
}

// 範例一：樣板頁式的結構——手寫 nav.toc 在 .layout 內，旁邊是 .content，裡面有 hero 與多個 article；
const OWN_LAYOUT = `
  <div class="wrap">
    <div class="layout">
      <nav class="toc" id="toc"><h4>大綱</h4><ol><li><a href="#s1">1. 一</a></li><li><a href="#s2">2. 二</a></li></ol></nav>
      <div class="content">
        <header class="hero"><h1>標題</h1></header>
        <article class="card"><h2 id="s1">一</h2><p>甲</p></article>
        <article class="card"><h2 id="s2">二</h2><p>乙</p></article>
        <article class="card"><h2>三</h2><p>丙</p></article>
      </div>
    </div>
  </div>`;

// 第一組：自帶版面的頁面不被重排；
describe('notes.js layout：頁面已有自己的版面（R35）', () => {
  // 每個案例前清空 body；
  beforeEach(() => setBody(''));

  // 手寫 nav.toc 在 .layout 內：DOM 完全不變；
  it('nav.toc 在 .layout 內時，layout() 不改動 DOM', () => {
    // 建 DOM；
    setBody(OWN_LAYOUT);
    // 記下載入前的 HTML；
    const before = document.body.innerHTML;
    // 載入腳本；
    loadScript();
    // 沒有 notes-grid、HTML 逐字相同（腳本也不替 h2 補 id，因為整個 layout／目錄建置被跳過）；
    expect(document.querySelector('.notes-grid')).toBeNull();
    expect(document.body.innerHTML).toBe(before);
  });

  // 手寫 nav.toc 的父層同時含 .content（沒有 .layout 也算）：同樣不重排；
  it('nav.toc 的父層也含 .content 時，layout() 不改動 DOM', () => {
    // 沒有 .layout，只有同層的 nav.toc 與 .content；
    setBody('<div class="shell"><nav class="toc"><ol><li><a href="#a">A</a></li></ol></nav><div class="content"><article><h2 id="a">A</h2></article><article><h2>B</h2></article></div></div>');
    // 記下載入前；
    const before = document.body.innerHTML;
    // 載入；
    loadScript();
    // 不變；
    expect(document.querySelector('.notes-grid')).toBeNull();
    expect(document.body.innerHTML).toBe(before);
  });

  // 父層含 main 也算內容容器；
  it('nav.toc 的父層也含 main 時，layout() 不改動 DOM', () => {
    // nav 與 main 並排；
    setBody('<div class="shell"><nav class="toc"><ol><li><a href="#a">A</a></li></ol></nav><main><article><h2 id="a">A</h2></article></main></div>');
    // 記下；
    const before = document.body.innerHTML;
    // 載入；
    loadScript();
    // 不變；
    expect(document.querySelector('.notes-grid')).toBeNull();
    expect(document.body.innerHTML).toBe(before);
  });

  // 其他功能照常：.term 仍會初始化（有 term 時會在 body 建立 tipbar 之類的元素，至少不能丟錯；這裡驗證腳本已執行過旗標）；
  it('跳過版面後腳本仍然初始化（__notesInit 為 true）', () => {
    // 建 DOM；
    setBody(OWN_LAYOUT);
    // 載入；
    loadScript();
    // 旗標；
    expect((window as NotesWindow).__notesInit).toBe(true);
  });
});

// 第二組：沒有自己版面的頁面維持原行為；
describe('notes.js layout：單一 article 頁面（行為不變）', () => {
  // 單篇 md 轉出的頁面：一個 article、三個 h2、沒有手寫目錄；
  it('自動產生大綱並與 article 一起放進 .notes-grid', () => {
    // 建 DOM；
    setBody('<div class="wrap"><article><h2>甲</h2><p>1</p><h2>乙</h2><p>2</p><h2>丙</h2></article></div>');
    // 載入；
    loadScript();
    // 格線存在；
    const grid = document.querySelector('.notes-grid');
    expect(grid).not.toBeNull();
    // 格線的子節點依序是自動大綱與 article；
    expect(grid?.children[0].matches('nav.toc')).toBe(true);
    expect(grid?.children[1].tagName).toBe('ARTICLE');
    // 大綱有三個項目；
    expect(grid?.querySelectorAll('nav.toc li')).toHaveLength(3);
  });

  // 手寫大綱（不在 .layout、父層也沒有 .content）仍被沿用並搬進格線；
  it('沿用手寫的 nav.toc 並搬進格線', () => {
    // nav 寫在 article 內；
    setBody('<article><nav class="toc" id="mine"><ol><li><a href="#x">X</a></li></ol></nav><h2 id="x">X</h2><h2>Y</h2></article>');
    // 載入；
    loadScript();
    // 格線第一個子節點就是原本那個 nav（沒有重新建立）；
    const grid = document.querySelector('.notes-grid');
    expect(grid?.children[0].id).toBe('mine');
    expect(grid?.children[1].tagName).toBe('ARTICLE');
  });

  // 沒有 article：用 .wrap 當內容區，頁首仍在格線外；
  it('沒有 article 時把 .wrap 的內容包成 .notes-main，header 留在外面', () => {
    // header 在 .wrap 內；
    setBody('<div class="wrap"><header><h1>T</h1></header><h2>甲</h2><p>1</p><h2>乙</h2></div>');
    // 載入；
    loadScript();
    // 格線內有 notes-main；
    const grid = document.querySelector('.notes-grid');
    expect(grid?.querySelector('.notes-main')).not.toBeNull();
    // header 不在格線內；
    expect(grid?.querySelector('header')).toBeNull();
  });
});

// 第三組：多個 article 且沒有手寫目錄；
describe('notes.js layout：多個 article 沒有手寫目錄（R35）', () => {
  // 三個 article 並排在 .wrap 底下，上面有 header.hero；
  it('格線包含全部 article，且頁首留在格線外', () => {
    // 建 DOM；
    setBody('<div class="wrap"><header class="hero"><h1>T</h1></header><article class="card"><h2>甲</h2></article><article class="card"><h2>乙</h2></article><article class="card"><h2>丙</h2></article></div>');
    // 載入；
    loadScript();
    // 格線存在；
    const grid = document.querySelector('.notes-grid');
    expect(grid).not.toBeNull();
    // 三個 article 都在格線裡；
    expect(grid?.querySelectorAll('article')).toHaveLength(3);
    // 整頁的 article 數也是三個（沒有被複製或遺失），且每個都在格線內；
    expect(document.querySelectorAll('article')).toHaveLength(3);
    expect([...document.querySelectorAll('article')].every((a) => grid?.contains(a))).toBe(true);
    // 頁首在格線外；
    expect(grid?.querySelector('header.hero')).toBeNull();
    // 自動大綱有三個項目（涵蓋所有 article 的 h2）；
    expect(grid?.querySelectorAll('nav.toc li')).toHaveLength(3);
  });

  // article 不在同一層時，以共同祖先當內容區；
  it('article 分散在不同容器時以共同祖先當內容區', () => {
    // 兩個 article 分別在兩個 section 內；
    setBody('<div class="wrap"><section><article><h2>甲</h2></article></section><section><article><h2>乙</h2></article></section></div>');
    // 載入；
    loadScript();
    // 格線包含兩個 article；
    expect(document.querySelector('.notes-grid')?.querySelectorAll('article')).toHaveLength(2);
  });
});

// 第四組：初始化防呆；
describe('notes.js：__notesInit 防呆', () => {
  // 已經初始化過的視窗不再執行；
  it('旗標已為 true 時不做任何事', () => {
    // 建 DOM 但先把旗標設成 true（setBody 會清掉，所以在它之後再設）；
    setBody('<article><h2>甲</h2><h2>乙</h2></article>');
    (window as NotesWindow).__notesInit = true;
    // 載入；
    loadScript();
    // 沒有格線；
    expect(document.querySelector('.notes-grid')).toBeNull();
  });

  // 同一頁載入兩次只會建立一個格線；
  it('同一頁載入兩次只建立一個 .notes-grid', () => {
    // 建 DOM；
    setBody('<article><h2>甲</h2><h2>乙</h2></article>');
    // 載入兩次（第二次旗標已為 true）；
    loadScript();
    loadScript();
    // 只有一個格線；
    expect(document.querySelectorAll('.notes-grid')).toHaveLength(1);
  });
});
