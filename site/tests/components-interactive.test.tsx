// 從 vitest 匯入測試骨架：describe 分組、it 定義案例、expect 斷言、afterEach 是每個案例結束後的鉤子；
import { afterEach, describe, expect, it } from 'vitest';
// 從 Testing Library 匯入 render（把元件畫進 jsdom）、cleanup（清掉已畫的 DOM），用具名匯入 `{ }` 只取需要的；
import { cleanup, render } from '@testing-library/react';
// 匯入五個待測元件，用相對路徑指向 src/components，具名匯入對應各檔的 export；
import { Highlight } from '../src/components/Highlight';
import { MaskButtons } from '../src/components/MaskButtons';
import { QuizHeader } from '../src/components/QuizHeader';
import { Blank } from '../src/components/Blank';
import { SnapDeck } from '../src/components/SnapDeck';

// 每個案例結束後手動 cleanup，因為 vitest 沒開 globals，Testing Library 不會自動掛清理鉤子；
afterEach(cleanup);

// 定義共用斷言函式：容器內任何元素都不得帶 inline style 屬性；
function expectNoInlineStyle(container: HTMLElement): void {
  // querySelectorAll('[style]') 用屬性選擇器找出所有帶 style 屬性的元素，期望結果為 0 個；
  expect(container.querySelectorAll('[style]')).toHaveLength(0);
}

// describe 把 Highlight 的案例包成一組；
describe('Highlight', () => {
  // 案例：輸出 mark.hl.hl-{kind} 並包住子節點；
  it('輸出 <mark class="hl hl-core"> 並包住 children', () => {
    // render 回傳 container，是 jsdom 裡承載元件輸出的 div；
    const { container } = render(<Highlight kind="core">重點</Highlight>);
    // 用 CSS 選擇器取 mark 元素，同時要求兩個類別；
    const mark = container.querySelector('mark.hl.hl-core');
    // 斷言元素存在；
    expect(mark).toBeTruthy();
    // 斷言文字內容有被包進去；
    expect(mark?.textContent).toBe('重點');
    // 斷言沒有 inline style；
    expectNoInlineStyle(container);
  });

  // 案例：六種 kind 都會產生對應的類別，用陣列迴圈逐一驗證；
  it('六種 kind 都輸出對應的 hl-{kind} 類別', () => {
    // 用 as const 讓陣列元素保持字面值型別，才能傳給 kind；
    for (const kind of ['core', 'warn', 'ok', 'term', 'data', 'note'] as const) {
      // 每次渲染一個 Highlight；
      const { container, unmount } = render(<Highlight kind={kind}>字</Highlight>);
      // 斷言類別存在，第二個參數是失敗時顯示的訊息；
      expect(container.querySelector(`mark.hl.hl-${kind}`), kind).toBeTruthy();
      // 卸載這次渲染，避免 DOM 堆疊；
      unmount();
    }
  });
});

// describe 把 MaskButtons 的案例包成一組；
describe('MaskButtons', () => {
  // 案例：兩顆按鈕的文字恰為 🙈 與 👀；
  it('按鈕文字內容恰為 🙈 與 👀', () => {
    // 畫出元件；
    const { container } = render(<MaskButtons />);
    // 取出所有按鈕，Array.from 把 NodeList 轉成陣列才能 map；
    const buttons = Array.from(container.querySelectorAll('button'));
    // 斷言恰有兩顆；
    expect(buttons).toHaveLength(2);
    // 斷言文字內容依序是兩個 emoji，沒有其他字；
    expect(buttons.map((b) => b.textContent)).toEqual(['🙈', '👀']);
  });

  // 案例：兩顆按鈕都有 aria-label、data-note-action 與 type=button；
  it('帶 aria-label、data-note-action 與 type="button"', () => {
    // 畫出元件；
    const { container } = render(<MaskButtons />);
    // 用屬性選擇器分別取兩顆按鈕；
    const mask = container.querySelector('button[data-note-action="mask-all"]');
    // 另一顆是全部顯示；
    const show = container.querySelector('button[data-note-action="show-all"]');
    // 斷言兩顆都存在；
    expect(mask).toBeTruthy();
    // 同上；
    expect(show).toBeTruthy();
    // 斷言 aria-label 逐字相符；
    expect(mask?.getAttribute('aria-label')).toBe('全部遮起來');
    // 同上；
    expect(show?.getAttribute('aria-label')).toBe('全部顯示');
    // 斷言 type 是 button，避免在表單裡被當成送出鍵；
    expect(mask?.getAttribute('type')).toBe('button');
    // 同上；
    expect(show?.getAttribute('type')).toBe('button');
    // 斷言沒有 inline style；
    expectNoInlineStyle(container);
  });

  // 案例：MaskButtons 以 fragment 輸出，容器的直接子節點就是兩顆按鈕；
  it('以 fragment 輸出，沒有多餘的外層包裝', () => {
    // 畫出元件；
    const { container } = render(<MaskButtons />);
    // children 只含元素節點，直接子元素應該是兩顆 button；
    expect(Array.from(container.children).map((el) => el.tagName)).toEqual(['BUTTON', 'BUTTON']);
  });
});

// describe 把 QuizHeader 的案例包成一組；
describe('QuizHeader', () => {
  // 案例：h2 與兩顆按鈕落在同一個 .quiz-head 容器；
  it('h2 與兩顆按鈕有同一個父層 .quiz-head', () => {
    // 畫出元件；
    const { container } = render(<QuizHeader id="quiz-title" title="小測驗" />);
    // 取容器；
    const head = container.querySelector('div.quiz-head');
    // 斷言容器存在；
    expect(head).toBeTruthy();
    // 取標題；
    const h2 = head?.querySelector('h2');
    // 斷言 h2 的 id 與文字；
    expect(h2?.getAttribute('id')).toBe('quiz-title');
    // 文字內容；
    expect(h2?.textContent).toBe('小測驗');
    // 斷言 h2 的父層就是 .quiz-head；
    expect(h2?.parentElement).toBe(head);
    // 取 .quiz-actions；
    const actions = head?.querySelector('div.quiz-actions');
    // 斷言它也直接掛在 .quiz-head 底下；
    expect(actions?.parentElement).toBe(head);
    // 斷言兩顆按鈕在 .quiz-actions 裡，而且同在 .quiz-head 之內；
    expect(actions?.querySelectorAll('button')).toHaveLength(2);
  });

  // 案例：h2 在左、.quiz-actions 在右，也就是 DOM 順序 h2 在前；
  it('DOM 順序為 h2 在前、.quiz-actions 在後', () => {
    // 畫出元件；
    const { container } = render(<QuizHeader id="q" title="題目" />);
    // 取容器的直接子元素，轉成標籤與類別的摘要；
    const kids = Array.from(container.querySelector('.quiz-head')?.children ?? []);
    // 斷言順序與標籤；
    expect(kids.map((el) => el.tagName)).toEqual(['H2', 'DIV']);
    // 斷言第二個是 .quiz-actions；
    expect(kids[1].classList.contains('quiz-actions')).toBe(true);
  });

  // 案例：輸出的按鈕與 MaskButtons 一致（Task 5 的腳本依賴同一組屬性）；
  it('按鈕屬性與 Task 5 腳本重建的 DOM 一致', () => {
    // 畫出元件；
    const { container } = render(<QuizHeader id="q" title="題目" />);
    // 取兩顆按鈕；
    const buttons = Array.from(container.querySelectorAll('.quiz-actions > button'));
    // 逐顆摘要成「文字、動作、label、type」；
    expect(
      buttons.map((b) => [b.textContent, b.getAttribute('data-note-action'), b.getAttribute('aria-label'), b.getAttribute('type')]),
    ).toEqual([
      ['🙈', 'mask-all', '全部遮起來', 'button'],
      ['👀', 'show-all', '全部顯示', 'button'],
    ]);
    // 斷言沒有 inline style；
    expectNoInlineStyle(container);
  });
});

// describe 把 Blank 的案例包成一組；
describe('Blank', () => {
  // 案例：輸出 input.blank 並把答案放進 data-a；
  it('輸出 <input class="blank" data-a="答案">', () => {
    // 畫出元件；
    const { container } = render(<Blank answer="stack" />);
    // 取 input；
    const input = container.querySelector('input.blank');
    // 斷言存在；
    expect(input).toBeTruthy();
    // 斷言 data-a 為答案；
    expect(input?.getAttribute('data-a')).toBe('stack');
    // 斷言沒有 inline style；
    expectNoInlineStyle(container);
  });
});

// describe 把 SnapDeck 的案例包成一組；
describe('SnapDeck', () => {
  // 案例：輸出 div.snap-deck 並包住子節點；
  it('輸出 <div class="snap-deck"> 並包住 children', () => {
    // 畫出元件，children 放兩個子元素；
    const { container } = render(
      <SnapDeck>
        <section>一</section>
        <section>二</section>
      </SnapDeck>,
    );
    // 取容器；
    const deck = container.querySelector('div.snap-deck');
    // 斷言存在；
    expect(deck).toBeTruthy();
    // 斷言兩個子元素都在裡面；
    expect(deck?.querySelectorAll('section')).toHaveLength(2);
    // 斷言沒有 inline style；
    expectNoInlineStyle(container);
  });
});
