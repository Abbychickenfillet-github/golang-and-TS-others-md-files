// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：此測試只碰檔案系統，改用 node 環境（jsdom 環境下 import.meta.url 不是 file:// 網址）；
// 從 vitest 匯入測試骨架：describe 分組、it 定義單一案例、expect 斷言；
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// 匯入 fs 的 promise 版 API，測試要即時寫出各種壞掉的設定檔；
import * as fs from 'node:fs/promises';
// 匯入 os 模組，取得系統暫存資料夾；
import * as os from 'node:os';
// 匯入 url 模組的 fileURLToPath，把 file:// URL 轉成作業系統的檔案路徑；
import { fileURLToPath } from 'node:url';
// 匯入 path 模組，用 path.join 組合路徑；
import * as path from 'node:path';
// 從被測模組匯入要測的函式與型別，`type` 前綴的匯入只在編譯期存在；
import { assertUniqueSlugs, isExcluded, listNotes, loadExclude, type NoteEntry } from '../src/lib/content';

// 用 new URL 以本檔為基準解析出假筆記庫的路徑，再轉成一般路徑（中文與空白會被正確還原）；
const vault = fileURLToPath(new URL('./fixture-vault', import.meta.url));
// 假筆記庫自己的 _config.yml 路徑；
const configPath = path.join(vault, '_config.yml');

// 小工具：把清單轉成 relPath 陣列，方便比對；箭頭函式的 map 對每一筆取出 relPath；
const paths = (notes: NoteEntry[]) => notes.map((n) => n.relPath);
// 小工具：用 relPath 找出單一筆記，找不到就丟錯讓測試明確失敗；
const byPath = (notes: NoteEntry[], rel: string): NoteEntry => {
  // find 回傳第一個符合條件的元素或 undefined；
  const hit = notes.find((n) => n.relPath === rel);
  // 沒找到時丟出帶路徑的錯誤，方便看是哪個檔案缺了；
  if (!hit) throw new Error(`找不到 ${rel}`);
  // 回傳找到的筆記；
  return hit;
};

// describe 把與 loadExclude 有關的案例分成一組；
describe('loadExclude', () => {
  // 案例：能讀出 _config.yml 的 exclude 清單；
  it('讀出 exclude 清單', async () => {
    // await 等 loadExclude 讀檔並解析 YAML；
    const exclude = await loadExclude(configPath);
    // toEqual 做深度比較，確認項目與順序都和假設定檔一致；
    expect(exclude).toEqual(['private/', '*.sh', 'build-index.py', 'skipped-root.md']);
  });
  // 案例：設定檔沒有 exclude 欄位時回傳空陣列；
  it('沒有 exclude 欄位時回傳空陣列', async () => {
    // 讀一份只有 title 的設定檔；
    const exclude = await loadExclude(path.join(vault, '特殊', 'no-exclude.yml'));
    // 沒有欄位就當成沒有排除；
    expect(exclude).toEqual([]);
  });
  // 案例：設定檔不存在時要明確失敗，避免默默把私人資料夾發布出去；
  it('設定檔不存在時丟錯', async () => {
    // rejects 讓 expect 等 Promise 被拒絕，再用 toThrow 比對錯誤；
    await expect(loadExclude(path.join(vault, 'no-such-config.yml'))).rejects.toThrow();
  });
});

// describe 分組：排除規則本身（純函式，不碰檔案系統）；
describe('isExcluded', () => {
  // 設定檔寫法的樣本清單；
  const patterns = ['private/', '*.sh', 'build-index.py', 'a/b/'];
  // 案例：結尾斜線只排除根層的該資料夾；
  it('結尾斜線只排除根層資料夾', () => {
    // 根層的 private 資料夾要被排除；
    expect(isExcluded('private', true, patterns)).toBe(true);
    // 巢狀的 sub/private 不是根層，不排除；
    expect(isExcluded('sub/private', true, patterns)).toBe(false);
    // 結尾斜線的規則不能排除同名的檔案；
    expect(isExcluded('private', false, patterns)).toBe(false);
    // 多層路徑的資料夾規則也要比對完整路徑；
    expect(isExcluded('a/b', true, patterns)).toBe(true);
  });
  // 案例：萬用字元規則依檔名在任何深度比對；
  it('*.sh 依檔名在任何深度比對', () => {
    // 根層的 x.sh 排除；
    expect(isExcluded('x.sh', false, patterns)).toBe(true);
    // 深層的 deep/dir/y.sh 也排除；
    expect(isExcluded('deep/dir/y.sh', false, patterns)).toBe(true);
    // 副檔名不同的不排除；
    expect(isExcluded('x.md', false, patterns)).toBe(false);
  });
  // 案例：沒有斜線也沒有萬用字元的名稱只比對根層該路徑；
  it('裸檔名只比對根層', () => {
    // 根層的 build-index.py 排除；
    expect(isExcluded('build-index.py', false, patterns)).toBe(true);
    // 子資料夾裡同名的檔案不排除；
    expect(isExcluded('sub/build-index.py', false, patterns)).toBe(false);
  });
  // 案例：底線與點開頭、node_modules 資料夾一律排除，不看設定；
  it('底線或點開頭與 node_modules 一律排除', () => {
    // 空的設定清單也要排除底線開頭的檔案；
    expect(isExcluded('_draft.md', false, [])).toBe(true);
    // 深層的點資料夾排除；
    expect(isExcluded('sub/.git', true, [])).toBe(true);
    // 任何深度的 node_modules 資料夾排除；
    expect(isExcluded('sub/node_modules', true, [])).toBe(true);
    // 一般檔案不排除；
    expect(isExcluded('sub/ok.md', false, [])).toBe(false);
  });
});

// describe 分組：listNotes 掃描假筆記庫；
describe('listNotes', () => {
  // 案例：被排除與隱藏的路徑都不在結果裡；
  it('排除 private、底線、點、node_modules、腳本與裸檔名', async () => {
    // 載入假設定檔的排除清單，再掃描；
    const notes = await listNotes(vault, await loadExclude(configPath));
    // 取出所有 relPath；
    const all = paths(notes);
    // 根層 private/ 內的筆記不得出現；
    expect(all).not.toContain('private/x.md');
    // 底線資料夾內的筆記不得出現；
    expect(all).not.toContain('_hidden/y.md');
    // 點資料夾內的筆記不得出現；
    expect(all).not.toContain('.dotdir/d.md');
    // 底線開頭的檔案不得出現；
    expect(all).not.toContain('_draft.md');
    // 根層與巢狀的 node_modules 都不得出現；
    expect(all).not.toContain('node_modules/z.md');
    expect(all).not.toContain('sub/node_modules/z.md');
    // exclude 裡寫的裸檔名（根層）不得出現；
    expect(all).not.toContain('skipped-root.md');
    // 巢狀的 private 不是 Jekyll 語意下的排除目標，要保留；
    expect(all).toContain('sub/private/keep.md');
  });
  // 案例：只收 .md 與 .html，其他副檔名一律略過；
  it('只收 md 與 html', async () => {
    // 掃描假筆記庫；
    const notes = await listNotes(vault, await loadExclude(configPath));
    // every 檢查所有筆記的 kind 都是 md 或 html；
    expect(notes.every((n) => n.kind === 'md' || n.kind === 'html')).toBe(true);
    // 不應出現 txt、sh、py、yml；
    expect(paths(notes).some((p) => /\.(txt|sh|py|yml)$/.test(p))).toBe(false);
  });
  // 案例：中文與空白檔名保留原樣，relPath 用正斜線；
  it('中文與空白檔名保留原樣', async () => {
    // 掃描；
    const notes = await listNotes(vault, await loadExclude(configPath));
    // 取出 md 那一筆；
    const md = byPath(notes, '前端/日期 物件.md');
    // kind 是 md；
    expect(md.kind).toBe('md');
    // slug 是去掉副檔名的路徑片段，中文與空白原封不動；
    expect(md.slug).toEqual(['前端', '日期 物件']);
    // 取出 html 那一筆，檔名含連字號與中文；
    const html = byPath(notes, '前端/日期 物件-互動版.html');
    // kind 是 html；
    expect(html.kind).toBe('html');
    // slug 同樣去掉 .html；
    expect(html.slug).toEqual(['前端', '日期 物件-互動版']);
  });
  // 案例：檔名含 # + 括號 % 時整串保留，不被當成 URL 片段或切掉；
  it('檔名含 # + 括號 % 時完整保留', async () => {
    // 掃描；
    const notes = await listNotes(vault, await loadExclude(configPath));
    // 含 # 的檔名；
    const sharp = byPath(notes, '特殊/C# 筆記.md');
    // slug 的最後一段保留 #；
    expect(sharp.slug).toEqual(['特殊', 'C# 筆記']);
    // 含 +、括號、% 的檔名；
    const plus = byPath(notes, '特殊/C++ (入門) 100%.md');
    // slug 的最後一段保留 + 括號與 %；
    expect(plus.slug).toEqual(['特殊', 'C++ (入門) 100%']);
  });
  // 案例：frontmatter 的 title 優先，且 frontmatter 內容被帶出；
  it('md 標題優先取 frontmatter title', async () => {
    // 掃描；
    const notes = await listNotes(vault, await loadExclude(configPath));
    // 有 title 與 h1 兩者時取 title；
    const entry = byPath(notes, 'fm-title.md');
    // 標題是前言的 title；
    expect(entry.title).toBe('前言標題');
    // frontmatter 物件含 title；
    expect(entry.frontmatter).toEqual({ title: '前言標題' });
    // 另一筆含陣列的 frontmatter 也要原樣帶出；
    expect(byPath(notes, '前端/日期 物件.md').frontmatter).toEqual({ title: '日期物件重點', tags: ['js'] });
  });
  // 案例：frontmatter 沒有 title 時退而用第一個 h1；
  it('md 有 frontmatter 但沒 title 時取第一個 h1', async () => {
    // 掃描；
    const notes = await listNotes(vault, await loadExclude(configPath));
    // 取出該筆；
    const entry = byPath(notes, 'fm-no-title.md');
    // 標題來自內文 h1；
    expect(entry.title).toBe('有 frontmatter 沒 title');
    // frontmatter 仍然保留 tags；
    expect(entry.frontmatter).toEqual({ tags: ['a'] });
  });
  // 案例：完全沒有 frontmatter 的 md 取第一個 h1，frontmatter 為空物件；
  it('md 沒 frontmatter 時取第一個 h1，frontmatter 為 {}', async () => {
    // 掃描；
    const notes = await listNotes(vault, await loadExclude(configPath));
    // 取出該筆；
    const entry = byPath(notes, 'no-fm-h1.md');
    // 取第一個 h1，不取二級標題；
    expect(entry.title).toBe('第一個 h1');
    // frontmatter 是空物件；
    expect(entry.frontmatter).toEqual({});
  });
  // 案例：h1 在程式碼圍欄裡不算；
  it('程式碼圍欄裡的 # 不算 h1', async () => {
    // 掃描；
    const notes = await listNotes(vault, await loadExclude(configPath));
    // 標題要是圍欄外的真正標題；
    expect(byPath(notes, 'fence-h1.md').title).toBe('真正的標題');
  });
  // 案例：什麼標題來源都沒有時用檔名（不含副檔名）；
  it('md 什麼都沒有時取檔名', async () => {
    // 掃描；
    const notes = await listNotes(vault, await loadExclude(configPath));
    // 標題是去掉副檔名的檔名；
    expect(byPath(notes, 'empty-title.md').title).toBe('empty-title');
  });
  // 案例：frontmatter 語法壞掉時不讓整個建置崩潰，視為沒有 frontmatter；
  it('frontmatter 壞掉時視為沒有 frontmatter', async () => {
    // 掃描；
    const notes = await listNotes(vault, await loadExclude(configPath));
    // 取出壞掉的那筆；
    const entry = byPath(notes, 'broken-fm.md');
    // frontmatter 退回空物件；
    expect(entry.frontmatter).toEqual({});
    // 標題仍能取得一個非空字串（不會是 undefined 或空白）；
    expect(entry.title.length).toBeGreaterThan(0);
  });
  // 案例：html 標題優先取 <title>，而不是 h1；
  it('plain.html 標題取自 <title>', async () => {
    // 掃描；
    const notes = await listNotes(vault, await loadExclude(configPath));
    // 取出 plain.html；
    const entry = byPath(notes, 'plain.html');
    // 標題來自 <title>；
    expect(entry.title).toBe('純 HTML 頁');
    // html 沒有 frontmatter，固定為空物件；
    expect(entry.frontmatter).toEqual({});
  });
  // 案例：沒有 <title> 時退而取第一個 h1；
  it('html 沒 <title> 時取第一個 h1', async () => {
    // 掃描；
    const notes = await listNotes(vault, await loadExclude(configPath));
    // 標題來自 h1；
    expect(byPath(notes, 'html-h1-only.html').title).toBe('只有 h1');
  });
  // 案例：兩者都沒有時取檔名；
  it('html 什麼都沒有時取檔名', async () => {
    // 掃描；
    const notes = await listNotes(vault, await loadExclude(configPath));
    // 標題是去掉副檔名的檔名；
    expect(byPath(notes, 'html-nothing.html').title).toBe('html-nothing');
  });
  // 案例：同 slug 的 md 與 html 配對，listNotes 兩筆都回傳而不丟錯（Task 7 改名前的合法狀態）；
  it('同 slug 的 md 與 html 兩筆都回傳', async () => {
    // 掃描，不能丟錯；
    const notes = await listNotes(vault, await loadExclude(configPath));
    // 篩出 slug 為 衝突/配對 的筆記；
    const pair = notes.filter((n) => n.slug.join('/') === '衝突/配對');
    // 共兩筆；
    expect(pair).toHaveLength(2);
    // 兩種 kind 各一；
    expect(pair.map((n) => n.kind).sort()).toEqual(['html', 'md']);
  });
  // 案例：結果依 relPath 排序，每次建置順序一致；
  it('結果依 relPath 排序', async () => {
    // 掃描；
    const all = paths(await listNotes(vault, await loadExclude(configPath)));
    // 複製一份再用字串碼點順序排序後應與原結果相同；
    expect(all).toEqual([...all].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  });
});

// describe 分組：slug 唯一性檢查；
describe('assertUniqueSlugs', () => {
  // 造一筆最小的筆記資料，其餘欄位用預設值；
  const make = (relPath: string, kind: 'md' | 'html'): NoteEntry => ({
    // 沿用傳入的種類；
    kind,
    // 沿用傳入的相對路徑；
    relPath,
    // slug 由路徑去掉副檔名再用 / 切開；
    slug: relPath.replace(/\.[^./]+$/, '').split('/'),
    // 測試不看標題；
    title: relPath,
    // 測試不看 frontmatter；
    frontmatter: {},
  });
  // 案例：沒有衝突時不丟錯；
  it('沒有衝突時不丟錯', () => {
    // toThrow 反向：不丟錯代表函式正常返回；
    expect(() => assertUniqueSlugs([make('a.md', 'md'), make('b.html', 'html')])).not.toThrow();
  });
  // 案例：有衝突時丟錯，訊息列出所有衝突群組與每個 relPath；
  it('有衝突時丟錯並列出所有群組的所有路徑', () => {
    // 兩組衝突：a 有 md 與 html；b 有三個同 slug 的路徑；
    const notes = [
      make('前端/a b.md', 'md'),
      make('前端/a b.html', 'html'),
      make('x/c.md', 'md'),
      make('x/c.html', 'html'),
      make('solo.md', 'md'),
    ];
    // 取得丟出的錯誤訊息，沒丟錯就是 undefined；
    let message = '';
    // try/catch 接住預期的錯誤；
    try {
      // 呼叫被測函式；
      assertUniqueSlugs(notes);
    } catch (error) {
      // 把錯誤轉成字串訊息；
      message = (error as Error).message;
    }
    // 訊息含第一組的兩個路徑；
    expect(message).toContain('前端/a b.md');
    expect(message).toContain('前端/a b.html');
    // 訊息含第二組的兩個路徑；
    expect(message).toContain('x/c.md');
    expect(message).toContain('x/c.html');
    // 沒衝突的檔案不出現在訊息裡；
    expect(message).not.toContain('solo.md');
  });
  // 案例：對假筆記庫真實掃描結果執行，會因 衝突/配對 而丟錯；
  it('假筆記庫掃描結果含配對衝突', async () => {
    // 掃描；
    const notes = await listNotes(vault, await loadExclude(configPath));
    // 預期丟錯且訊息含兩個衝突路徑；
    expect(() => assertUniqueSlugs(notes)).toThrow(/衝突\/配對\.md[\s\S]*衝突\/配對\.html|衝突\/配對\.html[\s\S]*衝突\/配對\.md/);
  });
});

// describe 分組：loadExclude 對壞掉的設定「失敗即關閉」，寧可丟錯也不默默發布私人資料；
describe('loadExclude 失敗即關閉', () => {
  // 每個案例專用的暫存資料夾；
  let tmp = '';
  // 每個案例前建立暫存資料夾；mkdtemp 會在前綴後補隨機字元；
  beforeEach(async () => {
    // 建立並記下路徑；
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'content-config-'));
  });
  // 每個案例後刪掉暫存資料夾；
  afterEach(async () => {
    // recursive 與 force 讓不存在或有內容都不丟錯；
    await fs.rm(tmp, { recursive: true, force: true });
  });
  // 小工具：把文字寫成暫存設定檔並呼叫 loadExclude；
  const load = async (yaml: string) => {
    // 組出設定檔路徑；
    const file = path.join(tmp, '_config.yml');
    // 寫入內容；
    await fs.writeFile(file, yaml, 'utf8');
    // 回傳 loadExclude 的 Promise；
    return loadExclude(file);
  };
  // 案例：空檔案、頂層不是 mapping 都要丟錯，錯誤訊息要指出設定檔名稱；
  it.each([
    // 空檔案；
    ['空檔案', ''],
    // 頂層是陣列；
    ['頂層是陣列', '- private/\n'],
    // 頂層是純文字；
    ['頂層是純文字', 'private/\n'],
  ])('%s 時丟錯並指出檔名', async (_label, yaml) => {
    // 訊息要含檔名 _config.yml；
    await expect(load(yaml)).rejects.toThrow(/_config\.yml/);
  });
  // 案例：exclude 存在但不是陣列（純量或空值）；
  it.each([
    // 純量字串；
    ['exclude: private/\n'],
    // 有鍵但沒有值（null）；
    ['exclude:\n'],
    // 物件；
    ['exclude:\n  a: b\n'],
  ])('exclude 不是陣列時丟錯：%j', async (yaml) => {
    // 訊息要指出 exclude 欄位；
    await expect(load(yaml)).rejects.toThrow(/exclude/);
  });
  // 案例：項目不是非空字串；
  it.each([
    // 數字項目；
    ['數字', 'exclude:\n  - 2024\n'],
    // 空字串項目；
    ['空字串', 'exclude:\n  - ""\n'],
    // 只有空白的項目；
    ['空白', 'exclude:\n  - "  "\n'],
    // 空值項目；
    ['null', 'exclude:\n  - \n'],
  ])('項目是%s時丟錯', async (_label, yaml) => {
    // 訊息要指出 exclude 欄位；
    await expect(load(yaml)).rejects.toThrow(/exclude/);
  });
  // 案例：不支援的樣式一律在載入時丟錯，且訊息點名該樣式；
  it.each([
    // 雙星號；
    '**/x.md',
    // 左中括號；
    '[abc].md',
    // 只有右中括號；
    'a].md',
    // 左大括號；
    '{a,b}.md',
    // 只有右大括號；
    'a}.md',
    // 結尾斜線加星號；
    '*/private/',
    // 結尾斜線加星號（字首）；
    'draft*/',
    // 結尾斜線加問號；
    'dr?ft/',
  ])('不支援的樣式 %s 丟錯並點名', async (pattern) => {
    // YAML 用雙引號包住樣式；
    await expect(load(`exclude:\n  - "${pattern}"\n`)).rejects.toThrow(pattern);
  });
  // 案例：支援的樣式都能正常載入；
  it('支援的樣式正常載入', async () => {
    // 結尾斜線、副檔名萬用字元、路徑萬用字元、問號、裸檔名；
    expect(await load('exclude:\n  - private/\n  - "*.sh"\n  - "docs/*.md"\n  - "a?c.md"\n  - x.py\n')).toEqual([
      'private/',
      '*.sh',
      'docs/*.md',
      'a?c.md',
      'x.py',
    ]);
  });
  // 案例：listNotes 直接收到不支援的樣式時也要拒絕，不能靜默比對不到；
  it('listNotes 收到不支援的樣式時 rejects', async () => {
    // 雙星號樣式；
    await expect(listNotes(vault, ['**/x'])).rejects.toThrow('**/x');
  });
});

// describe 分組：萬用字元的比對方向偏向「多排除」；
describe('萬用字元比對', () => {
  // 案例：? 剛好代表一個字元；
  it('? 剛好一個字元', () => {
    // 一個字元符合；
    expect(isExcluded('abc.md', false, ['a?c.md'])).toBe(true);
    // 零個字元不符合；
    expect(isExcluded('ac.md', false, ['a?c.md'])).toBe(false);
    // 兩個字元不符合；
    expect(isExcluded('abbc.md', false, ['a?c.md'])).toBe(false);
  });
  // 案例：含斜線的樣式中 * 可以跨越 /；
  it('路徑樣式的 * 跨越斜線', () => {
    // 第一層符合；
    expect(isExcluded('docs/top.md', false, ['docs/*.md'])).toBe(true);
    // 更深層也符合；
    expect(isExcluded('docs/sub/a.md', false, ['docs/*.md'])).toBe(true);
    // 不在 docs 下的不符合；
    expect(isExcluded('other/a.md', false, ['docs/*.md'])).toBe(false);
  });
  // 案例：路徑樣式透過 listNotes 排除較深層的真實筆記；
  it('docs/*.md 透過 listNotes 排除 docs/sub/a.md', async () => {
    // 不帶排除清單時兩篇都在；
    const before = paths(await listNotes(vault, []));
    // docs 下的兩篇都出現；
    expect(before).toContain('docs/sub/a.md');
    expect(before).toContain('docs/top.md');
    // 帶路徑樣式後兩篇都消失；
    const after = paths(await listNotes(vault, ['docs/*.md']));
    // 深層的不在；
    expect(after).not.toContain('docs/sub/a.md');
    // 第一層的也不在；
    expect(after).not.toContain('docs/top.md');
  });
  // 案例：*.draft.md 這種無斜線樣式依檔名排除真實筆記；
  it('*.draft.md 透過 listNotes 排除 idea.draft.md', async () => {
    // 不排除時有；
    expect(paths(await listNotes(vault, []))).toContain('idea.draft.md');
    // 排除後沒有，但其他筆記仍在；
    const after = paths(await listNotes(vault, ['*.draft.md']));
    // 草稿被排除；
    expect(after).not.toContain('idea.draft.md');
    // 其他筆記不受影響；
    expect(after).toContain('plain.html');
  });
});
