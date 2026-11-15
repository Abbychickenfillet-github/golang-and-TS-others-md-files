// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本測試只做字串與檔案處理，改用 node 環境；
// 從 vitest 匯入測試骨架：describe 分組、it 定義單一案例、expect 斷言、vi 提供假函式；
import { describe, expect, it, vi } from 'vitest';
// 匯入 fs 的同步讀檔函式，用來讀 assets/notes.js 做 headingSlug 一致性比對；
import { readFileSync } from 'node:fs';
// 匯入 url 模組的 fileURLToPath，把 file:// 網址轉成系統路徑；
import { fileURLToPath } from 'node:url';
// 匯入 unified 的 unified 函式，組出 Markdown → HTML 的處理管線；
import { unified } from 'unified';
// 匯入 remark-parse，把 Markdown 字串解析成 mdast 語法樹；
import remarkParse from 'remark-parse';
// 匯入 remark-gfm，支援 GFM 表格等語法；
import remarkGfm from 'remark-gfm';
// 匯入 remark-rehype，把 mdast 轉成 hast（HTML 語法樹）；
import remarkRehype from 'remark-rehype';
// 匯入 rehype-stringify，把 hast 輸出成 HTML 字串；
import rehypeStringify from 'rehype-stringify';
// 匯入被測模組的公開函式；
import { buildWikilinkIndex, findAmbiguity, headingSlug, listAmbiguousKeys, listShadowedTitles, remarkWikilink, resolveWikilink, resolveWikilinkDetailed, rewriteWikilinksInHtml } from '../src/lib/wikilink';
// 匯入 NoteEntry 型別；`import type` 整句只在編譯期存在；
import type { NoteEntry } from '../src/lib/content';

// 小工具：用 relPath 與標題快速組出一個 NoteEntry，kind 由副檔名決定；
const note = (relPath: string, title?: string): NoteEntry => {
  // 取副檔名（含點）；
  const ext = relPath.slice(relPath.lastIndexOf('.'));
  // 去掉副檔名後依 / 切成 slug 片段；
  const slug = relPath.slice(0, relPath.length - ext.length).split('/');
  // 沒給標題時用檔名當標題；at(-1) 取陣列最後一個元素；
  return { kind: ext === '.html' ? 'html' : 'md', relPath, slug, title: title ?? (slug.at(-1) as string), frontmatter: {} };
};

// 小工具：用一組筆記建索引；
const indexOf = (...notes: NoteEntry[]) => buildWikilinkIndex(notes);

// 小工具：把 Markdown 走完整管線輸出成 HTML 字串，並回報找不到與有歧義的連結；
const render = (md: string, index: Map<string, string>, basePath?: string) => {
  // vi.fn() 建立可記錄呼叫的假函式，用來檢查 onMissing 有沒有被呼叫；
  const onMissing = vi.fn();
  // 同上，記錄有歧義的連結；
  const onAmbiguous = vi.fn();
  // 組管線：解析 → GFM → wikilink 外掛 → 轉 hast → 輸出；processSync 同步處理；
  const html = String(
    unified().use(remarkParse).use(remarkGfm).use(remarkWikilink, { index, onMissing, onAmbiguous, basePath }).use(remarkRehype).use(rehypeStringify).processSync(md),
  );
  // 回傳 HTML 與兩個假函式；
  return { html, onMissing, onAmbiguous };
};

// 建索引的測試；
describe('buildWikilinkIndex', () => {
  // 鍵有兩種：檔名與 frontmatter 標題，值是未編碼的站內路徑；
  it('以檔名與標題為鍵，值是未編碼的站內路徑', () => {
    // 一篇檔名 日期物件、標題 日期 物件 的筆記；
    const index = indexOf(note('前端/日期物件.md', '日期 物件'));
    // 檔名鍵；
    expect(index.get('日期物件')).toBe('/前端/日期物件');
    // 標題鍵，值相同；
    expect(index.get('日期 物件')).toBe('/前端/日期物件');
  });

  // R15：索引永遠不丟錯；兩篇不同 md 同標題只是標記為有歧義；
  it('兩篇不同筆記標題相同：索引照樣建得出來，並標記該鍵有歧義', () => {
    // 檔名不同、標題相同；
    const index = indexOf(note('a/甲.md', '共同標題'), note('b/乙.md', '共同標題'));
    // 沒丟錯，兩個檔名鍵都在；歧義的標題鍵「不」放進公開 Map（R16：fail closed）；
    expect(index.has('甲') && index.has('乙')).toBe(true);
    // 歧義鍵在公開 Map 中不存在；
    expect(index.has('共同標題')).toBe(false);
    // 歧義鍵清單只有標題鍵，候選列出兩個 relPath；
    expect(listAmbiguousKeys(index)).toEqual([{ key: '共同標題', candidates: ['a/甲.md', 'b/乙.md'] }]);
  });

  // 指向有歧義的鍵：不連、原文保留、用 onAmbiguous 回報；加資料夾可消歧；
  it('[[標題]] 經 onAmbiguous 回報並保留純文字；[[資料夾/標題]] 可解析', () => {
    // 兩篇同標題的 md；
    const index = indexOf(note('a/甲.md', '共同標題'), note('b/乙.md', '共同標題'));
    // 只寫標題：歧義；
    const bare = render('見 [[共同標題]]', index);
    // 原文不變；
    expect(bare.html).toBe('<p>見 [[共同標題]]</p>');
    // 回報原始內文與候選 relPath；
    expect(bare.onAmbiguous).toHaveBeenCalledWith('共同標題', ['a/甲.md', 'b/乙.md']);
    // 不算缺漏；
    expect(bare.onMissing).not.toHaveBeenCalled();
    // 寫上資料夾：以資料夾尾段消歧，成功連到 a 資料夾那篇；
    const withFolder = render('見 [[a/共同標題]]', index);
    // 連到 /a/甲；
    expect(withFolder.html).toContain('href="/a/%E7%94%B2"');
    // 不再回報；
    expect(withFolder.onAmbiguous).not.toHaveBeenCalled();
  });

  // 檔名重複（不同資料夾）也是歧義，不是丟錯；
  it('不同資料夾的同名檔案：標記歧義，[[backend/README]] 可消歧，[[README]] 不連', () => {
    // 四個 README，其中兩個在同名資料夾 x 下的不同父層；
    const index = indexOf(note('a/README.md'), note('backend/README.md'), note('b/x/README.md'), note('c/x/README.md'));
    // 歧義清單含 README 與所有候選；
    expect(listAmbiguousKeys(index)).toEqual([{ key: 'README', candidates: ['a/README.md', 'b/x/README.md', 'backend/README.md', 'c/x/README.md'] }]);
    // 資料夾唯一符合：解析成功；
    expect(resolveWikilink('backend/README', index)?.href).toBe('/backend/README');
    // 沒給資料夾：回傳 null，並可用 findAmbiguity 取得候選；
    expect(resolveWikilink('README', index)).toBeNull();
    // 候選是全部四個；
    expect(findAmbiguity('README', index)).toHaveLength(4);
    // 資料夾尾段 x 仍符合兩篇：還是歧義，候選只剩那兩篇；
    expect(findAmbiguity('x/README', index)).toEqual(['b/x/README.md', 'c/x/README.md']);
    // 能解析的連結 findAmbiguity 回傳 null；
    expect(findAmbiguity('backend/README', index)).toBeNull();
    // 相對路徑記號 .. 與 . 被忽略，只用其後的資料夾片段消歧；
    expect(resolveWikilink('../backend/README|別名', index)?.href).toBe('/backend/README');
  });

  // html 不登記標題鍵：md 與 -互動版 html 同標題時沒有歧義，標題鍵歸 md；
  it('html 不登記標題鍵：md 與 -互動版 html 同標題不歧義，標題鍵指向 md', () => {
    // md 與改名後的互動版 html 標題相同；
    const index = indexOf(note('f/CDN.md', '快取失效'), note('f/CDN-互動版.html', '快取失效'));
    // 標題鍵只由 md 擁有；
    expect(index.get('快取失效')).toBe('/f/CDN');
    // html 仍可用自己的檔名鍵；
    expect(index.get('CDN-互動版')).toBe('/f/CDN-互動版');
    // 沒有任何歧義鍵；
    expect(listAmbiguousKeys(index)).toEqual([]);
  });

  // R16：歧義鍵不在公開 Map 內，複製、展開、手寫的 Map 看不到它，所以會當成「找不到」而不是默默連到第一個候選；
  it('歧義鍵 fail closed：Map 的複本與展開都不會連到任何一篇，原索引仍回報歧義', () => {
    // 兩個 README（歧義）加一篇唯一的筆記；
    const amb = indexOf(note('a/README.md'), note('b/README.md'), note('c/獨一.md'));
    // 歧義鍵不在 Map 內，唯一的鍵在；
    expect(amb.has('README')).toBe(false);
    // 唯一的鍵值正常；
    expect(amb.get('獨一')).toBe('/c/獨一');
    // 複製（失去旁路表）：歧義鍵視為找不到，不丟錯；
    expect(resolveWikilink('README', new Map(amb))).toBeNull();
    // 展開成陣列再重建（模擬序列化再還原）：同樣視為找不到；
    expect(resolveWikilink('README', new Map([...amb]))).toBeNull();
    // 複本回報的是「找不到」而不是「歧義」；
    expect(resolveWikilinkDetailed('README', new Map(amb)).status).toBe('missing');
    // 複本的唯一鍵仍能解析；
    expect(resolveWikilink('獨一', new Map(amb))?.href).toBe('/c/%E7%8D%A8%E4%B8%80');
    // 原索引（旁路表還在）：用 remark 外掛走一遍，保留純文字並呼叫 onAmbiguous；
    const { html, onAmbiguous, onMissing } = render('[[README]]', amb);
    // 原文不變；
    expect(html).toBe('<p>[[README]]</p>');
    // 回報歧義與候選；
    expect(onAmbiguous).toHaveBeenCalledWith('README', ['a/README.md', 'b/README.md']);
    // 不算缺漏；
    expect(onMissing).not.toHaveBeenCalled();
  });

  // R16：標題鍵被別人的檔名鍵蓋過時，要留下紀錄（優先序不變：檔名鍵勝）；
  it('標題被他人檔名鍵蓋過：listShadowedTitles 記錄贏家與被蓋過者', () => {
    // A 的檔名是「圖解」，B 的標題也是「圖解」，另有 C 的標題不撞任何鍵；
    const index = indexOf(note('a/圖解.md'), note('b/別的.md', '圖解'), note('c/丙.md', '獨特標題'));
    // 優先序不變：「圖解」仍指向 A；
    expect(index.get('圖解')).toBe('/a/圖解');
    // 只有被蓋過的那一筆被列出；
    expect(listShadowedTitles(index)).toEqual([{ key: '圖解', winner: 'a/圖解.md', shadowed: ['b/別的.md'] }]);
  });

  // 沒被蓋過的標題、以及筆記自己的標題等於自己的檔名，都不列；
  it('沒被蓋過的標題與「標題等於自己檔名」不列入 listShadowedTitles', () => {
    // 一篇標題等於檔名，一篇標題獨特；
    const index = indexOf(note('a/同名.md', '同名'), note('b/乙.md', '獨特標題'));
    // 空清單；
    expect(listShadowedTitles(index)).toEqual([]);
    // 手寫的普通 Map 沒有旁路表，也回傳空清單而不丟錯；
    expect(listShadowedTitles(new Map())).toEqual([]);
  });

  // R26：檔名鍵只有一篇 md 認領時，md 贏過任何 html（不同資料夾、複本都算），html 不是候選；
  it('R26：md 贏過其他資料夾的同名 html，也贏過同名 html 複本', () => {
    // 一篇 md、另一個資料夾的 html、再加同資料夾的 html 配對與 Claude outputs 的 html 複本；
    const index = indexOf(note('a/X.md'), note('b/X.html'), note('a/Y.md'), note('a/Y.html'), note('Claude outputs/Y.html'));
    // X 沒有歧義，公開 Map 指向 md；
    expect(index.get('X')).toBe('/a/X');
    // Y 同樣指向 md（配對與複本都不是候選）；
    expect(index.get('Y')).toBe('/a/Y');
    // 沒有任何歧義鍵；
    expect(listAmbiguousKeys(index)).toEqual([]);
    // 解析結果與回報也一致；
    expect(resolveWikilink('X', index)?.href).toBe('/a/X');
    // 複本不造成歧義；
    expect(findAmbiguity('Y', index)).toBeNull();
  });

  // R26：兩篇以上 md 認領同一鍵仍歧義，但候選只列 md；
  it('R26：兩篇 md 加一篇 html → 歧義，候選只有兩篇 md', () => {
    // 兩篇 md 與一篇 html；
    const index = indexOf(note('a/Z.md'), note('b/Z.md'), note('c/Z.html'));
    // 歧義鍵的候選只有 md；
    expect(listAmbiguousKeys(index)).toEqual([{ key: 'Z', candidates: ['a/Z.md', 'b/Z.md'] }]);
    // findAmbiguity 同樣只回 md；
    expect(findAmbiguity('Z', index)).toEqual(['a/Z.md', 'b/Z.md']);
    // 公開 Map 不含歧義鍵，複本也視為找不到（fail closed）；
    expect(index.has('Z')).toBe(false);
    // 複本找不到；
    expect(resolveWikilink('Z', new Map(index))).toBeNull();
  });

  // R26：只有 html 認領的鍵照舊：一篇就解析，多篇歧義；
  it('R26：只有 html 認領的鍵：一篇可解析、多篇歧義', () => {
    // 兩篇 html 同名、一篇 html 獨有；
    const index = indexOf(note('a/H.html'), note('b/H.html'), note('c/G.html'));
    // 獨有的可解析；
    expect(index.get('G')).toBe('/c/G');
    // 同名的歧義，兩篇 html 都是候選；
    expect(listAmbiguousKeys(index)).toEqual([{ key: 'H', candidates: ['a/H.html', 'b/H.html'] }]);
  });

  // R26：明確副檔名與資料夾仍優先；
  it('R26：[[x.html]] 仍指向 html，[[x.md]] 指向 md，資料夾先消歧', () => {
    // 一篇 md 與另一資料夾的同名 html；
    const index = indexOf(note('a/X.md'), note('b/X.html'));
    // 指名 html；
    expect(resolveWikilink('X.html', index)?.href).toBe('/b/X');
    // 指名 md；
    expect(resolveWikilink('X.md', index)?.href).toBe('/a/X');
    // 資料夾指到 html 所在處：資料夾先消歧，所以連到 html；
    expect(resolveWikilink('b/X', index)?.href).toBe('/b/X');
    // 沒給資料夾：md 贏；
    expect(resolveWikilink('X', index)?.href).toBe('/a/X');
  });

  // R3：同資料夾同名的 md 與 html 是配對，不算衝突，偏好 md；
  it('同資料夾同名的 md 與 html 不算衝突，索引偏好 md', () => {
    // 先 html 後 md，順序不影響結果；
    const index = indexOf(note('x/專題.html'), note('x/專題.md'));
    // 兩者 slug 相同，所以網址相同；
    expect(index.get('專題')).toBe('/x/專題');
  });

  // 檔名鍵優先於標題鍵：別人的標題撞到某檔名時，不丟錯、鍵歸檔名擁有者；
  it('檔名鍵優先於標題鍵，不丟錯', () => {
    // 筆記 A 的檔名是「圖解」，筆記 B 的標題也叫「圖解」；
    const index = indexOf(note('a/圖解.md'), note('b/別的.md', '圖解'));
    // 「圖解」指向檔名擁有者 A；
    expect(index.get('圖解')).toBe('/a/圖解');
    // B 仍可用自己的檔名連到；
    expect(index.get('別的')).toBe('/b/別的');
  });

  // 空陣列也能建出空索引；
  it('沒有筆記時回傳空索引', () => {
    // size 是 Map 的元素個數；
    expect(indexOf().size).toBe(0);
  });
});

// 解析單一 wikilink 的測試；
describe('resolveWikilink', () => {
  // 共用索引：一篇前端、一篇 html、一篇名字含特殊字元；
  const index = indexOf(note('前端/日期物件.md', '日期 物件'), note('互動/demo.html'), note('其他/C# + (a) ?x%.md'));

  // 基本寫法：回傳路徑與連結文字；
  it('[[標題]]：文字是標題、沒有別名', () => {
    // 以標題鍵解析；
    expect(resolveWikilink('日期 物件', index)).toEqual({ href: '/%E5%89%8D%E7%AB%AF/%E6%97%A5%E6%9C%9F%E7%89%A9%E4%BB%B6', text: '日期 物件' });
  });

  // 別名：文字改用別名；
  it('[[標題|別名]]：文字用別名', () => {
    // 別名放在 | 之後；
    expect(resolveWikilink('日期物件|看這篇', index)?.text).toBe('看這篇');
  });

  // 資料夾寫法：文字是最後一段；
  it('[[資料夾/標題]]：文字是最後一段，資料夾在唯一時被忽略', () => {
    // 資料夾寫對；
    expect(resolveWikilink('前端/日期物件', index)?.text).toBe('日期物件');
    // 資料夾寫錯但標題唯一，仍解析得到；
    expect(resolveWikilink('亂寫/日期物件', index)?.href).toContain('%E6%97%A5%E6%9C%9F');
  });

  // 括號可帶或不帶：呼叫端若傳完整 [[…]] 也接受；
  it('接受帶 [[ ]] 的完整字串', () => {
    // 外層括號被去掉；
    expect(resolveWikilink('[[日期物件]]', index)?.text).toBe('日期物件');
  });

  // 找不到回傳 null；
  it('找不到時回傳 null', () => {
    // 不存在的鍵；
    expect(resolveWikilink('不存在', index)).toBeNull();
  });

  // 轉義的直線 \| 要當作別名分隔；
  it('[[a\\|b]] 的轉義直線當別名分隔', () => {
    // 字串字面量裡的 \\| 就是反斜線加直線；
    expect(resolveWikilink('日期物件\\|別名', index)?.text).toBe('別名');
  });

  // 副檔名限定種類；
  it('[[x.html]] 只找 html 筆記，[[x.md]] 對 html 筆記視為找不到', () => {
    // 指名 html；
    expect(resolveWikilink('demo.html', index)?.href).toBe('/%E4%BA%92%E5%8B%95/demo');
    // 指名 md 但只有 html，找不到；
    expect(resolveWikilink('demo.md', index)).toBeNull();
    // 不指名時照常解析；
    expect(resolveWikilink('demo', index)?.href).toBe('/%E4%BA%92%E5%8B%95/demo');
    // 指名 md 且確實是 md；
    expect(resolveWikilink('日期物件.md', index)?.text).toBe('日期物件.md');
  });

  // 特殊字元要逐段編碼；
  it('檔名含空白、#、+、括號、?、% 時逐段編碼', () => {
    // 這篇的鍵是檔名（含空白等）；
    const r = resolveWikilink('C# + (a) ?x%', index);
    // 每個字元都要被 encodeURIComponent 處理；括號 encodeURIComponent 不編碼，所以保持原樣；
    expect(r?.href).toBe('/%E5%85%B6%E4%BB%96/C%23%20%2B%20(a)%20%3Fx%25');
  });

  // basePath 前綴；
  it('basePath 會加在最前面，結尾斜線被收掉', () => {
    // 帶結尾斜線的 basePath；
    expect(resolveWikilink('demo', index, '/Abby-notes/')?.href).toBe('/Abby-notes/%E4%BA%92%E5%8B%95/demo');
  });

  // 段落錨點；
  it('[[標題#段落]]：錨點用 headingSlug', () => {
    // 錨點接在路徑後；
    expect(resolveWikilink('demo#Hello World！', index)?.href).toBe('/%E4%BA%92%E5%8B%95/demo#hello-world');
    // 文字仍是標題（不含 #）；
    expect(resolveWikilink('demo#Hello', index)?.text).toBe('demo');
  });

  // 同頁錨點；
  it('[[#段落]]：href 只有錨點，文字是段落名', () => {
    // 同頁錨點不需要索引；
    expect(resolveWikilink('#中文 標題', index)).toEqual({ href: '#中文-標題', text: '中文 標題' });
  });

  // 檔名本身含 # 時整串優先當鍵；
  it('鍵本身含 # 時整串優先', () => {
    // 這篇檔名是 C#；
    const csharp = indexOf(note('語言/C#.md'));
    // 整串 C# 先當鍵比對；
    expect(resolveWikilink('C#', csharp)?.href).toBe('/%E8%AA%9E%E8%A8%80/C%23');
  });

  // 非 buildWikilinkIndex 建出的普通 Map 也能用；
  it('手寫的普通 Map 也能解析（沒有種類資訊時照鍵找）', () => {
    // 手寫索引；
    const plain = new Map([['手寫', '/a b/手寫']]);
    // 網址被逐段編碼；
    expect(resolveWikilink('手寫', plain)?.href).toBe('/a%20b/%E6%89%8B%E5%AF%AB');
  });
});

// headingSlug 要與 assets/notes.js 的 slug() 完全一致；
describe('headingSlug', () => {
  // 釘住幾個具體輸出；
  it('固定輸出：中文、大小寫、標點、網址、空字串', () => {
    // 中文與標點：標點變成 -，頭尾的 - 被修掉；
    expect(headingSlug('1. 為什麼要用 Session？')).toBe('1-為什麼要用-session');
    // 大小寫與空白：轉小寫，連續非字元合併成單一 -；
    expect(headingSlug('  Hello,   World!  ')).toBe('hello-world');
    // 網址先被整段移除；
    expect(headingSlug('看 https://example.com/a?b=1 這裡')).toBe('看-這裡');
    // 全是符號時退回 sec；
    expect(headingSlug('？！…')).toBe('sec');
    // 空字串也退回 sec；
    expect(headingSlug('')).toBe('sec');
  });

  // 從真實的 notes.js 取出 slug 函式原始碼，當場執行，與我們的實作逐一比對；
  it('與 assets/notes.js 的 slug() 對一組輸入逐一相同', () => {
    // 以本檔為基準找到 notes.js；
    const file = fileURLToPath(new URL('../../assets/notes.js', import.meta.url));
    // 讀成字串；
    const source = readFileSync(file, 'utf8');
    // 用正規表示式抓出 function slug(t) { … } 整段（到第一個換行加兩個空白加 } 為止）；
    const match = /function slug\(t\) \{[\s\S]*?\n {2}\}/.exec(source);
    // 抓不到就明確失敗；
    expect(match).not.toBeNull();
    // new Function 把原始碼包成函式並回傳 slug；
    const legacy = new Function(`${(match as RegExpExecArray)[0]}; return slug;`)() as (t: string) => string;
    // 一組涵蓋中英混合、符號、網址、全形、空白的輸入；
    const samples = ['Cookie 與 Session', 'a/b\\c', '【重點】async/await', 'C++ vs C#', '  ', 'https://x.y/z', 'ＡＢＣ１２３', '日期_物件-2', 'a---b', '---', '🙂 emoji 標題', 'Tab\tand\nnewline'];
    // 逐一比對；
    for (const s of samples) expect(headingSlug(s)).toBe(legacy(s));
  });
});

// remark 外掛的測試；
describe('remarkWikilink', () => {
  // 共用索引；
  const index = indexOf(note('前端/日期物件.md', '日期 物件'), note('互動/demo.html'), note('其他/C# + (a).md'));

  // 基本轉換：文字節點被拆成文字加連結，連結有 wikilink class；
  it('把 [[標題]] 轉成 class=wikilink 的連結，文字是標題', () => {
    // 前後各有一般文字；
    const { html, onMissing } = render('前 [[日期物件]] 後', index);
    // 完整輸出比對；
    expect(html).toBe('<p>前 <a href="/%E5%89%8D%E7%AB%AF/%E6%97%A5%E6%9C%9F%E7%89%A9%E4%BB%B6" class="wikilink">日期物件</a> 後</p>');
    // 沒有缺漏；
    expect(onMissing).not.toHaveBeenCalled();
  });

  // 別名與資料夾；
  it('別名與資料夾寫法', () => {
    // 別名；
    expect(render('[[日期物件|點我]]', index).html).toContain('>點我</a>');
    // 資料夾寫法文字只取最後一段；
    expect(render('[[前端/日期物件]]', index).html).toContain('>日期物件</a>');
  });

  // 找不到：呼叫 onMissing，保留原文，不產生連結；
  it('找不到時呼叫 onMissing 並保留原本文字', () => {
    // 不存在的目標；
    const { html, onMissing } = render('看 [[不存在]] 吧', index);
    // 保留純文字；
    expect(html).toBe('<p>看 [[不存在]] 吧</p>');
    // 回報了缺漏的目標；
    expect(onMissing).toHaveBeenCalledWith('不存在');
  });

  // 被排除的筆記不在清單內，所以視為找不到，且輸出不洩漏其路徑；
  it('指向被排除筆記的連結視為找不到，輸出不含被排除的路徑', () => {
    // 索引只含公開筆記，「秘密」資料夾的筆記根本沒傳進來；
    const { html, onMissing } = render('[[秘密筆記]]', index);
    // 純文字、沒有 href；
    expect(html).toBe('<p>[[秘密筆記]]</p>');
    // 有回報；
    expect(onMissing).toHaveBeenCalledWith('秘密筆記');
  });

  // 表格儲存格裡的 \| 要能解析；
  it('GFM 表格儲存格內的 [[a\\|b]] 能解析成別名連結', () => {
    // 表格 Markdown：儲存格內用 \| 轉義別名直線；
    const md = '| 欄 |\n| --- |\n| [[日期物件\\|別名]] |\n';
    // 走完整管線；
    const { html, onMissing } = render(md, index);
    // 連結文字是別名；
    expect(html).toContain('class="wikilink">別名</a>');
    // 沒有缺漏；
    expect(onMissing).not.toHaveBeenCalled();
  });

  // 嵌入語法不處理；
  it('![[img.png]] 原樣保留，不當連結也不回報缺漏', () => {
    // 圖片嵌入；
    const { html, onMissing } = render('![[img.png]]', index);
    // 原文不變；
    expect(html).toBe('<p>![[img.png]]</p>');
    // 不回報；
    expect(onMissing).not.toHaveBeenCalled();
  });

  // 行內程式碼與圍欄程式碼不碰；
  it('行內程式碼與圍欄程式碼內的 [[x]] 不處理', () => {
    // 行內程式碼；
    const inline = render('`[[日期物件]]`', index);
    // 原樣；
    expect(inline.html).toBe('<p><code>[[日期物件]]</code></p>');
    // 圍欄程式碼；
    const fenced = render('```\n[[日期物件]]\n```\n', index);
    // 原樣；
    expect(fenced.html).toContain('[[日期物件]]');
    // 沒有連結；
    expect(fenced.html).not.toContain('<a');
    // 兩者都沒回報；
    expect(inline.onMissing).not.toHaveBeenCalled();
    // 同上；
    expect(fenced.onMissing).not.toHaveBeenCalled();
  });

  // 已經在連結裡的不再包一層；
  it('既有連結內的 [[x]] 不再巢狀連結', () => {
    // Markdown 連結文字內含 wikilink；
    const { html } = render('[看 [[日期物件]]](https://example.com)', index);
    // 只有一個 a；
    expect(html.match(/<a /g)?.length).toBe(1);
  });

  // 特殊字元與 basePath；
  it('特殊字元逐段編碼並加 basePath', () => {
    // 檔名含 #、+、括號、空白；
    const { html } = render('[[C# + (a)]]', index, '/blog');
    // 完整 href；
    expect(html).toContain('href="/blog/%E5%85%B6%E4%BB%96/C%23%20%2B%20(a)"');
  });

  // 同頁錨點；
  it('[[#段落]] 產生只有錨點的連結', () => {
    // 同頁錨點；mdast-util-to-hast 輸出 href 時會把非 ASCII 字元百分比編碼（瀏覽器比對 id 前會先解碼，效果相同）；
    expect(render('[[#我的 段落]]', index).html).toBe(`<p><a href="#${encodeURIComponent('我的-段落')}" class="wikilink">我的 段落</a></p>`);
  });

  // 一段文字多個連結；
  it('同一段文字多個 wikilink 各自處理', () => {
    // 一個找得到、一個找不到；
    const { html, onMissing } = render('[[日期物件]] 與 [[無]]', index);
    // 前者是連結；
    expect(html).toContain('class="wikilink">日期物件</a>');
    // 後者保留；
    expect(html).toContain('[[無]]');
    // 只回報後者；
    expect(onMissing).toHaveBeenCalledTimes(1);
  });
});

// HTML 重寫的測試；
describe('rewriteWikilinksInHtml', () => {
  // 共用索引；
  const index = indexOf(note('前端/日期物件.md', '日期 物件'));

  // 基本：連結文字是完整的原始 [[…]]；
  it('文字節點內的 [[x]] 變成 class=wikilink 的連結，文字保留完整 [[…]]', () => {
    // 回報用的假函式；
    const onMissing = vi.fn();
    // 重寫；
    const out = rewriteWikilinksInHtml('<p>看 [[日期物件|別名]] 吧</p>', index, onMissing, vi.fn());
    // 連結文字是原字串；
    expect(out).toBe('<p>看 <a class="wikilink" href="/%E5%89%8D%E7%AB%AF/%E6%97%A5%E6%9C%9F%E7%89%A9%E4%BB%B6">[[日期物件|別名]]</a> 吧</p>');
    // 沒有缺漏；
    expect(onMissing).not.toHaveBeenCalled();
  });

  // 找不到：保留原文並回報；
  it('找不到時保留原文並呼叫 onMissing', () => {
    // 假函式；
    const onMissing = vi.fn();
    // 輸入沒有可解析的目標；
    const html = '<p>[[不存在]]</p>';
    // 輸出與輸入完全相同；
    expect(rewriteWikilinksInHtml(html, index, onMissing, vi.fn())).toBe(html);
    // 有回報；
    expect(onMissing).toHaveBeenCalledWith('不存在');
  });

  // 有歧義：保留原文並呼叫 onAmbiguous（不是 onMissing）；
  it('指向有歧義的鍵時保留原文，呼叫 onAmbiguous 而非 onMissing', () => {
    // 兩個同名 README；
    const amb = indexOf(note('a/README.md'), note('b/README.md'));
    // 假函式；
    const onMissing = vi.fn();
    // 另一個假函式；
    const onAmbiguous = vi.fn();
    // 輸入；
    const html = '<p>[[README]] 與 [[b/README]]</p>';
    // 第一個歧義保留，第二個有資料夾所以連結；
    expect(rewriteWikilinksInHtml(html, amb, onMissing, onAmbiguous)).toBe('<p>[[README]] 與 <a class="wikilink" href="/b/README">[[b/README]]</a></p>');
    // 回報候選；
    expect(onAmbiguous).toHaveBeenCalledWith('README', ['a/README.md', 'b/README.md']);
    // 只呼叫一次；
    expect(onAmbiguous).toHaveBeenCalledTimes(1);
    // 不算缺漏；
    expect(onMissing).not.toHaveBeenCalled();
  });

  // script、style、a、code、pre、textarea 內不碰；
  it('不改 script、style、a、code、pre、textarea 內的 [[', () => {
    // 這些容器內都有 [[日期物件]]；
    const html = '<script>var a = "[[日期物件]]";</script><style>/* [[日期物件]] */</style><a href="#">[[日期物件]]</a><code>[[日期物件]]</code><pre>[[日期物件]]</pre><textarea>[[日期物件]]</textarea>';
    // 假函式；
    const onMissing = vi.fn();
    // 輸出與輸入逐字相同；
    expect(rewriteWikilinksInHtml(html, index, onMissing, vi.fn())).toBe(html);
    // 這些位置也不回報；
    expect(onMissing).not.toHaveBeenCalled();
  });

  // 沒有 [[ 時原樣回傳（不重新序列化）；
  it('沒有 [[ 的 HTML 原樣回傳', () => {
    // 含單引號屬性與自閉合標籤，重新序列化就會改變；
    const html = "<!DOCTYPE html><html><body><img src='a.png'/><br/></body></html>";
    // 逐字相同；
    expect(rewriteWikilinksInHtml(html, index, vi.fn(), vi.fn())).toBe(html);
  });

  // 完整文件：doctype、單引號屬性、其他結構逐字保留，只有 wikilink 那段被換掉；
  it('完整文件只換掉 wikilink 文字，doctype 與屬性引號逐字保留', () => {
    // 含 doctype、單引號屬性、自閉合標籤、script 內含 [[；
    const html = "<!DOCTYPE html>\n<html lang='zh-TW'>\n<head><meta charset='utf-8'><title>T [[日期物件]]</title></head>\n<body class='x'>\n<p data-a='1'>見 [[日期物件]]&nbsp;&amp;</p><br/>\n<script>var s = '[[日期物件]]';</script>\n</body>\n</html>\n";
    // 重寫；
    const out = rewriteWikilinksInHtml(html, index, vi.fn(), vi.fn());
    // 預期：只有 p 內那一個 wikilink 被換成連結，其餘（含 title 內的）逐字不變；
    const expected = html.replace('見 [[日期物件]]', '見 <a class="wikilink" href="/%E5%89%8D%E7%AB%AF/%E6%97%A5%E6%9C%9F%E7%89%A9%E4%BB%B6">[[日期物件]]</a>');
    // 比對；
    expect(out).toBe(expected);
  });

  // 片段（沒有 html／body）也能處理；
  it('HTML 片段：保留單引號屬性與其他原樣', () => {
    // 片段含單引號屬性；
    const html = "<div class='a'><p>[[日期物件]]</p><img src='x.png'></div>";
    // 重寫；
    const out = rewriteWikilinksInHtml(html, index, vi.fn(), vi.fn(), '/b');
    // 預期；
    expect(out).toBe("<div class='a'><p><a class=\"wikilink\" href=\"/b/%E5%89%8D%E7%AB%AF/%E6%97%A5%E6%9C%9F%E7%89%A9%E4%BB%B6\">[[日期物件]]</a></p><img src='x.png'></div>");
  });

  // CRLF 換行：位置偏移仍要對得上原始字串；
  it('CRLF 換行的文件也能精準替換', () => {
    // 前面有 CRLF 與中文，後面才出現 wikilink；
    const html = '<p>第一行\r\n第二行</p>\r\n<p>[[日期物件]]</p>\r\n';
    // 重寫；
    const out = rewriteWikilinksInHtml(html, index, vi.fn(), vi.fn());
    // 只換掉 wikilink，CRLF 全部保留；
    expect(out).toBe(html.replace('[[日期物件]]', '<a class="wikilink" href="/%E5%89%8D%E7%AB%AF/%E6%97%A5%E6%9C%9F%E7%89%A9%E4%BB%B6">[[日期物件]]</a>'));
  });

  // 嵌入語法不處理；
  it('![[img.png]] 在 HTML 裡也原樣保留', () => {
    // 假函式；
    const onMissing = vi.fn();
    // 輸入；
    const html = '<p>![[img.png]]</p>';
    // 原樣；
    expect(rewriteWikilinksInHtml(html, index, onMissing, vi.fn())).toBe(html);
    // 不回報；
    expect(onMissing).not.toHaveBeenCalled();
  });

  // 屬性值需要跳脫的字元；
  it('href 內的 & 與 " 會被跳脫', () => {
    // 這篇檔名含 &；encodeURIComponent 會把 & 編成 %26，所以 href 裡本來就沒有裸 &，確認輸出是合法 HTML；
    const idx = indexOf(note('a/R&D.md'));
    // 重寫；
    const out = rewriteWikilinksInHtml('<p>[[R&amp;D]]</p>', idx, vi.fn(), vi.fn());
    // 解碼 &amp; 後能找到，href 內為 %26；
    expect(out).toBe('<p><a class="wikilink" href="/a/R%26D">[[R&amp;D]]</a></p>');
  });
});
