// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本測試只做字串處理，改用 node 環境；
// 從 vitest 匯入測試骨架：describe 分組、it 定義單一案例、expect 斷言、vi 提供假函式；
import { describe, expect, it, vi } from 'vitest';
// 匯入被測模組的公開函式；
import { renderMarkdown } from '../src/lib/markdown';
// 匯入 NoteEntry 型別與索引建立函式，用來組出 wikilink 索引；`import type` 整句只在編譯期存在；
import type { NoteEntry } from '../src/lib/content';
// 匯入 wikilink 索引建立函式；
import { buildWikilinkIndex } from '../src/lib/wikilink';

// 小工具：用 relPath 組一個最小的 md NoteEntry；
const note = (relPath: string): NoteEntry => {
  // 去掉 .md 後依 / 切成片段；
  const slug = relPath.replace(/\.md$/, '').split('/');
  // 標題用檔名；at(-1) 取最後一段；
  return { kind: 'md', relPath, slug, title: slug.at(-1) as string, frontmatter: {} };
};

// 小工具：組出一份 renderMarkdown 的 ctx，四個回呼都是假函式；notes 是要放進索引的筆記；
const makeCtx = (...notes: NoteEntry[]) => {
  // 假函式：記錄 onMissing 的呼叫；
  const onMissing = vi.fn();
  // 假函式：記錄 onAmbiguous 的呼叫；
  const onAmbiguous = vi.fn();
  // 假函式：onImage 回傳 /img/ 加檔名，方便斷言；`(name: string) => ...` 是箭頭函式；
  const onImage = vi.fn((name: string) => `/img/${name}`);
  // 回傳 ctx 與三個假函式，測試可直接檢查呼叫；
  return { index: buildWikilinkIndex(notes), onMissing, onAmbiguous, onImage };
};

// 小工具：只要 HTML 字串時的簡寫；
const html = async (source: string, ctx = makeCtx()) => (await renderMarkdown(source, ctx)).html;

// 基本行為與 frontmatter；
describe('renderMarkdown 基本', () => {
  // 一般段落與前言：前言解析成物件、不出現在 HTML；
  it('解析 frontmatter 但不渲染它', async () => {
    // 渲染一份有前言的筆記；
    const out = await renderMarkdown('---\ntitle: 標題\ntags: [a, b]\n---\n# 大標\n\n內文\n', makeCtx());
    // 前言是物件；
    expect(out.frontmatter).toEqual({ title: '標題', tags: ['a', 'b'] });
    // HTML 沒有前言文字；
    expect(out.html).not.toContain('title:');
    // 但有渲染內文；
    expect(out.html).toContain('<p>內文</p>');
  });
});

// 邊界輸入：空檔、只有前言、CRLF、分隔線與前言的區別、壞前言、---js；
describe('renderMarkdown 邊界輸入', () => {
  // 空字串：沒有前言也沒有內容；
  it('空字串得到空 html 與空前言', async () => {
    // 渲染空字串；
    const out = await renderMarkdown('', makeCtx());
    // 兩者都空；
    expect(out).toEqual({ html: '', frontmatter: {} });
  });

  // 只有前言：html 為空；
  it('只有前言的檔案 html 為空', async () => {
    // 前言後面沒有任何內文；
    const out = await renderMarkdown('---\ntitle: 只有前言\n---\n', makeCtx());
    // 前言有解析；
    expect(out.frontmatter).toEqual({ title: '只有前言' });
    // html 為空字串；
    expect(out.html).toBe('');
  });

  // CRLF 換行（Windows 編輯器存的檔）：前言與內文都要正常；
  it('CRLF 換行的前言與內文都正常', async () => {
    // 前言與兩段落都用 \r\n；
    const out = await renderMarkdown('---\r\ntitle: 標題\r\n---\r\n# 大標\r\n\r\n第一行\r\n第二行\r\n', makeCtx());
    // 前言正確；
    expect(out.frontmatter).toEqual({ title: '標題' });
    // 標題與段落正確，且輸出不含 \r（stringify 後換行統一成 \n 或保留於段落內，但不能出現孤立的 \r 破壞標籤）；
    expect(out.html).toContain('<h1 id="大標">大標</h1>');
    // 輸出完全不含 \r，換行已統一成 \n；
    expect(out.html).not.toContain('\r');
    // 段落內的換行保留；
    expect(out.html).toContain('第一行');
    // 第二行也在；
    expect(out.html).toContain('第二行');
  });

  // 開頭的 --- 若沒有結尾分隔線，它是分隔線而不是前言，整篇不能被吃掉；
  it('開頭 --- 沒有結尾時是分隔線，不當前言', async () => {
    // 分隔線後接一段文字；
    const out = await renderMarkdown('---\n\n這是內文\n', makeCtx());
    // 前言為空；
    expect(out.frontmatter).toEqual({});
    // 有 hr 與內文；
    expect(out.html).toBe('<hr>\n<p>這是內文</p>');
  });

  // 兩條 --- 之間是普通文字（不是 key: value）時，也不是前言；
  it('兩條 --- 夾普通文字不當前言', async () => {
    // hr、段落、hr；
    const out = await renderMarkdown('---\n\n普通段落\n\n---\n後面\n', makeCtx());
    // 前言為空；
    expect(out.frontmatter).toEqual({});
    // 兩條 hr 與段落都在；
    expect(out.html).toContain('<p>普通段落</p>');
    // 第二條分隔線；
    expect(out.html.match(/<hr>/g)).toHaveLength(2);
  });

  // R22：兩條 --- 夾著 Markdown 標題時不是前言，標題與內文都要渲染出來；
  it('--- 夾 # 標題 --- 時標題與內文都保留', async () => {
    // 分隔線、標題、分隔線、內文；
    const out = await renderMarkdown('---\n\n# 標題\n\n---\n\n內文\n', makeCtx());
    // 前言為空；
    expect(out.frontmatter).toEqual({});
    // 標題有渲染；
    expect(out.html).toContain('<h1 id="標題">標題</h1>');
    // 內文有渲染；
    expect(out.html).toContain('<p>內文</p>');
  });

  // 內文中間的 --- 是分隔線；
  it('內文中間的 --- 是 hr', async () => {
    // 前言之後再有一條分隔線；
    const out = await renderMarkdown('---\na: 1\n---\n上\n\n---\n\n下\n', makeCtx());
    // 前言只吃第一段；
    expect(out.frontmatter).toEqual({ a: 1 });
    // 內文含 hr；
    expect(out.html).toContain('<hr>');
  });

  // YAML 壞掉：不丟錯、前言為 {}、YAML 原文不出現在頁面；
  it('壞掉的 YAML 前言不丟錯也不外洩原文', async () => {
    // 與 fixture-vault 的 broken-fm.md 同型；
    const out = await renderMarkdown('---\ntitle: [壞掉\n---\n# 壞 frontmatter 的 h1\n', makeCtx());
    // 前言為空；
    expect(out.frontmatter).toEqual({});
    // 內文有標題；
    expect(out.html).toContain('壞 frontmatter 的 h1');
    // YAML 原文不在頁面上；
    expect(out.html).not.toContain('壞掉');
  });

  // 開頭是 ---js 的區塊不是前言：機制是前言的開頭行必須剛好是 ---（見 frontmatter.ts），所以程式碼不會被執行，整份當一般 Markdown 渲染；
  it('---js 區塊不被執行，且整份當內文渲染', async () => {
    // 旗標掛在 globalThis 上，被執行過就會被設成 true；
    const g = globalThis as { __pwned?: boolean };
    // 先確保旗標沒設；
    delete g.__pwned;
    // 渲染含 ---js 區塊的來源；
    const out = await renderMarkdown('---js\n{ title: (globalThis.__pwned = true, "x") }\n---\n內文\n', makeCtx());
    // 程式碼沒有跑；
    expect(g.__pwned).toBeUndefined();
    // 前言為空；
    expect(out.frontmatter).toEqual({});
    // 區塊原文出現在頁面上（它被當成普通內文）；
    expect(out.html).toContain('globalThis.__pwned');
    // 後面的內文仍在；
    expect(out.html).toContain('內文');
  });
});

// Obsidian 的 ==螢光筆==；
describe('==螢光筆==', () => {
  // 基本：==字== 變 <mark>；
  it('==字== 轉成 <mark>', async () => {
    // 一句話裡夾一段螢光筆；
    expect(await html('前 ==重點== 後')).toBe('<p>前 <mark>重點</mark> 後</p>');
  });

  // 同一段有多組；
  it('同一段多組各自配對', async () => {
    // 兩組螢光筆；
    expect(await html('==a== 和 ==b==')).toBe('<p><mark>a</mark> 和 <mark>b</mark></p>');
  });

  // 內部有行內格式（粗體、連結）會切成多個節點，仍要配對；
  it('跨行內格式節點也能配對', async () => {
    // 螢光筆裡有粗體；
    expect(await html('==前 **粗** 後==')).toBe('<p><mark>前 <strong>粗</strong> 後</mark></p>');
  });

  // 行內程式碼裡的 == 不動；
  it('行內程式碼裡的 == 不變', async () => {
    // 程式碼內有 a == b；
    expect(await html('用 `a == b` 比較')).toBe('<p>用 <code>a == b</code> 比較</p>');
    // 程式碼內成對的 == 也不變；
    expect(await html('`==x==`')).toBe('<p><code>==x==</code></p>');
  });

  // 圍欄程式碼裡的 == 不動；
  it('圍欄程式碼裡的 == 不變', async () => {
    // 圍欄內有成對 ==；
    expect(await html('```js\nif (a ==b== c) {}\n```')).toContain('a ==b== c');
  });

  // 單獨一組 ==（沒有配對）保留原樣；
  it('只有一個 == 保留原文', async () => {
    // 奇數個 ==；
    expect(await html('a == b')).toBe('<p>a == b</p>');
  });

  // 兩個 == 之間若是「前後有空白」的比較運算，不當螢光筆（開頭 == 後面是空白、結尾 == 前面是空白）；
  it('a == b and c == d 不被當成螢光筆', async () => {
    // 兩個比較運算子；
    expect(await html('若 a == b 且 c == d')).toBe('<p>若 a == b 且 c == d</p>');
  });

  // 三個以上的等號是別的東西（例如分隔線或 ===），不配對；
  it('=== 不當螢光筆', async () => {
    // 嚴格相等運算子；
    expect(await html('a === b 與 c === d')).toBe('<p>a === b 與 c === d</p>');
  });

  // 螢光筆內的 wikilink 照常連結；
  it('螢光筆內的 wikilink 照常連結', async () => {
    // 索引裡有「筆記」；
    const out = await html('==看 [[筆記]]==', makeCtx(note('筆記.md')));
    // mark 裡有連結；
    expect(out).toBe('<p><mark>看 <a href="/%E7%AD%86%E8%A8%98" class="wikilink">筆記</a></mark></p>');
  });
});

// Obsidian 的圖片嵌入 ![[圖.png]]；
describe('![[圖片]] 嵌入', () => {
  // 基本：呼叫 onImage 並用回傳值當 src，alt 是不含副檔名的檔名；
  it('![[圖.png]] 轉成 img 並呼叫 onImage', async () => {
    // 準備 ctx；
    const ctx = makeCtx();
    // 渲染；
    const out = await html('![[圖.png]]', ctx);
    // 輸出 img；
    expect(out).toBe('<p><img src="/img/圖.png" alt="圖"></p>');
    // onImage 收到寫在筆記裡的檔名；
    expect(ctx.onImage).toHaveBeenCalledExactlyOnceWith('圖.png');
  });

  // 帶資料夾與尺寸：onImage 收到不含 |尺寸 的名稱，width 寫進屬性；
  it('![[folder/圖.png|300]] 帶 width 且 onImage 不含尺寸', async () => {
    // 準備 ctx；
    const ctx = makeCtx();
    // 渲染；
    const out = await html('![[folder/圖.png|300]]', ctx);
    // 有 width；alt 用不含資料夾與副檔名的檔名；
    expect(out).toBe('<p><img src="/img/folder/圖.png" alt="圖" width="300"></p>');
    // onImage 的參數沒有 |300；
    expect(ctx.onImage).toHaveBeenCalledExactlyOnceWith('folder/圖.png');
  });

  // 寬x高 兩個數字；
  it('![[圖.png|300x200]] 同時給 width 與 height', async () => {
    // 渲染；
    expect(await html('![[圖.png|300x200]]')).toBe('<p><img src="/img/圖.png" alt="圖" width="300" height="200"></p>');
  });

  // 非數字的別名當 alt；
  it('![[圖.png|說明文字]] 別名當 alt', async () => {
    // 渲染；
    expect(await html('![[圖.png|說明文字]]')).toBe('<p><img src="/img/圖.png" alt="說明文字"></p>');
  });

  // 支援的副檔名：大小寫不拘；
  it.each(['a.png', 'a.jpg', 'a.jpeg', 'a.gif', 'a.webp', 'a.svg', 'a.avif', 'a.bmp', 'A.PNG'])('%s 被當成圖片', async (name) => {
    // 準備 ctx；
    const ctx = makeCtx();
    // 渲染；
    const out = await html(`![[${name}]]`, ctx);
    // 有 img；
    expect(out).toContain('<img ');
    // 有呼叫 onImage；
    expect(ctx.onImage).toHaveBeenCalledWith(name);
  });

  // 非圖片嵌入保持純文字，也不呼叫 onImage，也不產生連結；
  it('![[某篇筆記]] 保持純文字', async () => {
    // 索引裡有這篇筆記，確認它也不會被轉成連結；
    const ctx = makeCtx(note('某篇筆記.md'));
    // 渲染；
    const out = await html('見 ![[某篇筆記]] 內容', ctx);
    // 原樣文字；
    expect(out).toBe('<p>見 ![[某篇筆記]] 內容</p>');
    // 沒有呼叫 onImage；
    expect(ctx.onImage).not.toHaveBeenCalled();
    // 沒有回報找不到；
    expect(ctx.onMissing).not.toHaveBeenCalled();
  });

  // 同一段落內的嵌入與 wikilink 各自處理；
  it('同段落的圖片嵌入與 wikilink 各自正確', async () => {
    // 準備 ctx；
    const ctx = makeCtx(note('筆記.md'));
    // 渲染；
    const out = await html('看 [[筆記]] 與 ![[圖.png]] 結束', ctx);
    // 連結與圖片都在，且圖片沒有被包進連結；
    expect(out).toBe('<p>看 <a href="/%E7%AD%86%E8%A8%98" class="wikilink">筆記</a> 與 <img src="/img/圖.png" alt="圖"> 結束</p>');
  });

  // 屬性值必須跳脫，避免檔名內的引號打斷屬性；
  it('src 與 alt 內的特殊字元被跳脫', async () => {
    // onImage 回傳含雙引號與 & 的字串；
    const ctx = makeCtx();
    // 覆寫成回傳危險字元；
    ctx.onImage.mockImplementation(() => '/x"y&z.png');
    // 渲染檔名含 " 與 < 的圖片；
    const out = await html('![[a"&b.png]]', ctx);
    // src 的引號與 & 被跳脫；
    expect(out).toContain('src="/x&#x22;y&#x26;z.png"');
    // alt 的引號與 & 被跳脫；
    expect(out).toContain('alt="a&#x22;&#x26;b"');
    // 沒有出現未跳脫的屬性終止；
    expect(out).not.toContain('"y&z');
  });

  // 一般 Markdown 圖片不動：不呼叫 onImage，src 原樣；
  it('![alt](path) 不經過 onImage', async () => {
    // 準備 ctx；
    const ctx = makeCtx();
    // 渲染；
    const out = await html('![說明](images/a.png)', ctx);
    // 原樣；
    expect(out).toBe('<p><img src="images/a.png" alt="說明"></p>');
    // 沒有呼叫 onImage；
    expect(ctx.onImage).not.toHaveBeenCalled();
  });

  // 程式碼裡的 ![[圖.png]] 不處理；
  it('行內程式碼裡的 ![[圖.png]] 不處理', async () => {
    // 準備 ctx；
    const ctx = makeCtx();
    // 渲染；
    expect(await html('`![[圖.png]]`', ctx)).toBe('<p><code>![[圖.png]]</code></p>');
    // 沒有呼叫 onImage；
    expect(ctx.onImage).not.toHaveBeenCalled();
  });
});

// Obsidian 的 callout：`> [!type] 標題`；
describe('callout', () => {
  // 基本結構：標題與內文；
  it('> [!note] 標題 轉成 callout 結構', async () => {
    // 一個 note callout，標題後換行接內文；
    const out = await html('> [!note] 我的標題\n> 內文第一行\n> 內文第二行\n');
    // 完整結構（remark-rehype 在區塊之間插入換行）；
    expect(out).toBe(
      '<div class="callout callout-note" data-callout="note">\n<div class="callout-title">我的標題</div>\n<div class="callout-content">\n<p>內文第一行\n內文第二行</p>\n</div>\n</div>',
    );
  });

  // 各種型別；
  it.each(['warning', 'tip', 'info', 'danger', 'quote', 'abstract', 'success'])('[!%s] 型別', async (type) => {
    // 渲染；
    const out = await html(`> [!${type}] T\n> body\n`);
    // class 與 data 屬性都帶型別；
    expect(out).toContain(`<div class="callout callout-${type}" data-callout="${type}">`);
  });

  // 型別大小寫：一律小寫；
  it('型別轉成小寫', async () => {
    // 大寫型別；
    const out = await html('> [!WARNING] 小心\n> 內容\n');
    // 小寫輸出；
    expect(out).toContain('<div class="callout callout-warning" data-callout="warning">');
  });

  // 省略標題：用首字大寫的型別；
  it('省略標題時用首字大寫的型別', async () => {
    // 只有 [!tip]，內文在下一行；
    const out = await html('> [!tip]\n> 內容\n');
    // 預設標題；
    expect(out).toContain('<div class="callout-title">Tip</div>');
    // 內文仍在 content；
    expect(out).toContain('<p>內容</p>');
  });

  // 可摺疊標記；
  it('[!note]- 與 [!note]+ 加 data-fold', async () => {
    // 預設收合；
    expect(await html('> [!note]- 收合\n> x\n')).toContain('<div class="callout callout-note" data-callout="note" data-fold="closed">');
    // 預設展開；
    expect(await html('> [!note]+ 展開\n> x\n')).toContain('<div class="callout callout-note" data-callout="note" data-fold="open">');
    // 標題文字不含 +/-；
    expect(await html('> [!note]- 收合\n> x\n')).toContain('<div class="callout-title">收合</div>');
  });

  // 沒有 [!…] 的引用區塊仍是 blockquote；
  it('一般引用區塊仍是 blockquote', async () => {
    // 普通引用；
    expect(await html('> 一般引用\n')).toBe('<blockquote>\n<p>一般引用</p>\n</blockquote>');
    // 方括號不在開頭也不是 callout；
    expect(await html('> 前面 [!note] 後面\n')).toContain('<blockquote>');
  });

  // callout 內可有巢狀 Markdown：清單、程式碼、wikilink、粗體；
  it('callout 內容可含清單、程式碼與 wikilink', async () => {
    // 內文含清單、圍欄程式碼；
    const out = await html('> [!info] 清單\n> - 項目 [[筆記]]\n> - **粗體**\n>\n> ```js\n> a < b\n> ```\n', makeCtx(note('筆記.md')));
    // 清單；
    expect(out).toContain('<ul>');
    // wikilink；
    expect(out).toContain('<a href="/%E7%AD%86%E8%A8%98" class="wikilink">筆記</a>');
    // 粗體；
    expect(out).toContain('<strong>粗體</strong>');
    // 程式碼跳脫；
    expect(out).toContain('<pre><code class="language-js">a &#x3C; b\n</code></pre>');
  });

  // 標題內可有行內格式與連結；
  it('標題可含行內格式與 wikilink', async () => {
    // 標題含粗體與 wikilink；
    const out = await html('> [!tip] **粗** 見 [[筆記]]\n> 內容\n', makeCtx(note('筆記.md')));
    // 標題內有 strong 與連結；
    expect(out).toContain('<div class="callout-title"><strong>粗</strong> 見 <a href="/%E7%AD%86%E8%A8%98" class="wikilink">筆記</a></div>');
  });

  // 巢狀 callout；
  it('callout 可以巢狀', async () => {
    // 外層 note、內層 warning；
    const out = await html('> [!note] 外\n> 外文\n>\n> > [!warning] 內\n> > 內文\n');
    // 外層；
    expect(out).toContain('data-callout="note"');
    // 內層；
    expect(out).toContain('data-callout="warning"');
    // 內層的標題；
    expect(out).toContain('<div class="callout-title">內</div>');
  });

  // 只有標題沒有內文；
  it('只有標題沒有內文時不輸出空的 content', async () => {
    // 單行 callout；
    expect(await html('> [!note] 只有標題\n')).toBe('<div class="callout callout-note" data-callout="note">\n<div class="callout-title">只有標題</div>\n</div>');
  });

  // 標題後用兩個空白強制換行；
  it('標題行後的強制換行不會留在標題裡', async () => {
    // 行尾兩個空白；
    const out = await html('> [!note] 標題  \n> 內文\n');
    // 標題乾淨；
    expect(out).toContain('<div class="callout-title">標題</div>');
    // 內文獨立；
    expect(out).toContain('<p>內文</p>');
  });

  // CRLF；
  it('CRLF 的 callout 正常', async () => {
    // Windows 換行；
    const out = await html('> [!note] 標題\r\n> 內文\r\n');
    // 結構正常；
    expect(out).toContain('<div class="callout-title">標題</div>');
  });
});

// 原始 HTML：筆記是作者自己的內容，原始 HTML 一律保留；
describe('原始 HTML', () => {
  // 行內 <mark style> 的 style 逐位元組保留；
  it('<mark style="…"> 原樣保留', async () => {
    // Obsidian Highlightr 外掛產生的寫法；
    const out = await html('前 <mark style="background: #FFF3A3A6;">字</mark> 後');
    // 屬性值逐字相同；
    expect(out).toBe('<p>前 <mark style="background: #FFF3A3A6;">字</mark> 後</p>');
  });

  // 區塊層級的 HTML（例如 div 與 svg）保留；
  it('區塊 HTML 保留', async () => {
    // 一個帶 class 的 div；
    expect(await html('<div class="box" data-x="1">\n內容\n</div>\n')).toContain('<div class="box" data-x="1">');
  });

  // <script> 不被默默刪掉：設計決定是「原樣輸出」，因為筆記是作者自己的內容；
  it('<script> 原樣保留，不被默默刪除', async () => {
    // 內嵌腳本；
    const out = await html('<script>window.__x = 1 < 2;</script>\n');
    // 腳本標籤與內容都在；
    expect(out).toContain('<script>window.__x = 1 < 2;</script>');
  });

  // 原始 HTML 內的 ==x== 不會被轉成 mark（HTML 內容在 raw 節點裡，不是 Markdown text）；
  it('Markdown 螢光筆與原始 <mark> 並存', async () => {
    // 兩種寫法混用；
    expect(await html('==甲== 與 <mark class="hl">乙</mark>')).toBe('<p><mark>甲</mark> 與 <mark class="hl">乙</mark></p>');
  });
});

// GFM；
describe('GFM', () => {
  // 表格；
  it('表格', async () => {
    // 兩欄兩列；
    const out = await html('| a | b |\n|---|---|\n| 1 | 2 |\n');
    // 有 thead 與 tbody；
    expect(out).toContain('<thead>');
    // 儲存格；
    expect(out).toContain('<td>1</td>');
  });

  // 表格儲存格內帶別名的 wikilink 要寫成 \|，不能把表格拆壞；
  it('表格儲存格裡跳脫 pipe 的 wikilink', async () => {
    // 儲存格內 [[筆記\|別名]]；
    const out = await html('| 欄 | 欄2 |\n|---|---|\n| [[筆記\\|別名]] | 其他 |\n', makeCtx(note('筆記.md')));
    // 連結文字是別名，且表格仍是兩欄；
    expect(out).toContain('<td><a href="/%E7%AD%86%E8%A8%98" class="wikilink">別名</a></td>');
    // 第二欄正常；
    expect(out).toContain('<td>其他</td>');
  });

  // 表格內的圖片嵌入與 \| 尺寸；
  it('表格儲存格裡的圖片嵌入', async () => {
    // 尺寸前的 | 要寫成 \|；
    const out = await html('| 圖 |\n|---|\n| ![[圖.png\\|200]] |\n');
    // 有 width；
    expect(out).toContain('<td><img src="/img/圖.png" alt="圖" width="200"></td>');
  });

  // 任務清單；
  it('任務清單', async () => {
    // 一個勾選、一個沒勾；
    const out = await html('- [x] 完成\n- [ ] 未完成\n');
    // checkbox 輸入；
    expect(out).toContain('<input type="checkbox" checked disabled>');
    // 未勾選；
    expect(out).toContain('<input type="checkbox" disabled>');
  });

  // 刪除線；
  it('刪除線', async () => {
    // 雙波浪線；
    expect(await html('~~舊~~')).toBe('<p><del>舊</del></p>');
  });

  // 自動連結；
  it('自動連結', async () => {
    // 裸網址；
    expect(await html('見 https://example.com 結束')).toBe('<p>見 <a href="https://example.com">https://example.com</a> 結束</p>');
  });

  // 註腳；
  it('註腳', async () => {
    // 一個註腳；
    const out = await html('正文[^1]\n\n[^1]: 註腳內容\n');
    // 內文裡的參照；
    expect(out).toContain('<sup><a href="#user-content-fn-1"');
    // 註腳區塊；
    expect(out).toContain('<section data-footnotes="" class="footnotes">');
    // 註腳內容；
    expect(out).toContain('註腳內容');
  });

  // 有註腳時註腳標籤（已有 id）不會被改掉，也不影響其他標題；
  it('註腳標籤的 id 不被覆蓋', async () => {
    // 一個標題加一個註腳；
    const out = await html('## 標題\n\n字[^a]\n\n[^a]: 內容\n');
    // 註腳標籤保留 remark-rehype 給的 id（內文裡註腳參照的 aria-describedby 指向它）；
    expect(out).toContain('id="footnote-label"');
    // 一般標題照常；
    expect(out).toContain('<h2 id="標題">標題</h2>');
  });

  // 註腳區塊的隱藏標籤不可是 h1–h6：notes.js 會把 h2／h3 放進大綱，也會把它算進「至少 2 個標題」的門檻；
  it('註腳標籤不是標題（沒有 h2#footnote-label），註腳區塊仍保留且仍可被 aria-describedby 指到', async () => {
    // 一個標題加一個註腳；
    const out = await html('## 標題\n\n字[^a]\n\n[^a]: 內容\n');
    // 不是 h1 到 h6 的任何一個標題標籤；
    expect(out).not.toMatch(/<h[1-6][^>]*footnote-label/);
    // 全篇只有一個 h2（就是「標題」），所以大綱門檻不會被註腳標籤湊滿；
    expect(out.match(/<h[1-6][\s>]/g)).toHaveLength(1);
    // 註腳區塊還在，裡面有註腳內容；
    expect(out).toContain('<section data-footnotes="" class="footnotes">');
    // 標籤改成 p，仍帶 sr-only 類別（螢幕閱讀器可讀、畫面上看不到）與原本的 id；
    expect(out).toMatch(/<p class="sr-only" id="footnote-label">[^<]+<\/p>/);
    // 註腳參照仍指向這個 id；
    expect(out).toContain('aria-describedby="footnote-label"');
  });
});

// 程式碼圍欄；
describe('程式碼圍欄', () => {
  // 有語言：class="language-xxx"，內容跳脫；
  it('有語言的圍欄輸出 language class 並跳脫 HTML', async () => {
    // 內容含 < 與 &；
    const out = await html('```ts\nconst a = 1 < 2 && "x";\n```\n');
    // pre 加 code；
    expect(out).toBe('<pre><code class="language-ts">const a = 1 &#x3C; 2 &#x26;&#x26; "x";\n</code></pre>');
  });

  // 沒有語言：不加 class；
  it('沒有語言的圍欄不加 class', async () => {
    // 內容含 <script>；
    const out = await html('```\n<script>alert(1)</script>\n```\n');
    // 被跳脫成文字；
    expect(out).toBe('<pre><code>&#x3C;script>alert(1)&#x3C;/script>\n</code></pre>');
  });

  // 圍欄內的 wikilink、嵌入、callout 與螢光筆都不處理；
  it('圍欄內的特殊語法原樣', async () => {
    // 準備 ctx；
    const ctx = makeCtx(note('筆記.md'));
    // 圍欄內放各種語法；
    const out = await html('```md\n[[筆記]] ![[圖.png]] ==x== > [!note]\n```\n', ctx);
    // 全部原樣；
    expect(out).toContain('[[筆記]] ![[圖.png]] ==x== > [!note]');
    // 沒有呼叫 onImage；
    expect(ctx.onImage).not.toHaveBeenCalled();
  });
});

// wikilink 與其他外掛的整合；
describe('wikilink 整合', () => {
  // 一般連結；
  it('[[筆記]] 轉成連結', async () => {
    // 渲染；
    expect(await html('見 [[筆記]]', makeCtx(note('資料夾/筆記.md')))).toBe('<p>見 <a href="/%E8%B3%87%E6%96%99%E5%A4%BE/%E7%AD%86%E8%A8%98" class="wikilink">筆記</a></p>');
  });

  // 找不到：呼叫 onMissing、保留原文；
  it('找不到的 wikilink 呼叫 onMissing 並保留原文', async () => {
    // 準備 ctx；
    const ctx = makeCtx();
    // 渲染；
    expect(await html('見 [[不存在]]', ctx)).toBe('<p>見 [[不存在]]</p>');
    // 回報；
    expect(ctx.onMissing).toHaveBeenCalledExactlyOnceWith('不存在');
  });

  // 歧義：呼叫 onAmbiguous；
  it('有歧義的 wikilink 呼叫 onAmbiguous', async () => {
    // 兩篇同名筆記在不同資料夾；
    const ctx = makeCtx(note('甲/重名.md'), note('乙/重名.md'));
    // 渲染；
    expect(await html('[[重名]]', ctx)).toBe('<p>[[重名]]</p>');
    // 回報原文與候選；
    expect(ctx.onAmbiguous).toHaveBeenCalledExactlyOnceWith('重名', ['乙/重名.md', '甲/重名.md']);
  });

  // basePath；
  it('basePath 會加在連結前面', async () => {
    // 準備 ctx 並加 basePath；
    const ctx = { ...makeCtx(note('筆記.md')), basePath: '/Abby-notes' };
    // 渲染；
    expect(await html('[[筆記]]', ctx)).toContain('href="/Abby-notes/%E7%AD%86%E8%A8%98"');
  });

  // 嵌入與 wikilink 在同一段，順序顛倒也正確；
  it('圖片嵌入在前、wikilink 在後', async () => {
    // 準備 ctx；
    const ctx = makeCtx(note('筆記.md'));
    // 渲染；
    const out = await html('![[a.png]][[筆記]]![[b.jpg|50]]', ctx);
    // 兩張圖與一個連結；
    expect(out).toBe('<p><img src="/img/a.png" alt="a"><a href="/%E7%AD%86%E8%A8%98" class="wikilink">筆記</a><img src="/img/b.jpg" alt="b" width="50"></p>');
  });

  // wikilink 的段落連結 [[筆記#標題]] 的 id 與標題 id 規則一致（同一個 headingSlug）；
  it('[[筆記#標題]] 的錨點等於該標題的 id', async () => {
    // 先渲染目標筆記得到 id；
    const target = await html('## 第１章：Hello World\n');
    // 取出 id；
    const id = /id="([^"]+)"/.exec(target)?.[1];
    // 再渲染指向它的連結；
    const link = await html('[[筆記#第１章：Hello World]]', makeCtx(note('筆記.md')));
    // 連結裡的錨點是百分比編碼的（瀏覽器比對 id 前會先解碼），解碼後必須等於標題的 id；
    const fragment = /#([^"]+)"/.exec(link)?.[1] as string;
    // 解碼後相同；
    expect(decodeURIComponent(fragment)).toBe(id);
  });
});

// 標題 id：build-time 的 id 必須與 assets/notes.js 執行期的規則一致；
describe('標題 id', () => {
  // 全形與半形混排、中文：用 headingSlug 規則；
  it('全形半形混排與中文標題產生穩定 id', async () => {
    // 標題有全形括號、半形英文數字、全形冒號與中文；
    const out = await html('## 第１章：Hello World（v2）\n\n### 中文 標題\n');
    // 全形數字不是 [a-z0-9]，被換成 -；全形冒號與括號同理；
    expect(out).toContain('<h2 id="第-章-hello-world-v2">第１章：Hello World（v2）</h2>');
    // 空白換成 -；
    expect(out).toContain('<h3 id="中文-標題">中文 標題</h3>');
  });

  // 重複標題：與執行期相同，後面的加 -2、-3；
  it('重複標題依執行期規則加 -2、-3', async () => {
    // 三個同名標題；
    const out = await html('## 重複\n\n## 重複\n\n## 重複\n');
    // 第一個沒有後綴；
    expect(out).toContain('<h2 id="重複">重複</h2>');
    // 第二個 -2；
    expect(out).toContain('<h2 id="重複-2">重複</h2>');
    // 第三個 -3；
    expect(out).toContain('<h2 id="重複-3">重複</h2>');
  });

  // 去重產生的 id 若剛好與後面標題的 slug 相同，也要避開（與執行期的 while 迴圈一致，這是 h2、h3 的行為）；
  it('h2 去重 id 與後面標題撞名時繼續遞增', async () => {
    // 標題依序：a、a、a-2；
    const out = await html('## a\n\n## a\n\n## a-2\n');
    // 第一個 a；
    expect(out).toContain('<h2 id="a">a</h2>');
    // 第二個 a-2；
    expect(out).toContain('<h2 id="a-2">a</h2>');
    // 第三個標題 slug 是 a-2 已被占用，變成 a-2-2；
    expect(out).toContain('<h2 id="a-2-2">a-2</h2>');
  });

  // R18 第一點：執行期只替 h2、h3 編號；h1 在前、h2 在後同名時，h2 必須拿到執行期的值（docker），h1 讓位成 docker-2；
  it('# Docker 在前、## Docker 在後：h2 取 docker，h1 取 docker-2', async () => {
    // h1 先出現、h2 後出現；
    const out = await html('# Docker\n\n## Docker\n');
    // h2 的 id 與執行期相同；
    expect(out).toContain('<h2 id="docker">Docker</h2>');
    // h1 在第二輪才編號，避開已用的 docker；
    expect(out).toContain('<h1 id="docker-2">Docker</h1>');
  });

  // h4 在前也不會改變 h2 的 id；
  it('h4 不會讓 h2 的 id 位移', async () => {
    // h4 先、h2 後，同名；
    const out = await html('#### Docker\n\n## Docker\n\n### Docker\n');
    // h2 仍是 docker；
    expect(out).toContain('<h2 id="docker">Docker</h2>');
    // h3 與 h2 同組，是 -2；
    expect(out).toContain('<h3 id="docker-2">Docker</h3>');
    // h4 最後編號，避開前兩個，是 -3；
    expect(out).toContain('<h4 id="docker-3">Docker</h4>');
  });

  // h2 與 h3 共用同一組編號；
  it('h2 與 h3 重複標題共用編號 -2、-3', async () => {
    // 三個同名，層級混用；
    const out = await html('## 重 複\n\n### 重 複\n\n## 重 複\n');
    // 依文件順序；
    expect(out).toBe('<h2 id="重-複">重 複</h2>\n<h3 id="重-複-2">重 複</h3>\n<h2 id="重-複-3">重 複</h2>');
  });

  // 文字為空的標題：執行期略過，不給 id（也不占用編號）；
  it('文字為空的標題不給 id', async () => {
    // 空的 h2、h1，後面有正常的 sec 標題（slug 為空時才用 sec）；
    const out = await html('##\n\n#\n\n## ！\n');
    // 空 h2 沒有 id；
    expect(out).toContain('<h2></h2>');
    // 空 h1 沒有 id；
    expect(out).toContain('<h1></h1>');
    // 只有符號的標題文字不空，slug 空，退回 sec；
    expect(out).toContain('<h2 id="sec">！</h2>');
  });

  // nav.toc、.auto-toc、.tipcard 內的標題：執行期略過，不給 id、不占用；
  it('nav.toc、.auto-toc、.tipcard 內的標題不給 id 也不占用', async () => {
    // 三種容器各放一個 h2，後面一個正常同名標題；
    const out = await html('<nav class="toc"><h2>Docker</h2></nav>\n\n<div class="auto-toc"><h2>Docker</h2></div>\n\n<div class="tipcard"><h3>Docker</h3></div>\n\n## Docker\n');
    // 容器內的沒有 id；
    expect(out).toContain('<nav class="toc"><h2>Docker</h2></nav>');
    // 容器內的沒有 id；
    expect(out).toContain('<div class="auto-toc"><h2>Docker</h2></div>');
    // 容器內的沒有 id；
    expect(out).toContain('<div class="tipcard"><h3>Docker</h3></div>');
    // 正常標題拿到第一個 docker（沒被容器內的占走）；
    expect(out).toContain('<h2 id="docker">Docker</h2>');
  });

  // slug 為空時退回 sec，並同樣去重；
  it('slug 為空時退回 sec', async () => {
    // 只有符號的標題（全形驚嘆號、星號符號）；
    const out = await html('## ！！！\n\n## ★\n');
    // 第一個 sec；
    expect(out).toContain('<h2 id="sec">！！！</h2>');
    // 第二個 sec-2；
    expect(out).toContain('<h2 id="sec-2">★</h2>');
  });

  // 標題內含行內語法與連結時，用純文字算 slug；
  it('標題內的行內格式用純文字算 id', async () => {
    // 粗體、行內程式碼與連結混在標題裡；
    const out = await html('## **粗** `code` [連結](http://x.y)\n');
    // 純文字是「粗 code 連結」；
    expect(out).toContain('id="粗-code-連結"');
  });

  // h1 到 h6 全都有 id；
  it('h1 到 h6 都有 id', async () => {
    // 六個層級；
    const out = await html('# a1\n\n## b2\n\n### c3\n\n#### d4\n\n##### e5\n\n###### f6\n');
    // 逐層檢查；
    for (const [level, id] of [[1, 'a1'], [2, 'b2'], [3, 'c3'], [4, 'd4'], [5, 'e5'], [6, 'f6']] as const) {
      // 每層標籤都帶對應 id；
      expect(out).toContain(`<h${level} id="${id}">`);
    }
  });

  // 原始 HTML 的標題若已有 id 就保留，且占用該 id（執行期 `if (!h.id)` 的行為）；
  it('原始 HTML 標題已有 id 時保留並占用', async () => {
    // 手寫帶 id 的 h2，後面再一個同 slug 的 Markdown 標題；
    const out = await html('<h2 id="foo">別的字</h2>\n\n## foo\n');
    // 手寫 id 保留；
    expect(out).toContain('<h2 id="foo">別的字</h2>');
    // 後面的 foo 要避開 foo；
    expect(out).toContain('<h2 id="foo-2">foo</h2>');
  });

  // 標題元素自己帶被排除的 class：執行期 closest 也會比對元素自身，所以同樣略過、不占用；
  it('標題自己帶 auto-toc 或 tipcard 時不給 id', async () => {
    // 兩種自帶 class 的標題，後面一個正常同名標題；
    const out = await html('<h2 class="auto-toc">Docker</h2>\n\n<h3 class="tipcard">Docker</h3>\n\n## Docker\n');
    // 自帶 class 的沒有 id；
    expect(out).toContain('<h2 class="auto-toc">Docker</h2>');
    // 自帶 class 的沒有 id；
    expect(out).toContain('<h3 class="tipcard">Docker</h3>');
    // 正常標題拿到 docker；
    expect(out).toContain('<h2 id="docker">Docker</h2>');
  });

  // 手寫 id 出現在後面：先編號的 Markdown 標題照執行期順序處理（執行期同樣是文件順序、遇到才占用）；
  it('h1 的 id 避開所有 h2、h3（含手寫 id）', async () => {
    // h1 在最前面，後面 h2 手寫 id="x"；
    const out = await html('# x\n\n<h2 id="x">手寫</h2>\n');
    // h2 手寫 id 保留；
    expect(out).toContain('<h2 id="x">手寫</h2>');
    // h1 第二輪編號，避開 x；
    expect(out).toContain('<h1 id="x-2">x</h1>');
  });
});
