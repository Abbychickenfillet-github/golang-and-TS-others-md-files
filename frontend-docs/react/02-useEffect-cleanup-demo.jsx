/**
 * 02-useEffect-cleanup-demo.jsx
 * 搭配筆記：02-useEffect的setup清理函式-return一個函式而不是執行它.md
 *
 * 五個元件，由壞到好，最後一個專門用來觀察 setup 與 cleanup 的執行順序。
 * 貼進 CodeSandbox 或本地 Vite + React 專案即可跑。
 */

import { useState, useEffect, useRef } from 'react'

/* ------------------------------------------------------------------ */
/* ① 壞掉的版本：stale closure（過期閉包）                              */
/* ------------------------------------------------------------------ */
export function CounterBroken() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      // 這個回呼抓住的是「第一次 render」那組 count 綁定
      // 之後每次 render 都會建立一組全新的 count，但這裡抓的還是第一組
      console.log('[broken] count =', count) // 永遠是 0
      setCount(count + 1)                    // 永遠是 0 + 1
    }, 1000)

    // 只建立函式，沒有執行 clearInterval
    return () => clearInterval(id)
  }, []) // 依賴陣列說謊：明明用了 count 卻宣稱沒有依賴

  return <h1>{count}</h1>
}

/* ------------------------------------------------------------------ */
/* ② 錯誤示範：少寫箭頭，setup 當場就把計時器關掉了                      */
/* ------------------------------------------------------------------ */
export function CounterWrongReturn() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setCount(c => c + 1), 1000)

    // 這一行「立刻執行」clearInterval，然後把 undefined 回傳給 React
    // 結果：計時器根本沒機會跑，而且 React 以為你沒有清理邏輯
    return clearInterval(id) // ← 少了 () =>
  }, [])

  return <h1>{count}</h1>
}

/* ------------------------------------------------------------------ */
/* ③ 修法一：updater function（新值只依賴舊值時最乾淨）                  */
/* ------------------------------------------------------------------ */
export function CounterUpdater() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      // 不從自己的閉包讀 count，改讓 React 把最新值當引數 c 餵進來
      setCount(c => c + 1)
    }, 1000)
    return () => clearInterval(id)
  }, []) // 這裡的 [] 是誠實的：effect 內部真的沒有讀任何外部值

  return <h1>{count}</h1>
}

/* ------------------------------------------------------------------ */
/* ④ 修法二：誠實申報依賴（代價是計時器每秒重建，時間會漂移）             */
/* ------------------------------------------------------------------ */
export function CounterHonestDeps() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setCount(count + 1), 1000)
    return () => clearInterval(id)
  }, [count]) // count 一變就先跑 cleanup 關掉舊計時器，再用新舞台建一個新的

  return <h1>{count}</h1>
}

/* ------------------------------------------------------------------ */
/* ⑤ 修法三：useRef 當一個跨 render 都是同一個的長壽盒子                 */
/* ------------------------------------------------------------------ */
export function CounterRef() {
  const [count, setCount] = useState(0)
  const countRef = useRef(0)

  // 每次 render 都把最新值寫進「同一個」物件
  countRef.current = count

  useEffect(() => {
    const id = setInterval(() => {
      // 閉包抓住的是 countRef 這個物件的參考（位址），不是裡面的值
      // 所以每次讀 .current 都拿得到最新內容
      console.log('[ref] count =', countRef.current)
      setCount(countRef.current + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return <h1>{count}</h1>
}

/* ------------------------------------------------------------------ */
/* ⑥ 觀察版：把 setup 與 cleanup 的執行順序印出來                       */
/* ------------------------------------------------------------------ */
/**
 * 開發模式 + StrictMode 下，掛載時主控台會看到：
 *   setup   #1
 *   cleanup #1     ← React 故意多跑一輪，檢查你的 cleanup 有沒有寫對
 *   setup   #2
 *
 * 之後每次改變 delay，會看到：
 *   cleanup #n  →  setup #(n+1)
 * 永遠是「先關舊的，再開新的」，成對且交錯。
 */
let runId = 0

export function EffectOrderObserver({ delay = 1000 }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const myId = ++runId
    console.log(`setup   #${myId}  delay=${delay}`)

    const id = setInterval(() => setTick(t => t + 1), delay)

    return () => {
      console.log(`cleanup #${myId}  delay=${delay}`)
      clearInterval(id)
    }
  }, [delay])

  return <p>tick: {tick}</p>
}

/* ------------------------------------------------------------------ */
/* 附錄：證明「return 的是函式，不是執行結果」——不需要 React 也能驗    */
/* ------------------------------------------------------------------ */
export function proveItIsAFunction() {
  let executed = false

  function setup() {
    const id = 12345
    console.log('setup 開始')
    // 這一行只建立函式物件，下面的 executed 仍然是 false
    const cleanup = () => {
      executed = true
      console.log('cleanup 真的被執行了，id =', id)
    }
    console.log('setup 結束，executed =', executed) // false
    return cleanup
  }

  const fn = setup()
  console.log('typeof fn =', typeof fn)   // 'function'
  console.log('fn.name =', JSON.stringify(fn.name)) // "" 空字串，真的沒有名字
  console.log('executed（呼叫前）=', executed)      // false

  fn() // 到這一刻才真的執行
  console.log('executed（呼叫後）=', executed)      // true
}
