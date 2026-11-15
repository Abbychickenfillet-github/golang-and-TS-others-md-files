// 從 vitest 匯入測試骨架：describe 分組、it 定義案例、expect 斷言、afterEach 是每個案例結束後的鉤子；
import { afterEach, describe, expect, it } from 'vitest';
// 從 Testing Library 匯入 render（把元件畫進 jsdom）、cleanup（清掉已畫的 DOM），用具名匯入 `{ }` 只取需要的；
import { cleanup, render } from '@testing-library/react';
// 匯入四個待測元件，用相對路徑指向 src/components，具名匯入對應各檔的 export；
import { Card } from '../src/components/Card';
import { Pills } from '../src/components/Pills';
import { Hero } from '../src/components/Hero';
import { Legend } from '../src/components/Legend';

// 每個案例結束後手動 cleanup，因為 vitest 沒開 globals，Testing Library 不會自動掛清理鉤子，不清會讓 DOM 殘留到下個案例；
afterEach(cleanup);

// 定義共用斷言函式：容器內任何元素都不得帶 inline style 屬性；
function expectNoInlineStyle(container: HTMLElement): void {
  // querySelectorAll('[style]') 用屬性選擇器找出所有帶 style 屬性的元素，期望結果為 0 個；
  expect(container.querySelectorAll('[style]')).toHaveLength(0);
}

// describe 把 Card 的案例包成一組；
describe('Card', () => {
  // 案例一：輸出 article.card 並包住子節點；
  it('輸出 <article class="card"> 並包住 children', () => {
    // render 回傳 container，是 jsdom 裡承載元件輸出的 div；
    const { container } = render(<Card>內文</Card>);
    // querySelector 用 CSS 選擇器取第一個符合的元素；
    const card = container.querySelector('article.card');
    // 斷言元素存在，toBeTruthy 排除 null；
    expect(card).toBeTruthy();
    // 斷言文字內容有被包進卡片；
    expect(card?.textContent).toBe('內文');
    // 斷言沒有 inline style；
    expectNoInlineStyle(container);
  });

  // 案例二：有傳 id 時寫到 article 上；
  it('傳入 id 時寫到 article 的 id 屬性', () => {
    // 這次多傳 id 屬性；
    const { container } = render(<Card id="intro">內文</Card>);
    // 斷言 article 的 id 是 intro；
    expect(container.querySelector('article.card')?.id).toBe('intro');
  });

  // 案例三：沒傳 id 時不輸出 id 屬性；
  it('沒傳 id 時不輸出 id 屬性', () => {
    // 不傳 id 渲染；
    const { container } = render(<Card>內文</Card>);
    // hasAttribute 檢查屬性是否存在，期望不存在；
    expect(container.querySelector('article.card')?.hasAttribute('id')).toBe(false);
  });
});

// describe 把 Pills 的案例包成一組；
describe('Pills', () => {
  // 案例：兩個項目得到兩個 .pill；
  it('傳入兩項得到 div.pills 與兩個 span.pill', () => {
    // 傳入題目指定的兩個標籤；
    const { container } = render(<Pills items={['#cookie', 'http協定']} />);
    // 斷言外層容器是 div.pills；
    expect(container.querySelector('div.pills')).toBeTruthy();
    // 取出所有 span.pill 轉成陣列；
    const pills = Array.from(container.querySelectorAll('span.pill'));
    // 斷言數量為 2；
    expect(pills).toHaveLength(2);
    // 斷言每顆標籤的文字依序相符；
    expect(pills.map((p) => p.textContent)).toEqual(['#cookie', 'http協定']);
    // 斷言沒有 inline style（字距交給 CSS）；
    expectNoInlineStyle(container);
  });
});

// describe 把 Hero 的案例包成一組；
describe('Hero', () => {
  // 案例一：含 h1、Pills、meta；
  it('輸出 header.hero，內含 h1、pills 與 meta', () => {
    // meta 傳入一個 JSX 節點，驗證它被放進 .meta；
    const { container } = render(
      <Hero title="Cookie 筆記" pills={['#cookie']} meta={<span>來源：MDN</span>} />,
    );
    // 取出 header.hero；
    const hero = container.querySelector('header.hero');
    // 斷言 header 存在；
    expect(hero).toBeTruthy();
    // 斷言 h1 文字等於標題；
    expect(hero?.querySelector('h1')?.textContent).toBe('Cookie 筆記');
    // 斷言 pills 在 header 裡面；
    expect(hero?.querySelectorAll('div.pills span.pill')).toHaveLength(1);
    // 斷言 meta 節點被包在 .meta 內；
    expect(hero?.querySelector('.meta')?.textContent).toBe('來源：MDN');
    // 斷言沒有 inline style；
    expectNoInlineStyle(container);
  });

  // 案例二：pills 為空陣列時不輸出 pills 外框；
  it('pills 為空時不輸出 .pills 外框', () => {
    // 傳空陣列；
    const { container } = render(<Hero title="標題" pills={[]} />);
    // 斷言找不到 .pills；
    expect(container.querySelector('.pills')).toBeNull();
  });

  // 案例三：meta 未傳時不輸出 .meta；
  it('meta 未傳時不輸出 .meta', () => {
    // 不傳 meta；
    const { container } = render(<Hero title="標題" pills={['#a']} />);
    // 斷言找不到 .meta；
    expect(container.querySelector('.meta')).toBeNull();
  });
});

// describe 把 Legend 的案例包成一組；
describe('Legend', () => {
  // 案例：每項輸出一個 hl-{kind} 的 span；
  it('輸出 div.legend，每項一個 span.hl-{kind}', () => {
    // 傳入兩種螢光筆類型；
    const { container } = render(
      <Legend
        items={[
          { kind: 'core', label: '核心重點' },
          { kind: 'warn', label: '易錯警告' },
        ]}
      />,
    );
    // 斷言外層是 div.legend；
    expect(container.querySelector('div.legend')).toBeTruthy();
    // 斷言 hl-core 的文字；
    expect(container.querySelector('span.hl-core')?.textContent).toBe('核心重點');
    // 斷言 hl-warn 的文字；
    expect(container.querySelector('span.hl-warn')?.textContent).toBe('易錯警告');
    // 斷言圖例內剛好兩個 span；
    expect(container.querySelectorAll('.legend span')).toHaveLength(2);
    // 斷言沒有 inline style；
    expectNoInlineStyle(container);
  });
});
