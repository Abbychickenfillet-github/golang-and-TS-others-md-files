// 從 vitest 匯入測試骨架：describe 分組、it 定義單一案例、expect 斷言、beforeEach／afterEach 是每個案例前後的鉤子、vi 是模擬工具；
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// 匯入 Node 內建的同步讀檔函式 readFileSync，腳本很小，同步讀取最單純；
import { readFileSync } from 'node:fs';
// 匯入 resolve，把多段路徑合成一條絕對路徑；
import { resolve } from 'node:path';

// vitest 從 site/ 執行，jsdom 環境下 import.meta.url 不是 file 網址，所以改用 process.cwd() 加相對路徑定位共用腳本；
const scriptPath = resolve(process.cwd(), '../assets/note-mask.js');
// 把腳本當純文字讀進來（還沒執行），檔案不存在時這行會丟錯，測試就會失敗（TDD 的紅燈）；
const scriptSource: string = readFileSync(scriptPath, 'utf8');

// 用 type 別名描述「addEventListener 被呼叫時收到的三個參數」，之後才能在測試結束時一一 removeEventListener；
type ListenerRecord = [string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | null];
// 這個陣列記下腳本在 document 上掛過的所有監聽器；
let added: ListenerRecord[] = [];

// 工具函式：把腳本原始碼丟進 jsdom 視窗執行一次，`window.eval` 在視窗的全域範圍執行字串，等於瀏覽器載入了 <script>；
function loadScript(): void {
  // 呼叫 window.eval，腳本裡的 window、document 會指到 jsdom 提供的物件；
  window.eval(scriptSource);
}

// 工具函式：用 innerHTML 換掉整個 body，每個案例都從乾淨的 DOM 開始；
function setBody(html: string): void {
  // innerHTML 賦值會把字串解析成 DOM 節點；
  document.body.innerHTML = html;
}

// 工具函式：回傳頁面上所有螢光筆 mark，`querySelectorAll` 回傳 NodeList，用展開運算子 `[...]` 轉成真正的陣列；
function marks(): HTMLElement[] {
  // 泛型 `<HTMLElement>` 告訴 TypeScript 每個元素的型別；
  return [...document.querySelectorAll<HTMLElement>('mark.hl')];
}

// 工具函式：回傳每個 mark 是否有 masked 類別，方便一次斷言整排；
function maskedStates(): boolean[] {
  // map 把每個 mark 轉成布林值；
  return marks().map((m) => m.classList.contains('masked'));
}

// 工具函式：用選擇器取元素，取不到就丟錯，讓測試失敗並指出是哪個選擇器；
function must(selector: string): HTMLElement {
  // 泛型 `<HTMLElement>` 指定回傳型別；
  const el = document.querySelector<HTMLElement>(selector);
  // 取不到時用 throw 丟出錯誤；
  if (!el) throw new Error(`找不到元素：${selector}`);
  // 取得到就回傳；
  return el;
}

// 新結構的頁面：與 Task 4 的 QuizHeader 輸出相同，按鈕靠 data-note-action 辨識；
const NEW_HTML = `
  <div class="quiz">
    <div class="quiz-head">
      <h2 id="quiz-title">自我測驗</h2>
      <div class="quiz-actions">
        <button type="button" data-note-action="mask-all" aria-label="全部遮起來">🙈</button>
        <button type="button" data-note-action="show-all" aria-label="全部顯示">👀</button>
      </div>
    </div>
    <p><mark class="hl">甲</mark><mark class="hl masked">乙</mark><mark class="hl"><b>丙</b></mark></p>
  </div>`;

// 舊結構的頁面：按鈕用 id、文字很長、放在 .toolbar，並有 .quiz 與它的第一個 h2；
const LEGACY_HTML = `
  <div class="toolbar">
    <button id="maskAll">🙈 全部遮起來（自己考自己）</button>
    <button id="showAll">👀 全部顯示</button>
  </div>
  <div class="quiz">
    <h2 id="quiz-title">自我測驗</h2>
    <p><mark class="hl">甲</mark><mark class="hl">乙</mark></p>
    <h2 id="second">第二個標題</h2>
  </div>`;

// 舊結構但沒有 .quiz：按鈕只該轉成 icon，不搬位置；
const LEGACY_NO_QUIZ_HTML = `
  <div class="toolbar">
    <button id="maskAll">🙈 全部遮起來（自己考自己）</button>
    <button id="showAll">👀 全部顯示</button>
  </div>
  <p><mark class="hl">甲</mark><mark class="hl">乙</mark></p>`;

// beforeEach：每個案例開始前跑一次；
beforeEach(() => {
  // 清掉上一個案例留下的初始化旗標，Reflect.deleteProperty 是刪除物件屬性的函式版寫法；
  Reflect.deleteProperty(window, '__noteMaskInit');
  // 清空紀錄陣列；
  added = [];
  // 取得真正的 addEventListener 並綁定 document，之後模擬版才能轉呼叫它；
  const realAdd = document.addEventListener.bind(document);
  // vi.spyOn 把 document.addEventListener 換成會記錄呼叫的版本；
  vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
    // 把這次掛上的監聽器記下來，options 缺省時記成 null；
    added.push([type, listener, options ?? null]);
    // 轉呼叫真正的 addEventListener，讓監聽器照常生效；
    realAdd(type, listener, options);
  });
});

// afterEach：每個案例結束後跑一次；
afterEach(() => {
  // 把本案例掛在 document 上的監聽器全部拔掉，否則 document 是整個檔案共用的，會讓後面的案例被重複觸發；
  for (const [type, listener, options] of added) {
    // 用原型上的 removeEventListener 拔除，參數要與當初掛上時一致才拔得掉；
    EventTarget.prototype.removeEventListener.call(document, type, listener, options ?? undefined);
  }
  // 還原被 spyOn 換掉的函式；
  vi.restoreAllMocks();
  // 清掉 DOM 與旗標；
  document.body.innerHTML = '';
  // 再刪一次旗標，避免殘留；
  Reflect.deleteProperty(window, '__noteMaskInit');
});

// 第一組：新結構；
describe('note-mask.js：新結構（data-note-action）', () => {
  // 案例：全部遮起來；
  it('點 mask-all 讓所有 mark.hl 都加上 masked', () => {
    // 放入新結構頁面；
    setBody(NEW_HTML);
    // 載入腳本；
    loadScript();
    // 點「全部遮起來」按鈕；
    must('[data-note-action="mask-all"]').click();
    // 三個 mark 都應該是遮住的；
    expect(maskedStates()).toEqual([true, true, true]);
  });

  // 案例：全部顯示；
  it('點 show-all 讓所有 mark.hl 都移除 masked', () => {
    // 放入新結構頁面（其中第二個 mark 一開始就是 masked）；
    setBody(NEW_HTML);
    // 載入腳本；
    loadScript();
    // 點「全部顯示」按鈕；
    must('[data-note-action="show-all"]').click();
    // 三個 mark 都不該有 masked；
    expect(maskedStates()).toEqual([false, false, false]);
  });

  // 案例：單點切換；
  it('點單一 mark.hl 只切換它自己的 masked', () => {
    // 放入新結構頁面；
    setBody(NEW_HTML);
    // 載入腳本；
    loadScript();
    // 取第一個 mark；
    const first = marks()[0];
    // 點一下，應該變成遮住，其他兩個維持原狀；
    first.click();
    // 斷言整排狀態；
    expect(maskedStates()).toEqual([true, true, false]);
    // 再點一下，應該恢復顯示；
    first.click();
    // 斷言整排狀態；
    expect(maskedStates()).toEqual([false, true, false]);
  });

  // 案例：點到 mark 裡面的子元素；
  it('點 mark.hl 內層的子元素也會切換外層 mark', () => {
    // 放入新結構頁面，第三個 mark 內有 <b>；
    setBody(NEW_HTML);
    // 載入腳本；
    loadScript();
    // 取第三個 mark 裡的 b 元素並點它；
    must('mark.hl b').click();
    // 外層 mark（第三個）應被切換；
    expect(maskedStates()).toEqual([false, true, true]);
  });

  // 案例：事件委派；
  it('腳本載入後才新增的 mark 也能被點擊切換（事件委派）', () => {
    // 放入新結構頁面；
    setBody(NEW_HTML);
    // 載入腳本；
    loadScript();
    // 動態建立一個新的 mark；
    const late = document.createElement('mark');
    // 設定類別為 hl；
    late.className = 'hl';
    // 加進頁面；
    must('p').appendChild(late);
    // 點它；
    late.click();
    // 它應該被遮住；
    expect(late.classList.contains('masked')).toBe(true);
  });

  // 案例：鍵盤操作；
  it('mark.hl 按 Enter 或空白鍵會切換，其他鍵不會', () => {
    // 放入新結構頁面；
    setBody(NEW_HTML);
    // 載入腳本；
    loadScript();
    // 取第一個 mark；
    const first = marks()[0];
    // 工具：在 mark 上送出一個 keydown 事件，bubbles 讓事件能冒泡到 document；
    const press = (key: string) =>
      first.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    // 按 Enter；
    press('Enter');
    // 應該被遮住；
    expect(first.classList.contains('masked')).toBe(true);
    // 按空白鍵（key 的值是一個空白字元）；
    press(' ');
    // 應該恢復；
    expect(first.classList.contains('masked')).toBe(false);
    // 按 a 鍵；
    press('a');
    // 不該有變化；
    expect(first.classList.contains('masked')).toBe(false);
  });
});

// 第二組：舊結構；
describe('note-mask.js：舊結構（#maskAll／#showAll）', () => {
  // 案例：按鈕內容轉成 icon；
  it('載入後按鈕文字只剩 🙈／👀，原文字移到 aria-label，並補上 type 與 data-note-action', () => {
    // 放入舊結構頁面；
    setBody(LEGACY_HTML);
    // 載入腳本；
    loadScript();
    // 取兩顆按鈕；
    const maskBtn = must('#maskAll');
    // 第二顆；
    const showBtn = must('#showAll');
    // 文字內容要剛好是 emoji；
    expect(maskBtn.textContent).toBe('🙈');
    // 第二顆也是；
    expect(showBtn.textContent).toBe('👀');
    // aria-label 要等於原本的整段文字；
    expect(maskBtn.getAttribute('aria-label')).toBe('🙈 全部遮起來（自己考自己）');
    // 第二顆；
    expect(showBtn.getAttribute('aria-label')).toBe('👀 全部顯示');
    // type 設成 button；
    expect(maskBtn.getAttribute('type')).toBe('button');
    // 第二顆；
    expect(showBtn.getAttribute('type')).toBe('button');
    // data-note-action 對應動作；
    expect(maskBtn.getAttribute('data-note-action')).toBe('mask-all');
    // 第二顆；
    expect(showBtn.getAttribute('data-note-action')).toBe('show-all');
  });

  // 案例：搬進 quiz-head；
  it('有 .quiz 時，按鈕被搬進包住第一個 h2 的 .quiz-head > .quiz-actions，結構與 QuizHeader 相同', () => {
    // 放入舊結構頁面；
    setBody(LEGACY_HTML);
    // 載入腳本；
    loadScript();
    // 取 quiz；
    const quiz = must('.quiz');
    // quiz-head 應該是 quiz 的第一個子元素；
    const head = quiz.firstElementChild as HTMLElement;
    // 它的類別是 quiz-head；
    expect(head.className).toBe('quiz-head');
    // quiz-head 裡第一個子元素是原本的 h2，id 保留；
    expect(head.children[0].tagName).toBe('H2');
    // id 沒有遺失；
    expect(head.children[0].id).toBe('quiz-title');
    // 第二個子元素是 quiz-actions；
    expect(head.children[1].className).toBe('quiz-actions');
    // quiz-actions 裡依序是遮起來、顯示兩顆按鈕；
    expect([...head.children[1].children].map((b) => b.id)).toEqual(['maskAll', 'showAll']);
    // quiz-head 只有這兩個子元素；
    expect(head.children.length).toBe(2);
    // 第二個 h2 不受影響，仍直接在 quiz 底下；
    expect(must('#second').parentElement).toBe(quiz);
    // 原本的 .toolbar 裡不再有這兩顆按鈕；
    expect(must('.toolbar').querySelector('button')).toBeNull();
  });

  // 案例：沒有 quiz；
  it('沒有 .quiz 時按鈕留在原處，但仍轉成 icon', () => {
    // 放入沒有 quiz 的舊頁；
    setBody(LEGACY_NO_QUIZ_HTML);
    // 載入腳本；
    loadScript();
    // 沒有 quiz-head 被建立；
    expect(document.querySelector('.quiz-head')).toBeNull();
    // 按鈕仍在 .toolbar 裡；
    expect(must('.toolbar').querySelectorAll('button').length).toBe(2);
    // 文字已是 emoji；
    expect(must('#maskAll').textContent).toBe('🙈');
    // 第二顆；
    expect(must('#showAll').textContent).toBe('👀');
    // aria-label 保留原文字；
    expect(must('#maskAll').getAttribute('aria-label')).toBe('🙈 全部遮起來（自己考自己）');
  });

  // 案例：只有單顆 #maskAll 的單鍵開關舊頁；
  it('只有 #maskAll 沒有 #showAll 時不轉換也不搬動（單鍵開關頁維持原樣）', () => {
    // 放入只有一顆按鈕的舊頁，按鈕文字是會被行內處理器改寫的那種；
    setBody(`<div class="toolbar"><button id="maskAll">🙈 隱藏全部重點</button></div>
      <div class="quiz"><h2>標題</h2><p><mark class="hl">甲</mark></p></div>`);
    // 載入腳本；
    loadScript();
    // 文字沒被改成純 emoji 以外的結果（維持原文）；
    expect(must('#maskAll').textContent).toBe('🙈 隱藏全部重點');
    // 沒有被加上 data-note-action，所以不會被事件委派處理；
    expect(must('#maskAll').hasAttribute('data-note-action')).toBe(false);
    // 也沒有建立 quiz-head；
    expect(document.querySelector('.quiz-head')).toBeNull();
  });

  // 案例：舊結構的功能；
  it('舊結構的按鈕與單點切換都能運作', () => {
    // 放入舊結構頁面；
    setBody(LEGACY_HTML);
    // 載入腳本；
    loadScript();
    // 點 #maskAll；
    must('#maskAll').click();
    // 全部遮住；
    expect(maskedStates()).toEqual([true, true]);
    // 點 #showAll；
    must('#showAll').click();
    // 全部顯示；
    expect(maskedStates()).toEqual([false, false]);
    // 單點第二個 mark；
    marks()[1].click();
    // 只有它被遮住；
    expect(maskedStates()).toEqual([false, true]);
  });
});

// 第三組：重複載入與既有行內處理器；
describe('note-mask.js：只初始化一次', () => {
  // 案例：重複載入；
  it('腳本載入兩次只初始化一次：旗標為 true、第二次不再掛監聽器、單點只切換一次', () => {
    // 放入舊結構頁面，同時驗證轉換也不會重複；
    setBody(LEGACY_HTML);
    // 第一次載入；
    loadScript();
    // 旗標被設成 true；
    expect(Reflect.get(window, '__noteMaskInit')).toBe(true);
    // 記下第一次載入後掛了幾個監聽器；
    const afterFirst = added.length;
    // 至少要掛了監聽器，不然上面的比較沒有意義；
    expect(afterFirst).toBeGreaterThan(0);
    // 第二次載入（模擬同一頁引入兩次）；
    loadScript();
    // 監聽器數量不變，代表第二次直接被旗標擋掉；
    expect(added.length).toBe(afterFirst);
    // 單點第一個 mark，只能切換一次（若掛了兩份監聽器就會切回原狀）；
    marks()[0].click();
    // 應該是被遮住；
    expect(maskedStates()).toEqual([true, false]);
    // aria-label 沒有被第二次轉換改成 emoji；
    expect(must('#maskAll').getAttribute('aria-label')).toBe('🙈 全部遮起來（自己考自己）');
  });

  // 案例：舊頁還留著行內處理器（控制者裁示 R5）；
  it('mark 上已有行內處理器切換過時，腳本不再重複切換（一次點擊只切一次）', () => {
    // 放入舊結構頁面；
    setBody(LEGACY_HTML);
    // 模擬舊頁行內腳本：先在每個 mark 上掛自己的 click 切換處理器；
    marks().forEach((m) => m.addEventListener('click', () => m.classList.toggle('masked')));
    // 載入共用腳本；
    loadScript();
    // 點第一個 mark；
    marks()[0].click();
    // 行內處理器切了一次，腳本不該再切回去，所以結果是遮住；
    expect(maskedStates()).toEqual([true, false]);
    // 再點一次；
    marks()[0].click();
    // 應該恢復顯示；
    expect(maskedStates()).toEqual([false, false]);
  });
});
