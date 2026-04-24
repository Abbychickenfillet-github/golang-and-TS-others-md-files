# ref.current 與 e.target 筆記

## 一、三兄弟對照表（最容易搞混）

| 名稱 | 白話 | 誰決定 |
|---|---|---|
| `ref.current` | 我手動綁的元素（例如選單本人） | 我（React） |
| `e.target` | 滑鼠真的戳到的最內層元素 | 瀏覽器 |
| `e.currentTarget` | 事件綁在誰身上（不管點到哪個子元素都不變） | 瀏覽器 |

※ 範例：
```jsx
<div onClick={e => {
  e.target         // 點到哪個就是哪個（可能是子元素 <span>）
  e.currentTarget  // 永遠是 <div>（事件掛在這）
}}>
  <span>點我</span>
</div>
```

---

## 二、useRef 怎麼用

```jsx
const ref = useRef(null);     // ── 建立一個箱子 { current: null }

<div ref={ref} onClick={handleClick}>內容</div>
//     ↑ React 把這個 <div> 塞進箱子 → ref.current = <div>
```

### 為什麼用 const？
- `useRef` 回傳的是「箱子物件」 `{ current: ... }`
- 會變的是 **箱子裡面的 `.current`**，不是箱子本身
- 外層變數用 `const` 鎖死 → 避免手滑重新指派，React 抓不到

### ref 變數名可以自己取
```jsx
const menuRef  = useRef(null);   // 有多個 ref 時取有意義的名字
const inputRef = useRef(null);

<div   ref={menuRef} />
<input ref={inputRef} />
```
`ref={...}` 裡面放「你的變數名」，不一定要叫 `ref`。

---

## 三、經典用途：點擊外部關閉

```jsx
const menuRef = useRef(null);

useEffect(() => {
  const handleClick = (e) => {
    // ※ 重點：外部是「反推」出來的
    // ref.current = 選單裡面
    // !contains(e.target) = 點擊不在選單裡 → 就是外部
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setOpen(false);
    }
  };
  document.addEventListener('click', handleClick);   // ── 監聽整個頁面
  return () => document.removeEventListener('click', handleClick);
}, []);

return <div ref={menuRef}>選單內容</div>;
```

### 邏輯拆解
1. `ref.current` 綁在「選單本人」（裡面）
2. `ref.current.contains(e.target)` = 問「點擊位置在選單裡嗎？」
3. 加 `!` 反過來 = 「不在選單裡嗎？」
4. 不在裡面 = 就是外面 → 關掉

### 為什麼不直接標記「外部」？
- 全世界這麼多元素，一個一個綁不可能
- 所以用「白名單反推法」：只標記「內部」，剩下通通算「外部」
- **外部 = 全世界 − 內部**

---

## 四、React 味 vs Vanilla 味（混血寫法）

```js
if (ref.current && !ref.current.contains(e.target as Node)) {
//      ↑React包裝          ↑React包裝    ↑原生DOM方法 ↑原生DOM事件
//    (useRef)            (useRef)      (vanilla)    (vanilla)
}
```

- `ref` / `.current` → React 的包裝（useRef 專屬）
- `.contains()` → 原生 DOM 方法（所有元素都有）
- `e.target` → 原生 DOM 事件物件

※ React 的 ref 設計本意就是「讓你安全地拿到原生 DOM 元素，再用 vanilla API 操作它」。

---

## 五、類比記憶（攝影機比喻）

- **`ref.current`** = 自己裝好、對著沙發的攝影機 📹  
  → 固定不會亂跑，自己決定監視誰
- **`e.target`** = 觸發警報的那個東西 🚨  
  → 每次事件發生時瀏覽器告訴你「這次是誰」

兩個必須一起用才有意義：
- 只有 `ref.current` → 知道誰要被監視，但不知道使用者點哪
- 只有 `e.target` → 知道使用者點哪，但不知道比較對象

---

## 六、重點結論

1. `useRef` 用 `const` 宣告 —— 鎖住箱子本身，裡面的 `.current` 才是會變的
2. `ref={xxx}` 的 `xxx` 變數名自己取，`menuRef`、`inputRef` 更清楚
3. 「點擊外部關閉」的外部是靠 `!contains()` 反推，不需要也不可能直接標記外部
4. React 的 ref 拿到的仍是原生 DOM 元素，後續方法都用 vanilla 的
