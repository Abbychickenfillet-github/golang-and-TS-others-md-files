// =====================================================================================
// app/immutable-memory/page.tsx
// 主題：immutable 更新到底複製了什麼？舊值會不會塞滿記憶體？
// 網址：http://localhost:3000/immutable-memory
//
// 這一頁要用「物件參考（reference）比對」親眼證明兩件事：
//   a. immutable 更新只換掉「外殼」與「真正被改到的那一筆」，其他元素是同一個物件（structural sharing）
//   b. mutation（就地修改）雖然省了外殼，但 React 的 Object.is 比不出差別，畫面根本不會更新
// =====================================================================================

'use client';

import { useState, useRef, useEffect } from 'react';

// 一筆資料的型別。interface 是 TypeScript 的型別宣告，只存在於編譯期，不會進到瀏覽器。
interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const INITIAL: Todo[] = [
  { id: 1, text: '看懂 count + 1 為什麼是 immutable', done: false },
  { id: 2, text: '搞清楚 structural sharing', done: false },
  { id: 3, text: '確認舊值會不會被 GC 回收', done: false },
  { id: 4, text: '知道什麼時候記憶體真的會漲', done: false },
];

export default function ImmutableMemoryPage() {
  const [todos, setTodos] = useState<Todo[]>(INITIAL);
  const [log, setLog] = useState<string[]>([]);

  // -----------------------------------------------------------------------------------
  // 用 useRef 把「上一次 render 時的陣列與每個元素」記下來。
  // useRef 的 .current 改動不會觸發 re-render，正好適合拿來做跨 render 的比對。
  // -----------------------------------------------------------------------------------
  const prevRef = useRef<{ shell: Todo[]; items: Todo[] } | null>(null);
  const prev = prevRef.current;

  // 外殼（陣列本身）是不是同一個物件？React 就是靠這一格判斷「要不要重新渲染」。
  const shellSame = prev ? prev.shell === todos : null;

  // 每一個元素是不是跟上一輪同一個物件？true 代表「共用，沒有被複製」。
  const elemSame = todos.map((t, i) => (prev ? prev.items[i] === t : null));

  // 在 commit 之後才更新 ref，這樣 render 期間比對到的才是「上一輪」的值。
  // 注意：開發模式的 StrictMode 會刻意重跑一次，第一次載入的比對可能看起來怪怪的，
  //       按過一次按鈕之後就正常了。
  useEffect(() => {
    prevRef.current = { shell: todos, items: [...todos] };
  });

  const renderCount = useRef(0);
  renderCount.current += 1;

  // -----------------------------------------------------------------------------------
  // 正確做法：immutable 更新
  // map 產生「新陣列」，只有 id 相符的那一筆用展開語法產生「新物件」，
  // 其餘的 return 原本那個物件本身 → 它們的參考完全沒變，這就是 structural sharing。
  // -----------------------------------------------------------------------------------
  const toggleImmutable = (id: number) => {
    setTodos((prevTodos) =>
      prevTodos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
    setLog((l) => [
      `immutable：換掉 1 個外殼 + 1 個元素，其餘 ${INITIAL.length - 1} 個元素共用`,
      ...l,
    ]);
  };

  // -----------------------------------------------------------------------------------
  // 錯誤做法一：就地修改元素，再把「同一個陣列」交回去
  // 外殼沒變 → React 用 Object.is(舊, 新) 比較發現一樣 → 直接 bail out（跳過重新渲染）
  // -----------------------------------------------------------------------------------
  const toggleMutate = (id: number) => {
    const target = todos.find((t) => t.id === id);
    if (target) target.done = !target.done; // 資料其實已經被改了
    setTodos(todos); // 但傳回去的是同一個陣列參考
    setLog((l) => [
      'mutation：資料改了，但外殼是同一個 → Object.is 相同 → React 不重新渲染',
      ...l,
    ]);
  };

  // -----------------------------------------------------------------------------------
  // 錯誤做法二：深拷貝整棵樹
  // 每個元素都變成新物件，共用完全消失。功能上會動，但白白多配置了 N 個物件，
  // 而且所有 React.memo 的子元件都會因為 props 改變而重新渲染。
  // -----------------------------------------------------------------------------------
  const toggleDeepClone = (id: number) => {
    setTodos((prevTodos) =>
      prevTodos.map((t) => ({ ...t, done: t.id === id ? !t.done : t.done })),
    );
    setLog((l) => [
      `深拷貝：換掉 1 個外殼 + 全部 ${INITIAL.length} 個元素，共用完全消失`,
      ...l,
    ]);
  };

  const reset = () => {
    setTodos(INITIAL.map((t) => ({ ...t })));
    setLog([]);
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12 font-sans text-zinc-900 dark:text-zinc-100">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          immutable 到底複製了什麼？舊值會塞滿記憶體嗎？
        </h1>
        <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          這一頁 render 了 {renderCount.current} 次。
          下面每一列右邊會標示「這個元素跟上一輪是不是同一個物件」，
          按不同按鈕看標示怎麼變，就知道每種寫法各自複製了多少東西。
        </p>
      </header>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm">
          外殼（陣列本身）跟上一輪比對：
          {shellSame === null ? (
            <span className="ml-2 text-zinc-500">（還沒有上一輪）</span>
          ) : shellSame ? (
            <span className="ml-2 rounded bg-red-100 px-2 py-0.5 font-mono text-xs text-red-700">
              同一個 → React 不會重新渲染
            </span>
          ) : (
            <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 font-mono text-xs text-emerald-700">
              新的 → React 會重新渲染
            </span>
          )}
        </p>

        <ul className="mt-4 flex flex-col gap-2">
          {todos.map((t, i) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
            >
              <span className={t.done ? 'line-through opacity-50' : ''}>
                {t.id}. {t.text}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {elemSame[i] === null ? (
                  <span className="font-mono text-xs text-zinc-400">—</span>
                ) : elemSame[i] ? (
                  <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-xs text-emerald-700">
                    共用，沒複製
                  </span>
                ) : (
                  <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-xs text-amber-700">
                    新物件
                  </span>
                )}
                <button
                  onClick={() => toggleImmutable(t.id)}
                  className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  切換
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-wrap gap-2">
        <button
          onClick={() => toggleImmutable(1)}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          正確：immutable 改第 1 筆
        </button>
        <button
          onClick={() => toggleMutate(2)}
          className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          錯誤一：就地修改第 2 筆（畫面不會動）
        </button>
        <button
          onClick={() => toggleDeepClone(3)}
          className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          錯誤二：深拷貝改第 3 筆（全部變新物件）
        </button>
        <button
          onClick={reset}
          className="rounded border border-zinc-400 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          重設
        </button>
      </section>

      <pre className="max-h-44 overflow-auto whitespace-pre-wrap rounded bg-black/85 p-3 text-xs leading-6 text-zinc-100">
        {log.length ? log.join('\n') : '（還沒按過）'}
      </pre>

      <section>
        <h2 className="mb-2 text-lg font-semibold">這一頁的關鍵原始碼</h2>
        <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs leading-6 text-zinc-100">
{`// 正確：只有被改到的那一筆是新物件，其餘 return 原物件本身
setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
//   → 新外殼 1 個，新元素 1 個，其餘 N-1 個共用（structural sharing）

// 錯誤一：就地修改，外殼沒換
todos.find(t => t.id === id).done = !done
setTodos(todos)
//   → Object.is(舊外殼, 新外殼) === true，React 直接跳過重新渲染

// 錯誤二：深拷貝，共用全部消失
setTodos(prev => prev.map(t => ({ ...t, done: t.id === id ? !t.done : t.done })))
//   → 新外殼 1 個，新元素 N 個，多花 N-1 個物件，React.memo 全部失效`}
        </pre>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 text-sm leading-7 dark:border-zinc-800">
        <h2 className="mb-1 font-semibold">那舊的那些會不會堆滿記憶體</h2>
        <p>a. 不會。舊外殼在 setTodos 之後就沒有任何人指向它，變成不可達（unreachable），下一次 minor GC 就回收</p>
        <p>b. V8 的新生代回收成本只跟「活下來的物件數」成正比，跟「產生了多少垃圾」無關，所以短命的舊 state 幾乎是免費的</p>
        <p>c. 真正會漲的是「你自己把舊值抓住」的情況：沒有上限的 undo 堆疊、全域快取、閉包意外捕獲大物件</p>
        <p>d. 想看實際數字，跑 <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">node --expose-gc immutable-memory-gc.js</code></p>
      </section>
    </main>
  );
}
