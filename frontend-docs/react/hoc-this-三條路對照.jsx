/**
 * hoc-this-三條路對照.jsx
 * 配套筆記：HOC高階組件與渲染劫持-反向繼承與三框架複用機制對照.md 的 (f-2) ～ (f-7)
 * 主軸圖：obsidian-attachment/學習React_圖解_HOC裡的this是誰-呼叫點決定this_2026-09-11.svg
 * 目的：用 console 印出「同一個 this 關鍵字，在三種呼叫姿勢下分別是誰」
 * 跑法：貼進任一個 React 18 專案的頁面，開 F12 Console 看輸出
 * 整理日期：2026-09-11
 */

import React from 'react';

/* ------------------------------------------------------------------ *
 * 路線 A：class 組件的 render()
 * React 的 reconciler 先 new 出實例，之後寫成 instance.render() 呼叫
 * 點號左邊有接收者（receiver）→ 隱式綁定 → this 就是那顆實例
 * ------------------------------------------------------------------ */
class BasePage extends React.Component {
  state = { hits: 0 };

  render() {
    console.log('[A] render 裡的 this === undefined ?', this === undefined); // false
    console.log('[A] this.props 是實例自有屬性 ?', Object.hasOwn(this, 'props')); // true
    return <p>真正的內容，hits = {this.state.hits}</p>;
  }
}

/* ------------------------------------------------------------------ *
 * 反向繼承（Inheritance Inversion）型的 HOC
 * 整棵樹只有「一顆」實例，所以 this 同時是 BasePage 的實例
 * ------------------------------------------------------------------ */
function withRenderHijack(WrappedComponent) {
  return class extends WrappedComponent {
    render() {
      // 守衛條件放最上面，原組件的 render 才不會白跑一次（筆記 (f-6) 的修正版）
      if (!this.props.isAllowed) {
        console.log('[A] 沒權限分支，this 是誰：', this.constructor.name || '(匿名 class)');
        console.log('[A] this instanceof WrappedComponent ?', this instanceof WrappedComponent); // true
        console.log('[A] 父類別名稱：', Object.getPrototypeOf(this.constructor).name); // BasePage
        console.log('[A] 讀得到原組件的 state 嗎：', this.state); // { hits: 0 }
        return <p>沒有權限</p>;
      }
      const elementTree = super.render(); // super 指向父類別原型，但 this 仍是我自己
      return React.cloneElement(elementTree, { className: 'hijacked' });
    }
  };
}

export const ProtectedByII = withRenderHijack(BasePage);

/* ------------------------------------------------------------------ *
 * 對照組：屬性代理（Props Proxy）型的 HOC
 * 有「兩顆」實例，外層的 this 看不到內層的 state
 * ------------------------------------------------------------------ */
function withAuthPP(WrappedComponent) {
  return class extends React.Component {
    render() {
      console.log('[PP] this instanceof WrappedComponent ?', this instanceof WrappedComponent); // false
      console.log('[PP] 外層讀得到內層 state 嗎：', this.state); // null，看不到
      if (!this.props.isAllowed) return <p>沒有權限</p>;
      return <WrappedComponent {...this.props} />;
    }
  };
}

export const ProtectedByPP = withAuthPP(BasePage);

/* ------------------------------------------------------------------ *
 * 路線 B：class 組件的事件處理器
 * 寫 this.handleBad 只是「把函式值讀出來」，接收者在那一刻就斷了
 * 之後 React 事件系統是裸呼叫 handler(event)
 * class body 永遠是 strict mode → 不會 fallback 成 globalThis → undefined
 * ------------------------------------------------------------------ */
export class ThisInHandler extends React.Component {
  // 解法二：箭頭函式 class field，建構實例時就把 this 從語彙環境抓好
  handleGood = () => {
    console.log('[B-good] this 是：', this.constructor.name); // ThisInHandler
  };

  handleBad() {
    console.log('[B-bad] this 是：', this); // undefined
  }

  constructor(props) {
    super(props);
    // 解法一：顯式綁定，用 bind 把接收者釘死，回傳一支新函式
    this.handleBound = this.handleBad.bind(this);
  }

  render() {
    return (
      <div>
        <button onClick={this.handleGood}>箭頭 class field（可用）</button>
        <button onClick={this.handleBound}>bind 過（可用）</button>
        <button onClick={this.handleBad}>沒 bind（this 是 undefined，會丟 TypeError）</button>
      </div>
    );
  }
}

/* ------------------------------------------------------------------ *
 * 路線 C：function 組件
 * React 直接寫成 MyComp(props)，從頭到尾沒有 new 出任何實例
 * ES module 永遠是 strict mode → this 是 undefined
 * 但你不需要它，資料走參數 props、狀態走 useState
 * ------------------------------------------------------------------ */
export function ThisInFunctionComponent(props) {
  console.log('[C] function 組件裡的 this：', this); // undefined
  return <p>我沒有實例，也不需要 this，props.isAllowed = {String(props.isAllowed)}</p>;
}
