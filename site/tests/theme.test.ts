// @vitest-environment node
// 上一行是 vitest 的檔案層級指令註解：這個檔案改用 node 環境，因為 jsdom 環境下 import.meta.url 不是 file 網址，無法定位樣式檔；
// 從 vitest 匯入測試骨架：describe 分組、it 定義單一案例、expect 斷言；
import { describe, expect, it } from 'vitest';
// 匯入 Node 內建的同步讀檔函式 readFileSync，樣式檔很小，同步讀取最單純；
import { readFileSync } from 'node:fs';
// 匯入 fileURLToPath，把 `file:///` 網址轉成作業系統的檔案路徑字串；
import { fileURLToPath } from 'node:url';
// 匯入 postcss 的預設匯出，用它的 parse 把 CSS 文字解析成語法樹（AST）；
import postcss from 'postcss';
// 匯入 culori 的 parse（解析任何 CSS 色彩字串）與 wcagContrast（算 WCAG 對比度）；
import { parse as parseColor, wcagContrast } from 'culori';
// 型別匯入：只在編譯時用到 postcss 的 Rule、AtRule、Root 型別，`import type` 會在輸出時被整行刪掉；
import type { AtRule, Root, Rule } from 'postcss';

// `new URL(相對路徑, import.meta.url)` 以「本測試檔」的位置為基準算出主題樣式檔的網址，再轉成檔案路徑；
const cssPath = fileURLToPath(new URL('../../assets/note-theme.css', import.meta.url));
// 用 utf8 讀出整份樣式文字；檔案不存在時這行會丟錯，測試就會失敗（TDD 的紅燈）；
const css: string = readFileSync(cssPath, 'utf8');
// 把樣式文字解析成語法樹，後面所有斷言都在這棵樹上查詢；
const root: Root = postcss.parse(css);

// 工具函式：把規則的選擇器字串（可能是逗號分隔的清單）拆成一個個去掉空白的選擇器；
function selectorsOf(rule: Rule): string[] {
  // rule.selectors 是 postcss 已經依逗號拆好的陣列，再用 map 與 trim 去掉前後空白；
  return rule.selectors.map((s) => s.trim());
}

// 工具函式：找出所有「選擇器清單中含有指定選擇器」的規則（不論巢狀在 @media 裡或在最外層）；
function rulesWith(selector: string): Rule[] {
  // 準備一個空陣列收集結果；
  const found: Rule[] = [];
  // walkRules 會走訪整棵樹的每一條規則；
  root.walkRules((rule) => {
    // 只要這條規則的選擇器清單包含目標選擇器，就收進結果；
    if (selectorsOf(rule).includes(selector)) found.push(rule);
  });
  // 回傳收集到的規則；
  return found;
}

// 工具函式：取出一條規則裡指定屬性的值，找不到就回傳 undefined；
function declValue(rule: Rule, prop: string): string | undefined {
  // 準備變數存結果，`let` 因為在 walkDecls 的回呼裡會被重新賦值；
  let value: string | undefined;
  // walkDecls 走訪這條規則裡的每個宣告；
  rule.walkDecls(prop, (decl) => {
    // 屬性名稱相符就記下值（若有多筆以最後一筆為準，與瀏覽器的層疊規則一致）；
    value = decl.value;
  });
  // 回傳最後記下的值；
  return value;
}

// 工具函式：判斷「某選擇器的任一規則」是否宣告了指定屬性且值等於預期；
function someRuleHas(selector: string, prop: string, expected: string): boolean {
  // some 只要有一條規則通過就回傳 true；
  return rulesWith(selector).some((rule) => declValue(rule, prop) === expected);
}

// 工具函式：讀出一組 `:root` 變數，light 取最外層的 :root，dark 取 prefers-color-scheme: dark 裡的 :root；
function rootVars(mode: 'light' | 'dark'): Record<string, string> {
  // 用物件收集「變數名 → 值」；
  const vars: Record<string, string> = {};
  // 走訪所有 :root 規則；
  root.walkRules(':root', (rule) => {
    // 判斷這條規則的父節點是不是 @media 且條件含 prefers-color-scheme: dark；
    const parent = rule.parent as Root | AtRule | undefined;
    // 父節點是 at-rule 且名稱為 media、參數含 dark 才算深色組；
    const inDark = parent?.type === 'atrule' && parent.name === 'media' && /prefers-color-scheme:\s*dark/.test(parent.params);
    // 父節點是最外層 root 才算淺色組；
    const inLight = parent?.type === 'root';
    // 這條規則不屬於要找的模式就略過；
    if ((mode === 'dark' && !inDark) || (mode === 'light' && !inLight)) return;
    // 走訪規則內以 `--` 開頭的自訂屬性宣告；
    rule.walkDecls(/^--/, (decl) => {
      // 記下變數名與值；
      vars[decl.prop] = decl.value;
    });
  });
  // 回傳整組變數；
  return vars;
}

// 第一組：字距變數，每個只宣告一次且值與設計文件逐字相同；
describe('note-theme.css 字距', () => {
  // 設計文件規定的四個字距值，用 Object.entries 迴圈各產生一個案例；
  const spacing: Record<string, string> = {
    // 內文字距；
    '--ls-body': '0.2rem',
    // 標籤（pills）與 hashtag 字距；
    '--ls-pill': '0.25rem',
    // 等寬字（code、pre、.align-demo）字距；
    '--ls-mono': '0.1rem',
    // 圖例（.legend span）字距；
    '--ls-legend': '1.18em',
  };
  // 逐一產生案例；
  for (const [prop, value] of Object.entries(spacing)) {
    // 案例：該變數在整份檔案只宣告一次，值逐字相符；
    it(`${prop} 只宣告一次，值為 ${value}`, () => {
      // 收集整份檔案中同名的宣告；
      const decls: string[] = [];
      // walkDecls 傳字串時比對屬性名稱完全相同；
      root.walkDecls(prop, (decl) => {
        // 用大括號包住，回呼才不會回傳 push 的數字（walk 回呼回傳 false 會中止走訪，型別也不接受數字）；
        decls.push(decl.value);
      });
      // 斷言只有一筆且值相符；
      expect(decls).toEqual([value]);
    });
  }

  // 案例：body 的 letter-spacing 用內文變數；
  it('body 使用 var(--ls-body)', () => {
    // 斷言有一條 body 規則設了 letter-spacing: var(--ls-body)；
    expect(someRuleHas('body', 'letter-spacing', 'var(--ls-body)')).toBe(true);
  });

  // 案例：.pills 與 .pill 都用標籤字距；
  it('.pills 與 .pill 使用 var(--ls-pill)', () => {
    // .pills 容器；
    expect(someRuleHas('.pills', 'letter-spacing', 'var(--ls-pill)')).toBe(true);
    // .pill 單顆標籤；
    expect(someRuleHas('.pill', 'letter-spacing', 'var(--ls-pill)')).toBe(true);
  });

  // 案例：等寬字區域都用 0.1rem 變數；
  it('code、pre、.align-demo 使用 var(--ls-mono)', () => {
    // 對三個選擇器各自斷言；
    for (const sel of ['code', 'pre', '.align-demo']) {
      // 每個選擇器至少有一條規則設了等寬字距；
      expect(someRuleHas(sel, 'letter-spacing', 'var(--ls-mono)'), sel).toBe(true);
    }
  });

  // 案例：圖例色塊用 1.18em 變數；
  it('.legend span 使用 var(--ls-legend)', () => {
    // 斷言有一條 `.legend span` 規則設了 letter-spacing: var(--ls-legend)；
    expect(someRuleHas('.legend span', 'letter-spacing', 'var(--ls-legend)')).toBe(true);
  });
});

// 第二組：顏色規則；
describe('note-theme.css 顏色', () => {
  // 案例：樣式檔自己宣告全部變數，不 @import 別的檔，這樣測試與離線開啟都只需要這一個檔；
  it('不使用 @import', () => {
    // 走訪所有 at-rule，收集名稱為 import 的；
    const imports: string[] = [];
    // walkAtRules 只走訪 @ 開頭的規則；
    root.walkAtRules('import', (rule) => {
      // 用大括號包住，避免回呼回傳 push 的數字；
      imports.push(rule.params);
    });
    // 斷言沒有任何 @import；
    expect(imports).toEqual([]);
  });

  // 案例：.card 規則內不得硬寫白色；
  it('.card 規則內沒有 #fff 或 #ffffff', () => {
    // 對每一條含 .card 的規則檢查；
    for (const rule of rulesWith('.card')) {
      // 用規則的完整文字比對；正規式 \b 之後不接十六進位字元，避免誤判 #fff1f3 之類的色碼；
      expect(rule.toString()).not.toMatch(/#f{3}(?![0-9a-f])|#f{6}(?![0-9a-f])/i);
    }
  });

  // 兩組模式各產生一個對比度案例；
  for (const mode of ['light', 'dark'] as const) {
    // 案例：背景與卡片的 WCAG 對比度至少 2:1（暫定門檻）；
    it(`${mode} 模式 --bg 與 --card 對比度至少 2:1`, () => {
      // 讀出該模式的變數；
      const vars = rootVars(mode);
      // 兩個變數都必須存在；
      expect(vars['--bg'], '--bg').toBeDefined();
      // 卡片底色也必須存在；
      expect(vars['--card'], '--card').toBeDefined();
      // 用 culori 解析色彩字串（支援 hex 與 oklch）；
      const bg = parseColor(vars['--bg']);
      // 解析卡片色；
      const card = parseColor(vars['--card']);
      // 解析失敗代表色彩字串寫錯，直接讓測試失敗；
      expect(bg, '--bg 可解析').toBeDefined();
      // 同上；
      expect(card, '--card 可解析').toBeDefined();
      // 算 WCAG 對比度並斷言至少 2；
      expect(wcagContrast(bg!, card!)).toBeGreaterThanOrEqual(2);
    });
  }

  // 案例：六種螢光筆是通用類別選擇器，mark 與 span 都吃得到（controller 裁定 R1）；
  it('六個 .hl-* 通用類別與遮罩狀態都存在', () => {
    // 六個語意名稱；
    for (const name of ['core', 'warn', 'ok', 'term', 'data', 'note']) {
      // 通用選擇器（沒有 mark 前綴）至少有一條規則；
      expect(rulesWith(`.hl-${name}`).length, `.hl-${name}`).toBeGreaterThan(0);
    }
    // 遮罩狀態沿用 mark.hl.masked；
    expect(rulesWith('mark.hl.masked').length).toBeGreaterThan(0);
  });
});

// 第三組：捲動吸附只能出現在 .snap-deck；
describe('note-theme.css 捲動吸附', () => {
  // 案例：.snap-deck 有 y mandatory；
  it('.snap-deck 含 scroll-snap-type: y mandatory', () => {
    // 斷言至少一條 .snap-deck 規則設了這個值；
    expect(someRuleHas('.snap-deck', 'scroll-snap-type', 'y mandatory')).toBe(true);
  });

  // 案例：.snap-deck 的子元素對齊到起點；
  it('.snap-deck 的子元素設 scroll-snap-align: start', () => {
    // 子元素選擇器 `.snap-deck > *`；
    expect(someRuleHas('.snap-deck > *', 'scroll-snap-align', 'start')).toBe(true);
  });

  // 案例：body 與 .content 不可有捲動吸附，否則整頁會被卡住；
  it('body 與 .content 沒有 scroll-snap-type', () => {
    // 對兩個選擇器各自檢查；
    for (const sel of ['body', '.content']) {
      // 該選擇器的每條規則都不能有 scroll-snap-type；
      for (const rule of rulesWith(sel)) {
        // 取值應為 undefined；
        expect(declValue(rule, 'scroll-snap-type'), sel).toBeUndefined();
      }
    }
  });
});

// 第四組：測驗標題列（Task 4 完成）；
describe('note-theme.css 測驗列', () => {
  // 案例：.quiz-head 是 flex，.quiz-actions 存在；
  it('.quiz-head 為 flex，.quiz-actions 存在', () => {
    // .quiz-head 的 display 應為 flex；
    expect(someRuleHas('.quiz-head', 'display', 'flex')).toBe(true);
    // .quiz-actions 至少有一條規則；
    expect(rulesWith('.quiz-actions').length).toBeGreaterThan(0);
  });

  // 案例：兩端對齊，標題在左、按鈕在右；
  it('.quiz-head 兩端對齊且垂直置中', () => {
    // space-between 把第一個子元素推到最左、最後一個推到最右；
    expect(someRuleHas('.quiz-head', 'justify-content', 'space-between')).toBe(true);
    // align-items:center 讓標題與按鈕在垂直方向置中；
    expect(someRuleHas('.quiz-head', 'align-items', 'center')).toBe(true);
  });

  // 案例：寬度不足時折行，而不是橫向溢出；
  it('.quiz-head 設 flex-wrap: wrap 且有 gap', () => {
    // wrap 讓空間不夠時子元素換到下一行；
    expect(someRuleHas('.quiz-head', 'flex-wrap', 'wrap')).toBe(true);
    // 折行後兩行之間仍要有間距，所以 gap 必須存在；
    expect(rulesWith('.quiz-head').some((rule) => declValue(rule, 'gap') !== undefined)).toBe(true);
  });

  // 案例：.quiz-actions 排在列的最後端（靠右），折行後仍貼右；
  it('.quiz-actions 靠右：margin-left: auto', () => {
    // margin-left:auto 會吃掉左側剩餘空間，把自己推到最右邊；
    expect(someRuleHas('.quiz-actions', 'margin-left', 'auto')).toBe(true);
  });

  // 案例：標題允許縮小，長標題不會把整列撐出視窗；
  it('.quiz-head h2 設 min-width: 0', () => {
    // flex 子項預設 min-width:auto，長字串不縮；改成 0 才能在窄螢幕縮小或折行；
    expect(someRuleHas('.quiz-head h2', 'min-width', '0')).toBe(true);
  });

  // 案例：icon 按鈕要有足夠的觸控尺寸，且字級放大到 emoji 清楚可辨；
  it('.quiz-actions button 觸控尺寸至少 44px 且 emoji 字級放大', () => {
    // 取所有 `.quiz-actions button` 規則；
    const rules = rulesWith('.quiz-actions button');
    // 至少要有一條；
    expect(rules.length).toBeGreaterThan(0);
    // 對寬與高各自斷言 44px（WCAG 2.5.5 建議的觸控目標最小值）；
    for (const prop of ['min-width', 'min-height']) {
      // 任何一條規則設了 44px 即可；
      expect(rules.some((rule) => declValue(rule, prop) === '44px'), prop).toBe(true);
    }
    // 字級要比一般按鈕的 .85rem 大；
    expect(rules.some((rule) => declValue(rule, 'font-size') === '1.25rem')).toBe(true);
  });

  // 案例：這個任務不動字距變數，按鈕規則裡也不得出現 letter-spacing 數值；
  it('.quiz-head 相關規則不自訂 letter-spacing', () => {
    // 逐一檢查四組選擇器；
    for (const sel of ['.quiz-head', '.quiz-head h2', '.quiz-actions', '.quiz-actions button']) {
      // 每條規則都不能有 letter-spacing，字距交給 body 繼承；
      for (const rule of rulesWith(sel)) {
        // 取值應為 undefined；
        expect(declValue(rule, 'letter-spacing'), sel).toBeUndefined();
      }
    }
  });
});

// 第五組：.sr-only（註腳區塊的隱藏標籤用它）；
describe('note-theme.css .sr-only', () => {
  // 案例：視覺上隱藏但仍留在無障礙樹裡，不能用 display:none 或 visibility:hidden（那會連螢幕閱讀器也讀不到）；
  it('.sr-only 用 clip 與 1px 寬高把文字藏在畫面外，而不是 display:none', () => {
    // 取所有 .sr-only 規則；
    const rules = rulesWith('.sr-only');
    // 至少要有一條；
    expect(rules.length).toBeGreaterThan(0);
    // 絕對定位讓它不佔版面；
    expect(rules.some((rule) => declValue(rule, 'position') === 'absolute')).toBe(true);
    // 寬高 1px；
    expect(rules.some((rule) => declValue(rule, 'width') === '1px' && declValue(rule, 'height') === '1px')).toBe(true);
    // 裁切成空；
    expect(rules.some((rule) => declValue(rule, 'clip') === 'rect(0,0,0,0)')).toBe(true);
    // 不可用 display:none；
    for (const rule of rules) expect(declValue(rule, 'display')).toBeUndefined();
  });
});
