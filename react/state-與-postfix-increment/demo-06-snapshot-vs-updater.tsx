// =====================================================================================
// 範例 04：快照陷阱，連呼叫兩次為什麼只加一次
// 網址：http://localhost:3000/postfix-increment/04-snapshot-vs-updater
//
// 這一頁要證明的一句話：
//   在同一個事件處理器裡，count 從頭到尾都是同一份快照，
//   所以 setCount(count + 1) 寫兩次只會加一次；
//   要連加兩次必須改用 updater function（更新函式）setCount(prev => prev + 1)。
// =====================================================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SnapshotVsUpdaterDemo() {
  // 左邊：用快照計算
  const [snapshotCount, setSnapshotCount] = useState(0);
  // 右邊：用 updater function 計算
  const [updaterCount, setUpdaterCount] = useState(0);
  // 把佇列裡實際排進去的內容記錄下來，方便對照
  const [trace, setTrace] = useState<string[]>([]);

  const runSnapshotTwice = () => {
    // snapshotCount 在這個函式執行期間是一個常數，不會因為呼叫了 setState 就變大。
    setSnapshotCount(snapshotCount + 1); // 假設快照是 3 → 排入 4
    setSnapshotCount(snapshotCount + 1); // 快照還是 3 → 又排入 4
    // React 結算佇列時依序套用 4、4，最後結果是 4 → 只加了一次

    setTrace((prev) => [
      `快照版：快照 = ${snapshotCount}，排入佇列 [${snapshotCount + 1}, ${snapshotCount + 1}]，` +
        `最後結果 ${snapshotCount + 1}`,
      ...prev,
    ]);
  };

  const runUpdaterTwice = () => {
    // 傳給 setState 的如果是函式，React 會在結算時呼叫它，
    // 並把「目前佇列算到的最新值」當作參數 prev 傳進去。
    setUpdaterCount((prev) => prev + 1); // 結算時 prev = 目前值 → +1
    setUpdaterCount((prev) => prev + 1); // 第二個函式拿到第一個算完的結果 → 再 +1

    setTrace((prev) => [
      `updater 版：排入佇列 [f1, f2]，結算時 ${updaterCount} → ${updaterCount + 1} → ${updaterCount + 2}`,
      ...prev,
    ]);
  };

  const resetAll = () => {
    setSnapshotCount(0);
    setUpdaterCount(0);
    setTrace([]);
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12 font-sans text-zinc-900 dark:text-zinc-100">
      <Link href="/postfix-increment" className="text-sm text-sky-600 hover:underline">
        ← 回到四個範例目錄
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          04　快照陷阱：連呼叫兩次為什麼只加一次
        </h1>
        <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          兩邊各按一次，看數字差多少。
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-sky-300 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/40">
          <p className="text-sm font-medium">setCount(count + 1) 兩次</p>
          <p className="mt-2 font-mono text-3xl">{snapshotCount}</p>
          <button
            onClick={runSnapshotTwice}
            className="mt-3 rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
          >
            按一下（只會 +1）
          </button>
        </div>

        <div className="rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/40">
          <p className="text-sm font-medium">setCount(prev =&gt; prev + 1) 兩次</p>
          <p className="mt-2 font-mono text-3xl">{updaterCount}</p>
          <button
            onClick={runUpdaterTwice}
            className="mt-3 rounded bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800"
          >
            按一下（會 +2）
          </button>
        </div>
      </section>

      <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded bg-black/85 p-3 text-xs leading-6 text-zinc-100">
        {trace.length ? trace.join('\n') : '（還沒按過）'}
      </pre>

      <button
        onClick={resetAll}
        className="self-start rounded border border-zinc-400 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        全部歸零
      </button>

      <section>
        <h2 className="mb-2 text-lg font-semibold">這一頁的關鍵原始碼</h2>
        <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs leading-6 text-zinc-100">
{`// 只會加 1：兩次都拿同一份快照去算
setCount(count + 1)          // 快照 3 → 排入 4
setCount(count + 1)          // 快照還是 3 → 又排入 4
// 佇列 [4, 4] 依序套用，最後是 4

// 會加 2：放進佇列的是函式，結算時才拿最新值
setCount(prev => prev + 1)   // prev = 3 → 4
setCount(prev => prev + 1)   // prev = 4 → 5
// 佇列 [f1, f2] 串接計算，最後是 5`}
        </pre>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 text-sm leading-7 dark:border-zinc-800">
        <h2 className="mb-1 font-semibold">判斷準則</h2>
        <p>a. 新值需要依賴舊值時，一律用 updater function：setCount(prev =&gt; prev + 1)</p>
        <p>b. 新值跟舊值無關時（例如直接設成 0、設成表單輸入值），才用 setCount(新值)</p>
        <p>c. 這一關也是 count++ 與 ++count 都救不了的地方，因為問題不在運算子，在快照</p>
      </section>

      <p className="text-sm">
        <Link href="/postfix-increment" className="text-sky-600 hover:underline">
          ← 回到四個範例目錄
        </Link>
      </p>
    </main>
  );
}
