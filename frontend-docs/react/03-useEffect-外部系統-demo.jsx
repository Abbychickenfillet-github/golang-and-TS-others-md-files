/**
 * 03-useEffect-外部系統-demo.jsx
 * 搭配筆記：03-useEffect將元件同步到外部系統-Web-API與DOM.md
 *
 * 四個元件各連接一種外部系統，每個都是 setup 連上、cleanup 斷開的鏡像。
 * 貼進 CodeSandbox 或本地 Vite + React 專案即可跑，開啟 StrictMode 可在主控台觀察 setup → cleanup → setup。
 */

import { useState, useEffect, useRef } from 'react'

/* ① Web API：計時器（setInterval 與 clearInterval） */
export function Timer() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    console.log('[timer] setup：開始計時')
    const id = setInterval(() => setCount(c => c + 1), 1000) // c => c + 1 讓 count 不必進 deps
    return () => {
      console.log('[timer] cleanup：停止計時')
      clearInterval(id)
    }
  }, [])

  return <h1>{count}</h1>
}

/* ② Web API：全域事件（window 的 pointermove） */
export function PointerDot() {
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    function handleMove(e) {
      setPos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('pointermove', handleMove)
    return () => window.removeEventListener('pointermove', handleMove)
  }, [])

  return (
    <div
      style={{
        position: 'absolute', left: -20, top: -20, width: 40, height: 40,
        borderRadius: '50%', background: 'pink', opacity: 0.6, pointerEvents: 'none',
        transform: `translate(${pos.x}px, ${pos.y}px)`,
      }}
    />
  )
}

/* ③ DOM：IntersectionObserver（需要 useRef 拿到真正的 DOM node） */
export function VisibleBox() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const div = ref.current // commit 之後 Effect 才跑，此時 ref.current 已經是 DOM node
    const observer = new IntersectionObserver(
      entries => setVisible(entries[0].isIntersecting),
      { threshold: 1.0 },
    )
    observer.observe(div)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ height: 100, width: 100, margin: 20, border: '2px solid black',
               background: visible ? 'green' : 'blue' }}
    />
  )
}

/* ④ DOM：<dialog> 的 showModal 與 close（依賴 isOpen 變動就重新同步） */
export function ModalDialog({ isOpen, children }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const dialog = ref.current // 先存進區域變數，避免 cleanup 時 ref.current 已經不同
    dialog.showModal()
    return () => dialog.close()
  }, [isOpen])

  return <dialog ref={ref}>{children}</dialog>
}

/* ⑤ 對照組：沒寫 cleanup 的壞版本，在 StrictMode 開發模式下計數會每秒加 2
 * 原因：setup → cleanup(沒有) → setup，兩個計時器同時在跑 */
export function TimerNoCleanup() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setInterval(() => setCount(c => c + 1), 1000) // 沒存 id，也沒有 return cleanup
  }, [])

  return <h1>{count}</h1>
}
