// demo-04：React 裡處理 debounce 的三種寫法（這支是閱讀用，不能直接 node 執行）
import { useState, useRef, useEffect, useMemo, useCallback } from "react";

/* ======================================================================
   寫法 A：useRef 存 timer —— 最接近原生 JS 的心智模型
   適用：你要 debounce 的是「一個動作」而不是「一個值」，例如送出表單、上報埋點
   ====================================================================== */
function SearchBoxA() {
  const [keyword, setKeyword] = useState("");
  const timerRef = useRef(null);          // ← 這個盒子取代了閉包裡的 let timer

  const handleChange = (e) => {
    const value = e.target.value;         // ⚠️ 先取出來，別在非同步回呼裡讀 e.target
    setKeyword(value);

    clearTimeout(timerRef.current);       // 取消上一次還沒到期的計時器
    timerRef.current = setTimeout(() => {
      fetchResults(value);                // 真正昂貴的動作
    }, 300);
  };

  // ⚠️ 一定要有：元件被移除時把計時器清掉，否則會對已卸載的元件做事
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return <input value={keyword} onChange={handleChange} />;
}

/* ======================================================================
   寫法 B：自訂 useDebouncedValue hook —— ⭐ 最推薦
   關鍵洞察：useEffect 的 cleanup 函式在語意上「就是」clearTimeout
   value 一變 → React 先跑上一次的 cleanup（清掉舊 timer）→ 再跑新的 effect（排新 timer）
   這跟 debounce 的邏輯完全同構，所以你根本不需要自己管 timer
   ====================================================================== */
function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);        // ← cleanup 就是 clearTimeout
  }, [value, delay]);

  return debounced;
}

function SearchBoxB() {
  const [keyword, setKeyword] = useState("");       // 每次打字都更新 → input 不卡
  const debouncedKeyword = useDebouncedValue(keyword, 300);  // 安靜 300ms 才變

  useEffect(() => {
    if (!debouncedKeyword) return;
    const controller = new AbortController();
    fetchResults(debouncedKeyword, { signal: controller.signal });
    return () => controller.abort();      // 順手處理「舊請求比新請求晚回來」的競態問題
  }, [debouncedKeyword]);

  return <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />;
}

/* ======================================================================
   寫法 C：useMemo 包住 debounce 函式
   ⚠️ 陷阱：依賴陣列給空的話會產生 stale closure（函式永遠看到第一次 render 的 state）
   ====================================================================== */
function SearchBoxC({ userId }) {
  const [keyword, setKeyword] = useState("");

  const debouncedFetch = useMemo(
    () => debounce((kw) => fetchResults(kw, userId), 300),
    [userId]                              // userId 變了就重建（否則會用到舊的 userId）
  );

  useEffect(() => {
    return () => debouncedFetch.cancel?.();   // 換掉或卸載時取消排隊中的那次
  }, [debouncedFetch]);

  return (
    <input
      value={keyword}
      onChange={(e) => { setKeyword(e.target.value); debouncedFetch(e.target.value); }}
    />
  );
}

/* ======================================================================
   ❌ 反例：為什麼不能用 useState 存 timer
   ====================================================================== */
function SearchBoxBad() {
  const [timer, setTimer] = useState(null);

  const handleChange = (e) => {
    clearTimeout(timer);                  // ⚠️ 讀到的可能是上一輪 render 的舊值
    const id = setTimeout(() => fetchResults(e.target.value), 300);
    setTimer(id);                         // ⚠️ 每打一個字就多觸發一次 re-render，完全沒必要
  };

  return <input onChange={handleChange} />;
}

/* ======================================================================
   ❌ 反例：useDeferredValue 不是 debounce
   它是「低優先度渲染」，沒有固定的等待時間，也不會減少 fetch 次數
   適合：大量清單的重繪卡頓
   不適合：減少 API 呼叫次數
   ====================================================================== */
