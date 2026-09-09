// =====================================================================================
// 範例 01：const 綁定做 count++ 會丟 TypeError
// 網址：http://localhost:3000/postfix-increment/01-const-typeerror
//
// 這一頁要證明的一句話：
//   ++ 的操作對象不是「變數名字」也不是「那個數值」，而是「一個可以寫回去的位置」。
//   useState 解構出來的 count 是 const 綁定，那個位置被鎖住不能重寫，所以 count++ 直接爆炸。
// =====================================================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ConstTypeErrorDemo() {
  // useState(0) 回傳 [當次 render 的快照, 排程更新的函式]
  // 用陣列解構接住，注意左邊是 const → count 這個名字不能被重新綁定
  const [count, setCount] = useState(0);

  const [errorText, setErrorText] = useState('（還沒按過）');
  const [refText, setRefText] = useState('（還沒按過）');

  // -----------------------------------------------------------------------------------
  // 為什麼要用 new Function 而不是直接寫 count++ ？
  //   因為直接寫 count++ 會在「編譯階段」就被 TypeScript 與 SWC（Next.js 的編譯器）擋下，
  //   整個頁面根本編不出來，你就看不到瀏覽器在「執行階段」丟出來的真實錯誤。
  //   new Function 是在執行期才把字串交給 JS 引擎解析，所以可以繞過編譯期檢查。
  // -----------------------------------------------------------------------------------
  const runConstIncrement = () => {
    try {
      const fn = new Function('const count = 0; count++; return count;');
      const value = fn();
      setErrorText(`竟然沒出錯？回傳 ${value}`); // 正常情況不會走到這一行
    } catch (err) {
      const e = err as Error;
      setErrorText(`${e.name}：${e.message}`);
    }
  };

  // -----------------------------------------------------------------------------------
  // 實驗 A：對「值」做 ++ 會怎樣
  // 0 是一個值，不是一個位置，所以連解析都過不了，是 SyntaxError（語法錯誤）
  // -----------------------------------------------------------------------------------
  const runOnValue = () => {
    try {
      new Function('return 0++;')();
      setRefText('竟然沒出錯？');
    } catch (err) {
      const e = err as Error;
      setRefText(
        `0++ →\n${e.name}：${e.message}\n\n` +
          '解讀：0 是「值」不是「位置」。++ 必須寫得回去，\n' +
          '所以它要的是一個格子，不是格子裡的東西。\n' +
          '這是 SyntaxError（語法錯誤），連跑都跑不到。',
      );
    }
  };

  // -----------------------------------------------------------------------------------
  // 實驗 B：對「物件的屬性」做 ++ 完全合法
  // obj.n 不是一個變數，它是一個 property reference（屬性參考）：
  //   Base（往哪裡找）= obj 這個物件
  //   ReferencedName（找哪個名字）= 字串 "n"
  // -----------------------------------------------------------------------------------
  const runOnProperty = () => {
    const obj = { n: 0 };
    const before = obj; // 記住原本的參考
    const returned = obj.n++; // 回傳「讀到的舊值」，不是「n 這個名字」
    setRefText(
      `const obj = { n: 0 }\n` +
        `const returned = obj.n++\n\n` +
        `returned（運算式回傳值） = ${returned}   ← 舊值\n` +
        `obj.n（屬性現在的值）    = ${obj.n}   ← 新值\n` +
        `obj === before           = ${obj === before}   ← 物件本身完全沒換\n\n` +
        '解讀：const 鎖的是「obj 這個名字指向哪個物件」，\n' +
        '不是「那個物件裡面的內容」。obj.n++ 改的是物件內容，\n' +
        'const 完全管不到，所以合法。',
    );
  };

  // -----------------------------------------------------------------------------------
  // 實驗 C：用 getter / setter 證明 ++ 其實是「讀一次、寫一次」兩個動作
  // accessor property（存取器屬性）讓我們可以偷看引擎做了什麼
  // -----------------------------------------------------------------------------------
  const runAccessorSpy = () => {
    let reads = 0;
    let writes = 0;
    let store = 5;
    const spy = {
      get n() {
        reads++;
        return store;
      },
      set n(v: number) {
        writes++;
        store = v;
      },
    };
    const returned = spy.n++;
    setRefText(
      `用 getter / setter 監聽 spy.n++\n\n` +
        `getter 被呼叫次數 = ${reads}   ← 對應規格的 GetValue（讀）\n` +
        `setter 被呼叫次數 = ${writes}   ← 對應規格的 PutValue（寫）\n` +
        `運算式回傳        = ${returned}   ← 舊值\n` +
        `store 最後        = ${store}   ← 新值\n\n` +
        '解讀：++ 從來不是一個原子動作，它是「讀 → 加一 → 寫回去」。\n' +
        '「寫回去」這一步就是 const 擋下 count++ 的地方。',
    );
  };

  // -----------------------------------------------------------------------------------
  // 實驗 D：Object.freeze 才是真正的「內容不可變」
  // 這才是跟 const 完全不同的一件事
  // -----------------------------------------------------------------------------------
  const runFrozen = () => {
    const frozen = Object.freeze({ n: 0 });
    try {
      // 嚴格模式下寫入唯讀屬性會丟 TypeError，模組本來就是嚴格模式
      frozen.n++;
      setRefText(`沒有出錯？frozen.n = ${frozen.n}（代表這段不在嚴格模式）`);
    } catch (err) {
      const e = err as Error;
      setRefText(
        `const frozen = Object.freeze({ n: 0 })\n` +
          `frozen.n++ →\n${e.name}：${e.message}\n\n` +
          '解讀：這才是「內容不可變」。\n' +
          'const  → 鎖名字（binding，綁定）\n' +
          'freeze → 鎖內容（物件的屬性）\n' +
          '兩者完全是兩回事，很多人把它們混在一起。',
      );
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12 font-sans text-zinc-900 dark:text-zinc-100">
      <Link href="/postfix-increment" className="text-sm text-sky-600 hover:underline">
        ← 回到四個範例目錄
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          01　const 綁定做 count++ 會丟 TypeError
        </h1>
        <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          目前 count = <span className="font-mono text-base">{count}</span>
          　（這一頁不會改動它，setCount 只是為了讓你看到它真的是 useState 來的）
        </p>
      </header>

      <section className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
        <button
          onClick={runConstIncrement}
          className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          執行 count++（會丟錯）
        </button>
        <pre className="mt-3 overflow-x-auto rounded bg-black/85 p-3 text-xs text-red-200">
          {errorText}
        </pre>
      </section>

      {/* =============================================================================
          核心觀念：++ 的對象是「位置」不是「值」也不是「名字」
          ============================================================================= */}
      <section>
        <h2 className="mb-2 text-lg font-semibold">++ 的操作對象到底是什麼</h2>
        <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          規格裡 <code>x++</code> 的第一步不是「拿到 x 的值」，而是「求值出一個
          <b> Reference Record（參考記錄）</b>」。
          Reference Record 有兩個欄位：<b>Base</b>（往哪裡找）與
          <b> ReferencedName</b>（找哪個名字）。
          你在 <code>obj.n++</code> 裡看到的 n 不是一個變數，它只是 ReferencedName 那一格裡的字串。
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-100 dark:bg-zinc-800">
                <th className="border border-zinc-300 p-2 text-left dark:border-zinc-700">寫法</th>
                <th className="border border-zinc-300 p-2 text-left dark:border-zinc-700">Reference 種類</th>
                <th className="border border-zinc-300 p-2 text-left dark:border-zinc-700">Base（往哪裡找）</th>
                <th className="border border-zinc-300 p-2 text-left dark:border-zinc-700">ReferencedName</th>
                <th className="border border-zinc-300 p-2 text-left dark:border-zinc-700">const 管得到嗎</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-zinc-300 p-2 font-mono dark:border-zinc-700">count++</td>
                <td className="border border-zinc-300 p-2 dark:border-zinc-700">identifier reference</td>
                <td className="border border-zinc-300 p-2 dark:border-zinc-700">作用域的 Environment Record</td>
                <td className="border border-zinc-300 p-2 font-mono dark:border-zinc-700">&quot;count&quot;</td>
                <td className="border border-zinc-300 p-2 text-red-600 dark:border-zinc-700">管得到 → TypeError</td>
              </tr>
              <tr>
                <td className="border border-zinc-300 p-2 font-mono dark:border-zinc-700">obj.n++</td>
                <td className="border border-zinc-300 p-2 dark:border-zinc-700">property reference</td>
                <td className="border border-zinc-300 p-2 dark:border-zinc-700">obj 這個物件</td>
                <td className="border border-zinc-300 p-2 font-mono dark:border-zinc-700">&quot;n&quot;</td>
                <td className="border border-zinc-300 p-2 text-emerald-700 dark:border-zinc-700">管不到 → 合法</td>
              </tr>
              <tr>
                <td className="border border-zinc-300 p-2 font-mono dark:border-zinc-700">0++</td>
                <td className="border border-zinc-300 p-2 dark:border-zinc-700">不是 Reference，是一個值</td>
                <td className="border border-zinc-300 p-2 dark:border-zinc-700">沒有</td>
                <td className="border border-zinc-300 p-2 dark:border-zinc-700">沒有</td>
                <td className="border border-zinc-300 p-2 text-red-600 dark:border-zinc-700">連解析都過不了 → SyntaxError</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={runOnValue}
            className="rounded bg-zinc-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            A　對「值」做 ++：0++
          </button>
          <button
            onClick={runOnProperty}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            B　對「屬性」做 ++：obj.n++
          </button>
          <button
            onClick={runAccessorSpy}
            className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
          >
            C　用 getter/setter 偷看 ++ 做了幾件事
          </button>
          <button
            onClick={runFrozen}
            className="rounded bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
          >
            D　Object.freeze 才是內容不可變
          </button>
        </div>
        <pre className="mt-3 min-h-32 overflow-x-auto whitespace-pre-wrap rounded bg-black/85 p-3 text-xs leading-6 text-zinc-100">
          {refText}
        </pre>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">這一頁的關鍵原始碼</h2>
        <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs leading-6 text-zinc-100">
{`const [count, setCount] = useState(0)   // 左邊是 const
count++                                  // TypeError: Assignment to constant variable.

// 規格 13.4.3 Postfix Increment 的五個步驟：
//   1. 求值 UnaryExpression → 得到一個 Reference（只求值一次）
//   2. oldValue = ToNumeric( GetValue(ref) )    ← 讀
//   3. newValue = oldValue + 1
//   4. PutValue(ref, newValue)                  ← 寫，const 擋在這一步
//   5. 回傳 oldValue                            ← 所以拿到的是舊值

// 同樣是 ++，Base 不一樣，結果就不一樣：
const count2 = 0;  count2++    // Base 是環境紀錄，const 把它標成不可重寫 → TypeError
const obj = {n:0}; obj.n++     // Base 是 obj 物件，走的是物件的 [[Set]] → 合法`}
        </pre>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 text-sm leading-7 dark:border-zinc-800">
        <h2 className="mb-2 font-semibold">逐點解說</h2>
        <p>
          <b>a. ++ 要的是「格子」，不是「格子裡的東西」。</b>
          所以 <code>0++</code> 是 SyntaxError，因為 0 是一個值，沒有位置可以寫回去。
          你問「不應該是針對 0 嗎」——正好相反，++ 永遠不是針對那個數值本身。
        </p>
        <p>
          <b>b. obj.n 裡的 n 不是變數。</b>
          你在任何作用域都找不到一個叫 n 的變數。
          <code>obj.n</code> 整體是一個 property reference，n 只是「要在 obj 裡查的鍵名字串」。
          所以「n 會先回傳才 ++」這個說法要修正成：
          <b>引擎先用這個 reference 去讀出屬性目前的值，把那個舊值當成整個運算式的結果，再把加一後的新值寫回同一個 reference。</b>
        </p>
        <p>
          <b>c. ++ 是兩個動作不是一個。</b>
          按上面的 C 按鈕，getter 被呼叫 1 次、setter 被呼叫 1 次，這就是規格裡的 GetValue 與 PutValue。
          const 擋的正是 PutValue 那一步。
        </p>
        <p>
          <b>d. const 鎖名字，不鎖內容。</b>
          <code>const</code> 把綁定在 Environment Record 裡標成不可重寫，
          但 <code>obj.n++</code> 的寫入走的是物件自己的 [[Set]]，跟環境紀錄無關，所以 const 管不到。
          要鎖內容得用 <code>Object.freeze</code>，按上面的 D 按鈕看它丟的是完全不同的錯誤訊息。
        </p>
        <p>
          <b>e. 有人真的會對屬性 ++ 嗎？很常見。</b>
          <code>counts[ch]++</code>（字頻統計）、<code>stats.hits++</code>、
          <code>arr[i]++</code>、<code>retry.times++</code>，
          LeetCode 的計數類題目幾乎都會寫到。
        </p>
      </section>

      <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-7 dark:border-amber-900 dark:bg-amber-950/40">
        <h2 className="mb-2 font-semibold">為什麼這一節要放在這裡</h2>
        <p>
          因為「const 就是不能改」這個誤解，會直接生出 React 裡最難除錯的 bug。
        </p>
        <p>
          <code>const [todos, setTodos] = useState([])</code> 之後寫
          <code> todos.push(newItem)</code>——
          <b>完全合法，不會報任何錯</b>，因為那是改物件內容不是改綁定。
        </p>
        <p>
          但陣列的參考沒變，React 用 <code>Object.is</code> 一比發現是同一個，就直接跳過重新渲染。
          <b>資料改了，畫面沒動，而且 console 一片乾淨。</b>
        </p>
        <p>
          分清楚「鎖名字」與「鎖內容」，才看得懂那個 bug 為什麼會發生。
          這一段的延伸在 <Link href="/immutable-memory" className="text-sky-600 hover:underline">/immutable-memory</Link>。
        </p>
      </section>

      <p className="text-sm">
        下一步 →{' '}
        <Link href="/postfix-increment/02-postfix-old-value" className="text-sky-600 hover:underline">
          02　改成 let 也沒用，postfix 回傳的是舊值
        </Link>
      </p>
    </main>
  );
}
