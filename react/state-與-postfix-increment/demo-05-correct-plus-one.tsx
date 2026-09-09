// =====================================================================================
// 範例 03：setCount(count + 1) 為什麼可以
// 網址：http://localhost:3000/postfix-increment/03-correct-plus-one
//
// 這一頁要證明的一句話：
//   count + 1 是純運算式，完全不碰 count 這個綁定本身；
//   真正讓畫面動起來的，是「呼叫 setCount 這個排程更新的函式」，不是 + 這個運算子。
// =====================================================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function CorrectPlusOneDemo() {
  const [count, setCount] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const runPlusOne = () => {
    // count + 1：只是「讀取 count、算出一個新數字」，count 這個綁定本身完全沒被動到。
    // 新數字是誰交給 React 的？是下面這行 setCount，不是 + 1 這個運算式。
    const next = count + 1;
    setCount(next);
    setLog((prev) => [
      `count + 1 = ${count} + 1 = ${next} → setCount(${next})`,
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
          03　setCount(count + 1) 為什麼可以
        </h1>
        <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          目前 count = <span className="font-mono text-base">{count}</span>
        </p>
      </header>

      <section className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
        <button
          onClick={runPlusOne}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          setCount(count + 1)　每按一次 +1
        </button>
        <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-black/85 p-3 text-xs leading-6 text-emerald-100">
          {log.length ? log.join('\n') : '（還沒按過）'}
        </pre>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">這一頁的關鍵原始碼</h2>
        <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs leading-6 text-zinc-100">
{`const [count, setCount] = useState(0)

// count + 1 只是一個「運算式」，等同 1 + 1、count * 2，
// 它只是「讀取」count 現在的值去算一個新數字，不涉及任何賦值。
const next = count + 1

// 真正觸發 React 排程重新 render 的，是呼叫 setCount 這個動作本身。
// setCount 不是在幫某個變數賦值，它是在告訴 React：
// 「下一次 render，請把這個元件對應的 state 換成 next」
setCount(next)`}
        </pre>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 text-sm leading-7 dark:border-zinc-800">
        <h2 className="mb-1 font-semibold">逐點解說</h2>
        <p>a. count++ 之所以爆炸，是因為 ++ 內含「對 count 這個名字重新賦值」，而 count 是 const</p>
        <p>b. count + 1 沒有這個問題，因為 + 只是讀值算數，不會去動 count 這個綁定</p>
        <p>c. 改變畫面的從來不是「算出新數字」這個動作，而是「把新數字交給 setCount」這個動作</p>
        <p>d. 所以口訣是：state 用來讀、setState 用來寫，中間不要用 ++/-- 去混淆兩者</p>
      </section>

      <p className="text-sm">
        下一步 →{' '}
        <Link href="/postfix-increment/04-snapshot-vs-updater" className="text-sky-600 hover:underline">
          04　快照陷阱：連呼叫兩次為什麼只加一次
        </Link>
      </p>
    </main>
  );
}
