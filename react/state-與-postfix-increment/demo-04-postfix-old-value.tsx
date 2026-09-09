// =====================================================================================
// 範例 02：改成 let 語法過了，但 postfix 回傳的是舊值
// 網址：http://localhost:3000/postfix-increment/02-postfix-old-value
//
// 這一頁要證明的一句話：
//   就算把 const 快照抄進一個 let 讓 ++ 語法合法，local++ 回傳的仍然是「舊值」，
//   所以 setCount 收到的是舊值，等於把 state 設回它本來就有的數字，畫面完全不動。
// =====================================================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PostfixOldValueDemo() {
  const [count, setCount] = useState(0);

  // 把每一次按鈕的中間過程記錄下來，讓你親眼看到「回傳的是舊值」
  const [log, setLog] = useState<string[]>([]);

  const runPostfix = () => {
    // step A：把 const 快照抄進一個 let。
    //         這是很多人「以為修好了」的寫法，但它只是把錯誤從編譯期搬到執行結果。
    let local = count;

    // step B：local++ 的三步
    //   1. oldValue = local
    //   2. local = oldValue + 1     ← local 確實變大了
    //   3. 整個運算式回傳 oldValue  ← 但拿出來的是舊的
    const passed = local++;

    // step C：排進 React 更新佇列的是 passed，也就是舊值。
    //         React 會用 Object.is 比較新舊 state，發現一樣，可能連 re-render 都省掉。
    setCount(passed);

    setLog((prev) => [
      `第 ${prev.length + 1} 次：local 起始 ${count}，local++ 回傳 ${passed}，` +
        `local 現在是 ${local}，但交給 setCount 的是 ${passed} → 畫面停在 ${count}`,
      ...prev,
    ]);
  };

  // 對照組：改成 prefix，看看差在哪裡
  const runPrefix = () => {
    let local = count;
    const passed = ++local; // prefix 回傳新值
    setCount(passed);
    setLog((prev) => [
      `【prefix 對照】++local 回傳 ${passed} → 畫面會動，但這只是「壞得比較不明顯」`,
      ...prev,
    ]);
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12 font-sans text-zinc-900 dark:text-zinc-100">
      <Link href="/postfix-increment" className="text-sm text-sky-600 hover:underline">
        ← 回到四個範例目錄
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          02　改成 let 也沒用，postfix 回傳的是舊值
        </h1>
        <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          目前 count = <span className="font-mono text-base">{count}</span>
        </p>
      </header>

      <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={runPostfix}
            className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
          >
            setCount(local++)　按幾次都不會動
          </button>
          <button
            onClick={runPrefix}
            className="rounded bg-zinc-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            對照組 setCount(++local)　會動但仍不該用
          </button>
        </div>
        <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-black/85 p-3 text-xs leading-6 text-amber-100">
          {log.length ? log.join('\n') : '（還沒按過）'}
        </pre>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">這一頁的關鍵原始碼</h2>
        <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs leading-6 text-zinc-100">
{`let local = count        // 把 const 快照抄進 let，語法就過了
const passed = local++   // postfix：passed 拿到「舊值」，local 才變新值
setCount(passed)         // 傳出去的是舊值 → state 沒變 → 畫面不動

// 對照組
const passed2 = ++local  // prefix：passed2 拿到「新值」，畫面會動
setCount(passed2)        // 但這只是把症狀蓋掉，觀念仍然是錯的`}
        </pre>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 text-sm leading-7 dark:border-zinc-800">
        <h2 className="mb-1 font-semibold">逐點解說</h2>
        <p>a. postfix 與 prefix 對「變數本身」的效果一樣，都是加一</p>
        <p>b. 差別只在「把這個運算式當成值來用時，你拿到的是舊的還是新的」</p>
        <p>c. React 會用 Object.is 比較新舊 state，值相同時可能直接跳過 re-render</p>
        <p>d. 就算改用 prefix，你仍然是在事件處理器裡改動 render 作用域的變數，這是 side effect，ESLint 的 react-hooks 規則會警告</p>
      </section>

      <p className="text-sm">
        下一步 →{' '}
        <Link href="/postfix-increment/03-correct-plus-one" className="text-sky-600 hover:underline">
          03　setCount(count + 1) 為什麼可以
        </Link>
      </p>
    </main>
  );
}
