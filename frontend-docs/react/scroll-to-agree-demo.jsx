'use client'
// 捲到底才能同意：兩種做法並排。筆記：捲到底才能同意-條款框-React做法.md
import { useEffect, useRef, useState } from 'react'

// 做法 A：onScroll + scrollTop 比較
export function ScrollToAgreeScroll({ children, onAgree, onDecline }) {
  // useRef(null) 建一個 { current: null } 的物件，跨 render 保持同一個。
  // <div ref={boxRef}> 掛上後，React 會把真實 DOM 節點放進 boxRef.current；
  // 改 .current 不會觸發重新渲染。
  const boxRef = useRef(null)
  const [reachedEnd, setReachedEnd] = useState(false)

  const check = () => {
    const el = boxRef.current // 條款框的真實 DOM 元素，才讀得到 scrollTop 等屬性
    if (!el) return // mount 前或 unmount 後 current 是 null
    // >= 而不是 ===：scrollTop 可能有小數，Safari 橡皮筋捲動還可能超過最大值
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
      setReachedEnd(true) // 只會設 true，不會設回 false（使用者捲回去不重鎖）
    }
  }

  // 條款短到不用捲時，載入當下就解鎖
  useEffect(() => {
    check()
  }, [])

  return (
    <div>
      <div
        ref={boxRef}
        onScroll={check} // onScroll 不會冒泡，要綁在捲動容器本身
        role="region"
        aria-label="服務條款"
        tabIndex={0} // 鍵盤使用者要能 Tab 進來用方向鍵捲動
        style={{ height: 320, overflowY: 'auto' }}
      >
        {children}
      </div>
      <button type="button" disabled={!reachedEnd} onClick={onAgree}>
        已閱讀並同意
      </button>
      <button type="button" onClick={onDecline}>
        不同意並取消註冊
      </button>
      {!reachedEnd && <p>請捲到條款最底部後才能同意</p>}
    </div>
  )
}

// 做法 B：IntersectionObserver 盯著容器最後面的 sentinel
export function ScrollToAgreeObserver({ children, onAgree, onDecline }) {
  const boxRef = useRef(null)
  const endRef = useRef(null)
  const [reachedEnd, setReachedEnd] = useState(false)

  useEffect(() => {
    const box = boxRef.current // 條款框的 DOM（捲動容器，當 IntersectionObserver 的 root）
    const end = endRef.current // 容器最後那個 1px sentinel 的 DOM（被觀察的對象）
    if (!box || !end) return

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReachedEnd(true)
          io.disconnect() // 解鎖後不用再觀察
        }
      },
      { root: box, threshold: 0 } // root 設成捲動容器，不是 viewport
    )
    io.observe(end) // observe 後 callback 會先跑一次：條款不用捲時會直接解鎖
    return () => io.disconnect()
  }, [])

  return (
    <div>
      <div
        ref={boxRef}
        role="region"
        aria-label="服務條款"
        tabIndex={0}
        style={{ height: 320, overflowY: 'auto' }}
      >
        {children}
        <div ref={endRef} style={{ height: 1 }} aria-hidden="true" />
      </div>
      <button type="button" disabled={!reachedEnd} onClick={onAgree}>
        已閱讀並同意
      </button>
      <button type="button" onClick={onDecline}>
        不同意並取消註冊
      </button>
      {!reachedEnd && <p>請捲到條款最底部後才能同意</p>}
    </div>
  )
}
