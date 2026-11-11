// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本檔只測純字串函式，不需要 jsdom，改用 node 環境；
// 從 vitest 匯入測試骨架：describe 分組、it 定義單一案例、expect 斷言；
import { describe, expect, it } from 'vitest';
// 匯入被測模組的純函式；
import { browserCandidates, buildIndexHtml, fileUrl, safeName, screenshotArgs, shotFileName } from '../src/lib/batch-report';

// 第一組：檔名淨化；
describe('safeName／shotFileName', () => {
  // 路徑分隔與特殊字元換成連字號，副檔名 .html 去掉，中文保留；
  it('把路徑轉成安全的檔名片段，保留中文並去掉 .html', () => {
    // 樣板頁路徑；
    expect(safeName('backend/Session-Token-Cookie-認證系列/1-Cookie-與-Session-互動版.html')).toBe('backend-Session-Token-Cookie-認證系列-1-Cookie-與-Session-互動版');
  });

  // Windows 路徑分隔、空白與 Windows 禁用字元；
  it('反斜線、空白與 Windows 禁用字元都換掉，連續的合併成一個連字號', () => {
    // 含空白、冒號、問號、星號、引號、角括號、直線；
    expect(safeName('a\\b c/d:e?f*g"h<i>j|k.html')).toBe('a-b-c-d-e-f-g-h-i-j-k');
  });

  // 過長要截斷，空字串要有後備名稱；
  it('過長截斷、空結果退回 page', () => {
    // 200 個 a 截到 80 個；
    expect(safeName(`${'a'.repeat(200)}.html`)).toHaveLength(80);
    // 全是禁用字元；
    expect(safeName('***.html')).toBe('page');
  });

  // 截圖檔名：兩位數序號 + 連字號 + 淨化名稱 + .png；
  it('shotFileName 以兩位數序號開頭並以 .png 結尾', () => {
    // 序號 3；
    expect(shotFileName(3, 'x/y.html')).toBe('03-x-y.png');
    // 序號 12 不補零；
    expect(shotFileName(12, 'x/y.html')).toBe('12-x-y.png');
  });
});

// 第二組：file URL；
describe('fileUrl', () => {
  // 中文與空白要百分號編碼，協定是 file:///；
  it('產生以 file:/// 開頭、中文與空白已編碼的網址', () => {
    // 依平台用絕對路徑；
    const abs = process.platform === 'win32' ? 'C:\\notes\\a b\\認證.html' : '/notes/a b/認證.html';
    // 轉換；
    const url = fileUrl(abs);
    // 協定；
    expect(url.startsWith('file:///')).toBe(true);
    // 空白被編成 %20，中文被編成百分號序列；
    expect(url).toContain('a%20b');
    expect(url).toContain(encodeURIComponent('認證'));
  });
});

// 第三組：找瀏覽器；
describe('browserCandidates', () => {
  // 環境變數是完整路徑：它排第一；
  it('BROWSER 是路徑時排在最前面', () => {
    // 指定路徑；
    const list = browserCandidates({ BROWSER: 'D:\\x\\my.exe' }, 'win32');
    // 第一個就是它；
    expect(list[0]).toBe('D:\\x\\my.exe');
  });

  // BROWSER 是 msedge 或 chrome 這種名稱：展開成該瀏覽器的常見路徑；
  it('BROWSER=msedge 時 Edge 的路徑排在 Chrome 前面', () => {
    // Windows；
    const list = browserCandidates({ BROWSER: 'msedge' }, 'win32');
    // Edge 的路徑先於 Chrome 的路徑；
    expect(list.findIndex((p) => /msedge\.exe$/i.test(p))).toBeLessThan(list.findIndex((p) => /chrome\.exe$/i.test(p)));
    // 第一個是 Edge；
    expect(list[0]).toMatch(/msedge\.exe$/i);
  });

  // 沒有環境變數：Windows 含 Edge 與 Chrome 的常見位置，Linux 含常見指令名稱；
  it('沒有 BROWSER 時 Windows 與 Linux 各有候選', () => {
    // Windows：含兩個 Edge 與 Chrome 的標準位置；
    const win = browserCandidates({}, 'win32');
    expect(win).toContain('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe');
    expect(win).toContain('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
    // Linux：含 google-chrome 與 chromium；
    const linux = browserCandidates({}, 'linux');
    expect(linux).toContain('google-chrome');
    expect(linux).toContain('chromium');
  });
});

// 第四組：瀏覽器參數；
describe('screenshotArgs', () => {
  // 參數內容與順序；
  it('包含 headless、視窗大小、virtual-time-budget、截圖路徑與網址（網址在最後）', () => {
    // 產生；
    const args = screenshotArgs({ png: 'out.png', url: 'file:///x.html', height: 2600, userDataDir: 'tmp-profile' });
    // 各旗標；
    expect(args).toContain('--headless=new');
    expect(args).toContain('--disable-gpu');
    expect(args).toContain('--hide-scrollbars');
    expect(args).toContain('--window-size=1280,2600');
    expect(args).toContain('--virtual-time-budget=4000');
    expect(args).toContain('--screenshot=out.png');
    expect(args).toContain('--user-data-dir=tmp-profile');
    // 網址是最後一個參數；
    expect(args[args.length - 1]).toBe('file:///x.html');
  });
});

// 第五組：索引頁；
describe('buildIndexHtml', () => {
  // 一組有兩邊、一組只有 before；
  const html = buildIndexHtml([
    { path: 'a/一.html', before: 'before/01-a-一.png', after: 'after/01-a-一.png' },
    { path: 'b/<x>.html', before: 'before/02-b-x.png' },
  ]);

  // 並排的兩張圖使用相對路徑；
  it('以相對路徑並排 before 與 after 圖片', () => {
    // 圖片標籤；中文檔名要被編碼；
    expect(html).toContain(`src="before/01-a-${encodeURIComponent('一')}.png"`);
    expect(html).toContain(`src="after/01-a-${encodeURIComponent('一')}.png"`);
    // 沒有絕對路徑或 file 協定；
    expect(html).not.toMatch(/src="(?:file:|[A-Za-z]:|\/)/);
  });

  // 說明文字是檔案路徑且已跳脫；
  it('以檔案路徑當說明並跳脫 HTML', () => {
    // 正常路徑；
    expect(html).toContain('a/一.html');
    // 角括號被跳脫；
    expect(html).toContain('b/&lt;x&gt;.html');
    expect(html).not.toContain('<x>');
  });

  // 缺圖時顯示提示；
  it('缺少 after 圖片時顯示「尚無截圖」', () => {
    // 第二組沒有 after；
    expect(html).toContain('尚無截圖');
  });

  // 顏色規則：不寫 #fff，使用 CSS 變數；
  it('樣式使用 CSS 變數，不寫 #fff', () => {
    // 不含 #fff 與 #ffffff；
    expect(html).not.toMatch(/#fff(?:fff)?\b/i);
    // 有定義變數；
    expect(html).toContain('--card');
    // 有 oklch 顏色；
    expect(html).toContain('oklch(');
  });
});
