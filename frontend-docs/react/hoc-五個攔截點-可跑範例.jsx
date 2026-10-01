// hoc-五個攔截點-可跑範例.jsx
// 配合筆記：HOC高階組件與渲染劫持-反向繼承與三框架複用機制對照.md 的 (g) 到 (i-3)
// 主軸圖：obsidian-attachment/學習React_圖解_HOC改變了什麼-props進場到畫面產出的五個攔截點-ISO5807_2026-09-21.svg
// 用法：貼進任一個 React 18/19 專案的頁面，render <Demo />，開 F12 Console 對照 log。
//
// 一句話：HOC 一個字都沒有改過被包的那顆組件，它是在外面新建一層殼，
//        攔截「props 往下傳」與「元素樹往上回」這兩個關口。

import React, { useEffect, useContext, createContext, useState } from 'react';

const AuthContext = createContext(null);

/* ────────── 被包的那顆組件：從頭到尾沒有被改過一個字 ────────── */
function Card({ title, user, onClick, children }) {
  useEffect(() => {
    console.log('[Card] 我被掛載了，這行只有在我真的被建立時才會印');
  }, []);
  return (
    <div style={{ border: '1px solid #ccc', padding: 12, borderRadius: 8 }}>
      <h3>{title}</h3>
      <p>登入者：{user ? user.name : '（沒有收到 user）'}</p>
      <button onClick={onClick}>送出</button>
      {children}
    </div>
  );
}

/* ───── 攔截點 1：只讀不改（Props Proxy 最輕的用法，做 logging） ───── */
function withLogging(Wrapped) {
  function WithLogging(props) {
    // 讀，但一個字都不改
    useEffect(() => {
      console.log('[withLogging] 收到的 props =', props);
    }, []);
    // {...props} 是 HOC 的基本禮貌：不透傳的話，使用端寫的屬性會在這一層被整個吃掉
    return <Wrapped {...props} />;
  }
  // 官方慣例：不設 displayName 的話 DevTools 只會看到一串匿名節點
  WithLogging.displayName = `withLogging(${Wrapped.displayName || Wrapped.name})`;
  return WithLogging;
}

/* ───── 攔截點 2：新增 props（注入），connect() 與 withRouter() 就是這一招 ───── */
function withUser(Wrapped) {
  function WithUser(props) {
    const user = useContext(AuthContext);
    // 書寫順序就是優先權：{...props} 在左邊先展開，user={user} 在右邊後寫所以贏。
    // 把兩者對調就變成「使用端優先」。這一行的左右順序決定誰說了算。
    return <Wrapped {...props} user={user} />;
  }
  WithUser.displayName = `withUser(${Wrapped.displayName || Wrapped.name})`;
  return WithUser;
}

/* ───── 攔截點 3：刪除／改寫 props（攔截 callback） ───── */
function withConfirm(Wrapped) {
  function WithConfirm({ onClick, ...rest }) {
    // 解構時把 onClick 單獨撈出來，剩下的用其餘參數 rest 收成一包
    const guarded = (e) => {
      console.log('[withConfirm] 我攔到了 onClick，先問過再放行');
      if (window.confirm('確定要送出嗎')) onClick?.(e); // 使用端沒傳 onClick 也不會爆
    };
    // rest 灑回去，再用新的 guarded 覆蓋掉原本的 onClick
    return <Wrapped {...rest} onClick={guarded} />;
  }
  WithConfirm.displayName = `withConfirm(${Wrapped.displayName || Wrapped.name})`;
  return WithConfirm;
}

/* ───── 攔截點 4：條件式渲染（Hook 做不到的那一個） ───── */
function withAuth(Wrapped) {
  function WithAuth(props) {
    const user = useContext(AuthContext);
    // 重點：user 是 null 的時候，Wrapped 根本沒有被建立，
    //      它的 useEffect 一次都不會跑，它裡面的 API 請求一次都不會發。
    //      Custom Hook 做不到這件事，因為 Hook 要執行就代表組件已經在渲染了。
    if (!user) {
      console.log('[withAuth] 擋下來了，Card 不會被建立');
      return <p>請先登入</p>;
    }
    return <Wrapped {...props} />;
  }
  WithAuth.displayName = `withAuth(${Wrapped.displayName || Wrapped.name})`;
  return WithAuth;
}

/* ───── 攔截點 5：渲染劫持（只有反向繼承派做得到，需要 class 組件） ───── */
class ClassCard extends React.Component {
  render() {
    return <p className="origin">我是 ClassCard 原本的輸出</p>;
  }
}
function withRenderHijack(WrappedComponent) {
  return class extends WrappedComponent {
    render() {
      // 守衛條件放最前面，才不會讓原組件的 render 白跑一次
      if (!this.props.isAllowed) return <p>沒有權限</p>;
      const elementTree = super.render();          // 拿到原組件產出的元素樹
      return React.cloneElement(elementTree, {     // 元素不可變，只能複製後覆寫
        className: 'hijacked',
        style: { color: 'crimson' },
      });
    }
  };
}
const HijackedCard = withRenderHijack(ClassCard);

/* ────────── 組合起來：注意疊的順序，最外層是最後包的那一個 ────────── */
// 讀這一行要由內往外：Card 先被 withConfirm 包、再被 withUser 包、再被 withLogging 包、最後被 withAuth 包。
// 這一串就是 Wrapper Hell 的長相，DevTools 上會看到四層節點。
const EnhancedCard = withAuth(withLogging(withUser(withConfirm(Card))));

/* ────────── 反例：千萬不要這樣寫 ──────────
function Bad({ data }) {
  const E = withUser(Card);      // ← 每次 render 都產生一個「新的組件型別」
  return <E title="壞範例" />;    //   reconciler 用 === 比對發現不相等，
}                                //   會把整棵舊子樹 unmount 再重新 mount，state 全部歸零。
   正解是把 const E = withUser(Card) 搬到模組頂層，只跑一次。
─────────────────────────────────────────── */

export default function Demo() {
  const [user, setUser] = useState(null);
  return (
    <AuthContext.Provider value={user}>
      <button onClick={() => setUser(user ? null : { name: 'Abby' })}>
        {user ? '登出' : '登入'}
      </button>
      <hr />
      <EnhancedCard title="五個攔截點示範" onClick={() => console.log('[Card] 真正的 onClick 跑了')} />
      <hr />
      <HijackedCard isAllowed={!!user} />
    </AuthContext.Provider>
  );
}
