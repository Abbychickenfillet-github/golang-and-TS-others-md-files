// HOC 兩種流派對照：Props Proxy vs Inheritance Inversion
// 對應筆記：HOC高階組件與渲染劫持-反向繼承與三框架複用機制對照.md
// 注意：這是為了讀懂舊 codebase 與面試而寫的示範，新專案請優先用 Custom Hooks

import React from 'react';

// =========================================================
// 流派 1：Props Proxy（屬性代理）— 常見、安全、推薦
// HOC 把原組件「包」在裡面，只動 props，不碰它的內部
// =========================================================
function withExtraProps(WrappedComponent) {
  return function Enhanced(props) {
    const injected = { user: { name: 'Abby' } };
    // 原組件對 HOC 一無所知，HOC 也拿不到它的 state
    return <WrappedComponent {...props} {...injected} />;
  };
}

// =========================================================
// 流派 2：Inheritance Inversion（反向繼承）— 才有「渲染劫持」
// HOC 反過來 extends 原組件，因此讀得到它的 state 與 render
// =========================================================
function withRenderHijack(WrappedComponent) {
  return class extends WrappedComponent {
    render() {
      // super 指向父類別（也就是被包的組件）的原型
      // 這句是「用父類別版本的 render，但 this 還是我」
      const elementTree = super.render();

      // 場景 A：條件式渲染 —— 整段覆蓋掉
      if (!this.props.isAllowed) {
        return <p>沒有權限</p>;
      }

      // 場景 B：修改元素 —— React 元素不可變，只能 clone
      return React.cloneElement(elementTree, { className: 'hijacked' });
    }
  };
}

// =========================================================
// 為什麼實務上不建議用流派 2
// =========================================================
// 1. 只對 class 組件有效，function 組件沒有 render 可以 super
// 2. 會偷偷改寫原組件的 this，state 互相污染很難追
// 3. 靜態方法不會自動繼承（要手動 hoist-non-react-statics）
// 4. ref 傳遞困難，React DevTools 上會多一層看不懂的匿名組件
// 5. 現代做法：把邏輯抽成 Custom Hook，組件維持扁平
//
// function useAuth() { ... return { isAllowed }; }
// function MyPage() { const { isAllowed } = useAuth(); ... }
