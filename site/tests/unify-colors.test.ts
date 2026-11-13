// 測試：把 html 筆記寫死的淺色表面色、深灰文字與淺灰邊線換成主題變數；
// 匯入 vitest 的測試函式；
import { describe, expect, it } from 'vitest';
// 匯入要測的函式；
import { unifyCssColors, unifyHtmlColors } from '../src/lib/unify-colors';

// 方便取結果文字；
const css = (input: string) => unifyCssColors(input).text;

describe('unifyCssColors：背景', () => {
  // 白與近白換成 --card；
  it('#fff、white、#fafbfc 換成 var(--card)', () => {
    expect(css('a{background:#fff}')).toBe('a{background:var(--card)}');
    expect(css('a{background:white}')).toBe('a{background:var(--card)}');
    expect(css('a{background:#fafbfc}')).toBe('a{background:var(--card)}');
  });
  // 淡灰、淡藍灰換成 --soft；
  it('#f3f0f8 這類淡色換成 var(--soft)', () => {
    expect(css('a{background-color:#f1f3f6}')).toBe('a{background-color:var(--soft)}');
  });
  // 螢光筆色有彩度，不能動；
  it('螢光筆色（黃、藍、粉）的顏色不換，但補上固定深字', () => {
    expect(css('mark{background:#fff3a3}')).toBe('mark{background:#fff3a3;color:oklch(0.22 0.03 260)}');
    expect(css('mark{background:#adccff}')).toBe('mark{background:#adccff;color:oklch(0.22 0.03 260)}');
  });
  // 半透明、深色底、漸層不換；
  it('半透明、深色底、漸層不換', () => {
    expect(css('a{background:rgba(255,255,255,.3)}')).toBe('a{background:rgba(255,255,255,.3)}');
    expect(css('a{background:#0b0e1c}')).toBe('a{background:#0b0e1c;color:oklch(0.96 0.01 258)}');
    expect(css('a{background:linear-gradient(#fff,#eee)}')).toBe('a{background:linear-gradient(#fff,#eee)}');
  });
  // !important 與前後格式保留；
  it('保留 !important 與空白', () => {
    expect(css('a { background: #fff !important; }')).toBe('a { background: var(--card) !important; }');
  });
});

describe('unifyCssColors：文字', () => {
  // 深灰換成 --ink、中灰換成 --sub；
  it('深灰換 --ink，中灰換 --sub', () => {
    expect(css('p{color:#222}')).toBe('p{color:var(--ink)}');
    expect(css('p{color:#4b5563}')).toBe('p{color:var(--sub)}');
  });
  // 有彩度的偏暗強調字：淺色模式不動，深色模式補一個同色相、明度 0.80 的覆寫；
  it('金、藍強調字補深色模式提亮覆寫，且冪等', () => {
    const once = css('b{color:#b07a00}');
    expect(once).toContain('b{color:#b07a00}');
    expect(once).toContain('@media (prefers-color-scheme: dark)');
    expect(once).toMatch(/color:oklch\(0\.80 0\.12\d? \d+\)/);
    expect(css(once)).toBe(once);
  });
  // 有彩度的強調字、白字、淺灰字不動；
  it('紅藍強調字、白字、淺灰字不換', () => {
    expect(css('p{color:#b03a4a}')).toContain('p{color:#b03a4a}');
    expect(css('p{color:#fff}')).toBe('p{color:#fff}');
    expect(css('p{color:#888}')).toBe('p{color:#888}');
  });
  // 同一條規則有螢光筆底色時，文字色是成對設計，不能換；
  it('同規則有實體背景時文字色不換', () => {
    expect(css('mark{background:#fff3a3;color:#222}')).toBe('mark{background:#fff3a3;color:#222}');
  });
  // 同一條規則的背景會被換成變數時，文字色一起換；
  it('背景被換成變數時文字色也換', () => {
    expect(css('a{background:#fff;color:#222}')).toBe('a{background:var(--card);color:var(--ink)}');
  });
});

describe('unifyCssColors：實體背景補文字色', () => {
  // 規則已經寫了文字色就不補；
  it('已有 color 不補', () => {
    expect(css('mark{background:#fff3a3;color:#222}')).toBe('mark{background:#fff3a3;color:#222}');
  });
  // 漸層與變數背景沒有單一明度，不補；
  it('漸層與 var() 背景不補', () => {
    expect(css('a{background:linear-gradient(#fff3a3,#adccff)}')).toBe('a{background:linear-gradient(#fff3a3,#adccff)}');
    expect(css('a{background:var(--hl-core)}')).toBe('a{background:var(--hl-core)}');
  });
  // 動畫關鍵影格不處理；
  it('keyframes 裡的影格不補', () => {
    expect(css('@keyframes k{50%{background:#fff3a3}}')).toBe('@keyframes k{50%{background:#fff3a3}}');
  });
  // 補完再跑一次不再變；
  it('冪等', () => {
    const once = css('mark{background:#fff3a3}');
    expect(css(once)).toBe(once);
  });
});

describe('unifyCssColors：螢光筆變數與半透明底', () => {
  // 底色是主題螢光筆變數，寫死的深字要跟著模式走；
  it('var(--hl-warn) 底的深字換成 --hl-warn-ink，其他 --hl-* 換成 --ink', () => {
    expect(css('mark.w{background:var(--hl-warn);color:#4a0a1c}')).toBe('mark.w{background:var(--hl-warn);color:var(--hl-warn-ink)}');
    expect(css('mark.c{background:var(--hl-core);color:#222}')).toBe('mark.c{background:var(--hl-core);color:var(--ink)}');
  });
  // 半透明螢光筆會透出頁面底色，文字用跟著模式走的 --ink；
  it('半透明底依混色後的對比挑文字色', () => {
    expect(css('mark{background:#ff5582a6}')).toBe('mark{background:#ff5582a6;color:oklch(0.22 0.03 260)}');
    // 先前版本補上的 var(--ink)，遇到半透明底改成對比較高的固定色；
    expect(css('mark{background:#ff5582a6;color:var(--ink)}')).toBe('mark{background:#ff5582a6;color:oklch(0.22 0.03 260)}');
    // 半透明的白（玻璃遮罩）不是螢光筆，不補文字色；
    expect(css('a{background:rgba(255,255,255,.3)}')).toBe('a{background:rgba(255,255,255,.3)}');
    // rgba() 內的逗號不算複合背景，近白的 rgba 會換成 --card；
    expect(css('a{background:rgba(247,248,250,.92)}')).toBe('a{background:var(--card)}');
    // 幾乎純灰的淡底（#e8e7e5）也算表面色；
    expect(css('a{background:#e8e7e5}')).toBe('a{background:var(--soft)}');
  });
});

describe('unifyCssColors：頁面自己定義的字面螢光筆色', () => {
  // --hl-y 是頁面寫死的黃色，.hy 沒有文字色，深色模式會繼承淺字；要補固定深字；
  it('var(--hl-y) 且 --hl-y 是字面色：補固定深字', () => {
    expect(css(':root{--hl-y:#FFF3A3}.hy{background:var(--hl-y)}')).toBe(':root{--hl-y:#FFF3A3}.hy{background:var(--hl-y);color:oklch(0.22 0.03 260)}');
  });
  // 先前補的 var(--ink) 也改成固定深字；
  it('已寫 color:var(--ink) 改成固定深字', () => {
    expect(css(':root{--hl-r:#FF5582}.hr{background:var(--hl-r);color:var(--ink)}')).toBe(':root{--hl-r:#FF5582}.hr{background:var(--hl-r);color:oklch(0.22 0.03 260)}');
  });
  // 主題內建的 --hl-warn 沒有在頁面定義字面色，維持原本行為；
  it('沒有頁面字面定義的 --hl-* 不變', () => {
    expect(css('mark.w{background:var(--hl-warn);color:#4a0a1c}')).toBe('mark.w{background:var(--hl-warn);color:var(--hl-warn-ink)}');
  });
});

describe('unifyCssColors：強調色底的白字', () => {
  // 深色模式 --accent 變淺藍，白字看不見；
  it('background:var(--accent) 配白字換成 var(--on-accent)', () => {
    expect(css('.on{background:var(--accent);color:#fff}')).toBe('.on{background:var(--accent);color:var(--on-accent)}');
    expect(css('.p{color:white;background:var(--link)}')).toBe('.p{color:var(--on-accent);background:var(--link)}');
  });
  // 其他底色的白字不動；
  it('非強調色底的白字不動', () => {
    expect(css('.x{background:#123456;color:#fff}')).toBe('.x{background:#123456;color:#fff}');
  });
});

describe('unifyCssColors：邊線與自訂屬性', () => {
  // 淺灰邊線換成 --line，其他 token 保留；
  it('border 簡寫只換顏色 token', () => {
    expect(css('a{border:1px solid #e5e7eb}')).toBe('a{border:1px solid var(--line)}');
    expect(css('a{border-bottom:2px solid #b03a4a}')).toBe('a{border-bottom:2px solid #b03a4a}');
  });
  // 自訂屬性依名稱猜用途；
  it('--bg 換成變數，--code-bg 深色不換，用途不明不換', () => {
    expect(css(':root{--panel:#fff}')).toBe(':root{--panel:var(--card)}');
    // 換出來是自己（循環）時，直接刪掉宣告，讓共用主題的 --ink 生效；
    expect(css(':root{--ink:#111;--x:1}')).toBe(':root{--x:1}');
    expect(css(':root{--code-bg:#1e1e1e}')).toBe(':root{--code-bg:#1e1e1e}');
    expect(css(':root{--gap:#fff}')).toBe(':root{--gap:#fff}');
    // 名稱含 soft 的文字色（--text-soft、--sub-text）是文字不是底色；
    expect(css(':root{--text-soft:#6b6b6b}')).toBe(':root{--text-soft:var(--sub)}');
    // 次要文字與邊線變數：--muted 換成 --sub，--rule 換成 --line；
    expect(css(':root{--muted:#6b7280}')).toBe(':root{--muted:var(--sub)}');
    expect(css(':root{--rule:#e5e7eb}')).toBe(':root{--rule:var(--line)}');
  });
});

describe('unifyHtmlColors', () => {
  // style 區塊與行內 style 都處理，其餘原樣；
  it('處理 <style> 與 style 屬性，其餘位元組不動', () => {
    const html = '<html><style>a{background:#fff}</style><body><div style="background:#fff;color:#222">x</div></body></html>';
    const out = unifyHtmlColors(html);
    expect(out.text).toBe('<html><style>a{background:var(--card)}</style><body><div style="background:var(--card);color:var(--ink)">x</div></body></html>');
    expect(out.changes).toBe(3);
  });
  // 冪等：跑第二次沒有任何變化；
  it('跑第二次不再變動', () => {
    const once = unifyHtmlColors('<style>a{background:#fff;color:#222}</style>').text;
    expect(unifyHtmlColors(once).changes).toBe(0);
    expect(unifyHtmlColors(once).text).toBe(once);
  });
  // 壞掉的 CSS 不處理也不丟錯；
  it('壞 CSS 原樣回傳', () => {
    const bad = '<style>a{background:</style>';
    expect(unifyHtmlColors(bad).text).toBe(bad);
  });
});
