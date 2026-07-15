# 為什麼 localStorage 沒有看到data-theme

> Cursor · 2025-09-29 17:08 · `a62c1723-8394-4556-b9c8-c1e01af92b5a` · 26 則

## 你
為什麼 localStorage 沒有看到data-theme

## Cursor
Investigating why `data-theme` isn't in localStorage. Reviewing the theme toggle implementation.

## Cursor
`data-theme` 不會出現在 localStorage，因為它被寫在 `document.documentElement` 上，不是 localStorage。

- 第 12 行：`document.documentElement.setAttribute('data-theme', theme)` — 設定在 HTML 根元素
- 第 13 行：`localStorage.setItem('theme', theme)` — 寫入 localStorage 的 key 是 `'theme'`

在 DevTools 的 Application > Local Storage 中應看到 `theme`，而不是 `data-theme`。`data-theme` 可在 Elements 面板的 `<html>` 上查看。

## Cursor
## 總結

**localStorage 中不會有 `data-theme`**，因為：

1. **`data-theme`** 是 HTML 屬性，存在於 `<html>` 元素上
2. **`theme`** 才是 localStorage 的 key

在開發者工具中：
- **Elements 面板**：查看 `<html data-theme="green">` 或 `<html data-theme="pink">`
- **Application > Local Storage**：查看 `theme: "green"` 或 `theme: "pink"`

這是常見做法：用 localStorage 持久化主題，用 `data-theme` 讓 CSS 套用對應樣式。

## 你
第 12 行：document.documentElement.setAttribute('data-theme', theme) — 設定在 HTML 根元素

多講一點

## Cursor
## `document.documentElement.setAttribute('data-theme', theme)` 詳解

### 1. `document.documentElement` 是什麼？
```javascript
// document.documentElement 指向 HTML 文檔的根元素
console.log(document.documentElement) // <html> 元素
console.log(document.documentElement.tagName) // "HTML"
```

### 2. 實際效果
當執行 `document.documentElement.setAttribute('data-theme', 'green')` 時：

**HTML 結構變化：**
```html
<!-- 執行前 -->
<html lang="zh-TW">

<!-- 執行後 -->
<html lang="zh-TW" data-theme="green">
```

### 3. 為什麼要設定在根元素？
- 全域生效：所有子元素都能繼承
- CSS 選擇器可直接使用 `[data-theme="green"]` 或 `[data-theme="pink"]`
- 避免在每個元素上重複設定

### 4. CSS 如何使用這個屬性？
```css
/* 綠色主題 */
[data-theme="green"] {
  --primary-color: #28a745;
  --background-color: #000;
  --text-color: #fff;
}

/* 粉色主題 */
[data-theme="pink"] {
  --primary-color: #e91e63;
  --background-color: #1a1a1a;
  --text-color: #ff69b4;
}

/* 使用 CSS 變數 */
body {
  background-color: var(--background-color);
  color: var(--text-color);
}
```

### 5. 與 localStorage 的關係
```javascript
// 1. 從 localStorage 讀取主題
const savedTheme = localStorage.getItem('theme') || 'green'

// 2. 設定到 HTML 根元素
document.documentElement.setAttribute('data-theme', savedTheme)

// 3. 用戶切換主題時
const toggleTheme = (theme) => {
  // 同時更新兩個地方
  document.documentElement.setAttribute('data-theme', theme) // 立即生效
  localStorage.setItem('theme', theme) // 持久化保存
}
```

### 6. 實際應用場景
```javascript
// 檢查當前主題
const currentTheme = document.documentElement.getAttribute('data-theme')
console.log(currentTheme) // "green" 或 "pink"

// 動態切換主題
document.documentElement.setAttribute('data-theme', 'pink')

// 移除主題屬性
document.documentElement.removeAttribute('data-theme')
```

### 7. 為什麼不用 className？
```javascript
// 不推薦：使用 className
document.documentElement.className = 'theme-green'

// 推薦：使用 data 屬性
document.documentElement.setAttribute('data-theme', 'green')
```

**優點：**
- 語義更清楚
- 不與其他 class 衝突
- 更易於維護與擴展

### 8. 在開發者工具中查看
1. Elements 面板：查看 `<html data-theme="green">`
2. Console 面板：
   ```javascript
   document.documentElement.getAttribute('data-theme')
   // 返回當前主題值
   ```

### 9. 完整的流程
```javascript
// 頁面載入時
useEffect(() => {
  const savedTheme = localStorage.getItem('theme') || 'green'
  setCurrentTheme(savedTheme)
  document.documentElement.setAttribute('data-theme', savedTheme)
}, [])

// 用戶點擊切換時
const toggleTheme = (theme) => {
  setCurrentTheme(theme)                    // 更新 React 狀態
  document.documentElement.setAttribute('data-theme', theme) // 更新 DOM
  localStorage.setItem('theme', theme)      // 保存到本地存儲
}
```

此做法讓主題切換即時生效，並在重新載入後保持設定。

## 你
nsole.log(document.documentElement.tagName)  這邊沒有寫tagName？

## Cursor
## 關於 `tagName` 的說明

### 1. 什麼是 `tagName`？
`tagName` 是 DOM 元素的屬性，返回元素的標籤名稱（大寫）。

```javascript
// 在瀏覽器 Console 中測試
console.log(document.documentElement.tagName) // "HTML"
console.log(document.body.tagName) // "BODY"
console.log(document.querySelector('div').tagName) // "DIV"
```

### 2. 為什麼你的代碼中沒有 `tagName`？
你的代碼中沒有使用 `tagName`，因為：
- 你直接操作 `document.documentElement`，不需要檢查標籤名稱
- 你只關心設定 `data-theme` 屬性，不關心元素類型

### 3. 實際的 DOM 操作
```javascript
// 你的代碼（第 12 行）
document.documentElement.setAttribute('data-theme', theme)

// 等價於
document.querySelector('html').setAttribute('data-theme', theme)

// 或者
document.getElementsByTagName('html')[0].setAttribute('data-theme', theme)
```

### 4. 什麼時候會用到 `tagName`？
```javascript
// 檢查元素類型
function handleClick(element) {
  if (element.tagName === 'BUTTON') {
    console.log('這是一個按鈕')
  } else if (element.tagName === 'DIV') {
    console.log('這是一個 div')
  }
}

// 遍歷所有子元素
document.querySelectorAll('*').forEach(element => {
  console.log(`元素: ${element.tagName}`)
})
```

### 5. 你的代碼的實際效果
```javascript
// 執行前
console.log(document.documentElement.tagName) // "HTML"
console.log(document.documentElement.getAttribute('data-theme')) // null

// 執行後
document.documentElement.setAttribute('data-theme', 'green')
console.log(document.documentElement.tagName) // "HTML" (不變)
console.log(document.documentElement.getAttribute('data-theme')) // "green"
```

### 6. 完整的 HTML 結構變化
```html
<!-- 執行前 -->
<html lang="zh-TW">

<!-- 執行後 -->
<html lang="zh-TW" data-theme="green">
```

### 7. 在開發者工具中驗證
1. 打開 Elements 面板
2. 查看 `<html>` 元素
3. 切換主題後，觀察 `data-theme` 屬性的變化

### 8. 為什麼選擇 `document.documentElement`？
```javascript
// 最直接的方式
document.documentElement.setAttribute('data-theme', theme)

// 其他方式（較複雜）
document.querySelector('html').setAttribute('data-theme', theme)
document.getElementsByTagName('html')[0].setAttribute('data-theme', theme)
```

**優點：**
- 直接指向根元素
- 不需要查詢
- 效能較好
- 程式碼簡潔

### 9. 實際測試
在瀏覽器 Console 中執行：
```javascript
// 查看當前主題
console.log(document.documentElement.getAttribute('data-theme'))

// 切換主題
document.documentElement.setAttribute('data-theme', 'pink')

// 再次查看
console.log(document.documentElement.getAttribute('data-theme'))
```

**總結：** 你的代碼不需要 `tagName`，因為你直接操作根元素並設定屬性，無需檢查元素類型。

## 你
那為什麼這邊又有 localStorage.getItem('theme')

## Cursor
## 為什麼需要 `localStorage.getItem('theme')`？

### 1. 兩個不同的用途

```javascript
// 第 19 行：從 localStorage 讀取
const savedTheme = localStorage.getItem('theme') || 'green'

// 第 13 行：寫入 localStorage
localStorage.setItem('theme', theme)
```

### 2. 讀取 vs 寫入

**讀取（第 19 行）：**
```javascript
const savedTheme = localStorage.getItem('theme') || 'green'
```
- 目的：恢復用戶之前的主題設定
- 時機：頁面載入時
- 作用：從本地存儲讀取已保存的主題

**寫入（第 13 行）：**
```javascript
localStorage.setItem('theme', theme)
```
- 目的：保存用戶選擇的主題
- 時機：用戶點擊切換主題時
- 作用：將新主題寫入本地存儲

### 3. 完整的流程

```javascript
// 1. 頁面載入時（useEffect）
useEffect(() => {
  // 從 localStorage 讀取之前保存的主題
  const savedTheme = localStorage.getItem('theme') || 'green'
  
  // 設定到 React 狀態
  setCurrentTheme(savedTheme)
  
  // 設定到 HTML 根元素
  document.documentElement.setAttribute('data-theme', savedTheme)
}, [])

// 2. 用戶點擊切換時（toggleTheme）
const toggleTheme = (theme) => {
  // 更新 React 狀態
  setCurrentTheme(theme)
  
  // 更新 HTML 根元素
  document.documentElement.setAttribute('data-theme', theme)
  
  // 保存到 localStorage
  localStorage.setItem('theme', theme)
}
```

### 4. 為什麼需要持久化？

**沒有 localStorage 的情況：**
```javascript
// 用戶選擇了粉色主題
document.documentElement.setAttribute('data-theme', 'pink')

// 用戶重新整理頁面
// 結果：主題回到預設的綠色，用戶的選擇丟失了！
```

**有 localStorage 的情況：**
```javascript
// 用戶選擇了粉色主題
localStorage.setItem('theme', 'pink')
document.documentElement.setAttribute('data-theme', 'pink')

// 用戶重新整理頁面
const savedTheme = localStorage.getItem('theme') || 'green' // 讀取到 'pink'
document.documentElement.setAttribute('data-theme', savedTheme) // 保持粉色主題
```

### 5. 實際測試

在瀏覽器 Console 中測試：

```javascript
// 1. 檢查當前保存的主題
console.log(localStorage.getItem('theme'))

// 2. 手動保存主題
localStorage.setItem('theme', 'pink')

// 3. 重新整理頁面，觀察主題是否保持

// 4. 清除保存的主題
localStorage.removeItem('theme')

// 5. 重新整理頁面，觀察是否回到預設主題
```

### 6. 三個層級的同步

```javascript
// 1. React 狀態層
const [currentTheme, setCurrentTheme] = useState('green')

// 2. DOM 屬性層
document.documentElement.setAttribute('data-theme', theme)

// 3. 持久化存儲層
localStorage.setItem('theme', theme)
```

**為什麼需要三個層級？**
- React 狀態：控制 UI 顯示
- DOM 屬性：控制 CSS 樣式
- localStorage：持久化用戶選擇

### 7. 完整的用戶體驗

```javascript
// 第一次訪問
// localStorage.getItem('theme') 返回 null
// 使用預設值 'green'

// 用戶切換到粉色主題
// localStorage.setItem('theme', 'pink') 保存選擇

// 用戶重新整理頁面
// localStorage.getItem('theme') 返回 'pink'
// 主題保持粉色

// 用戶關閉瀏覽器，幾天後重新訪問
// localStorage.getItem('theme') 仍然返回 'pink'
// 主題依然是粉色
```

### 8. 錯誤處理

```javascript
const savedTheme = localStorage.getItem('theme') || 'green'
```

**`|| 'green'` 的作用：**
- 如果 localStorage 中沒有 'theme'，返回 `null`
- `null || 'green'` 會使用預設值 'green'
- 確保總是有有效的主題值

**總結：** `localStorage.getItem('theme')` 用於讀取用戶之前保存的主題設定，讓主題在頁面重新載入後保持不變。

## 你
為什˙麼我剛剛點擊了GreenTheme 
localStorage沒有東西
是不是這邊的執行邏輯根本不是靠components/theme-toggle/index.js控制的？

## Cursor
檢查主題切換的實際執行邏輯，確認是否由 `components/theme-toggle/index.js` 控制。

## Cursor
## 問題分析

### 1. 實際情況
- 你看到的 "GREEN THEME" 和 "PINK THEME" 按鈕不在 `app/user/register/page.js`。
- 它們來自 `components/theme-toggle/index.js`，並透過 `components/top-navbar/index.js` 渲染。

### 2. 按鈕位置
```javascript
// components/top-navbar/index.js (第 43-45 行)
<div className={styles.themeToggleContainer}>
  <ThemeToggle />
</div>
```

### 3. 為什麼 localStorage 沒有內容？
可能原因：
1. 組件未正確載入
2. JavaScript 錯誤導致事件未觸發
3. 瀏覽器阻擋 localStorage
4. 組件被其他樣式覆蓋

### 4. 檢查方法
在瀏覽器 Console 執行：
```javascript
// 1. 檢查 ThemeToggle 組件是否載入
console.log(document.querySelector('.themeToggle'))

// 2. 檢查按鈕是否存在
console.log(document.querySelectorAll('[class*="themeButton"]'))

// 3. 手動測試 localStorage
localStorage.setItem('test', 'hello')
console.log(localStorage.getItem('test'))

// 4. 手動測試主題切換
document.documentElement.setAttribute('data-theme', 'pink')
localStorage.setItem('theme', 'pink')
```

### 5. 可能的解決方案
1. 檢查 Console 是否有錯誤
2. 確認按鈕可點擊（未被覆蓋）
3. 檢查 localStorage 是否被阻擋
4. 確認組件正確載入

### 6. 驗證組件是否工作
```javascript
// 在 Console 中執行
const themeToggle = document.querySelector('.themeToggle')
if (themeToggle) {
  console.log('ThemeToggle 組件已載入')
} else {
  console.log('ThemeToggle 組件未找到')
}
```

**總結：** 按鈕由 `components/theme-toggle/index.js` 控制，但可能因載入或執行問題未寫入 localStorage。請先檢查 Console 錯誤與組件載入狀態。

## 你
我這樣增加調適訊息 line 13-16 對嗎

這是console結果但所以呢

## Cursor
## 調試訊息分析

### 1. 你的調試訊息是正確的
```javascript
if(theme){
  console.log(`🚀 設定在 HTML 根元素，屬性data-theme，屬性值${theme}`)
}
```
這個調試訊息可以幫助你確認：
- `toggleTheme` 函數是否被調用
- 傳入的 `theme` 參數值是什麼

### 2. Console 結果分析
從你的 Console 結果可以看到：
- `document.querySelector('.themeToggle')` 返回 `null` — 找不到容器
- `document.querySelectorAll('[class*="themeButton"]')` 返回 `NodeList(2)` — 找到兩個按鈕

### 3. 問題所在
按鈕存在，但容器類名可能不同。實際的類名是：
```
button.theme-toggle_themeButton_Rbgry.theme-toggle_green_vHunn.theme-toggle_active_vPgWA
button.theme-toggle_themeButton_Rbgry.theme-toggle_pink_u2CbG
```

### 4. 測試方法
在 Console 中執行：
```javascript
// 1. 檢查按鈕點擊事件
const buttons = document.querySelectorAll('[class*="themeButton"]')
console.log('找到按鈕數量:', buttons.length)

// 2. 手動觸發點擊事件
buttons[0].click() // 點擊第一個按鈕（綠色）

// 3. 檢查是否有調試訊息出現
// 如果看到 "🚀 設定在 HTML 根元素，屬性data-theme，屬性值green"
// 說明函數正常執行

// 4. 檢查 localStorage
console.log('localStorage theme:', localStorage.getItem('theme'))

// 5. 檢查 HTML 屬性
console.log('HTML data-theme:', document.documentElement.getAttribute('data-theme'))
```

### 5. 可能的問題
1. 按鈕點擊事件未綁定
2. 函數執行但 localStorage 被阻擋
3. 瀏覽器安全策略限制

### 6. 建議的調試步驟
1. 點擊按鈕，確認是否出現調試訊息
2. 若無訊息，檢查 Console 是否有錯誤
3. 手動執行 `buttons[0].click()` 測試
4. 檢查 localStorage 是否被阻擋

**總結：** 調試訊息是正確的。先確認點擊按鈕時是否出現該訊息，以判斷問題出在事件綁定還是 localStorage。

## Cursor
## 問題已解決

### 1. 調試結果
- 找到按鈕數量: 2
- localStorage theme: green
- HTML data-theme: green

### 2. 結論
- 主題切換邏輯正常
- localStorage 正常
- HTML 屬性設定正常

### 3. 原因
- 檢查了 `data-theme` 而非 `theme`
- 在 Application > Local Storage 中查看，而非 Console

### 4. 正確的檢查方式
```javascript
// 在 Console 中檢查
console.log(localStorage.getItem('theme')) // 返回 "green"

// 在 Application > Local Storage 中查看
// 應該看到 key: "theme", value: "green"
```

### 5. 調試訊息的作用
```javascript
if(theme){
  console.log(`🚀 設定在 HTML 根元素，屬性data-theme，屬性值${theme}`)
}
```
- 確認函數被調用
- 確認參數值正確
- 確認執行流程

### 6. 總結
- 主題切換功能正常
- localStorage 正常
- 問題在於檢查方式
- 調試訊息有助於確認執行流程

**建議：** 保留調試訊息，便於後續排查。

## 你
我看到了啦因為我剛剛沒有打開toggle!所以在application/storage/local storage才沒有看到

## Cursor
## 問題已解決

### 1. 原因
- 之前未點擊主題切換按鈕
- 未觸發 `toggleTheme`，localStorage 沒有寫入
- 在 Application > Local Storage 看不到 `theme` 是正常的

### 2. 現在的情況
- 已點擊 "GREEN THEME" 按鈕
- localStorage 出現 `theme: "green"`
- HTML 的 `data-theme` 已設定為 `"green"`

### 3. 流程
```javascript
// 1. 用戶點擊按鈕
onClick={() => toggleTheme('green')}

// 2. 執行 toggleTheme 函數
const toggleTheme = useCallback((theme) => {
  setCurrentTheme(theme)                                    // 更新 React 狀態
  document.documentElement.setAttribute('data-theme', theme) // 設定 HTML 屬性
  localStorage.setItem('theme', theme)                      // 保存到 localStorage
}, [])
```

### 4. 調試訊息的作用
```javascript
if(theme){
  console.log(`🚀 設定在 HTML 根元素，屬性data-theme，屬性值${theme}`)
}
```
- 確認函數被調用
- 確認參數值正確
- 確認執行流程

### 5. 總結
- 主題切換功能正常
- localStorage 正常
- 問題在於未點擊按鈕
- 調試訊息有助於確認執行流程

**建議：** 保留調試訊息，便於後續排查。

## 你
幫我修一下

## Cursor
## 修正完成

### 1. 問題
- 註解語法錯誤：`{/* 上面css是設定top 0, right 0, 那為什麼還是貼左邊？不是應該貼右邊嗎` 未正確關閉

### 2. 修正
- 移除該註解

### 3. 關於 CSS 定位
```css
.themeToggleContainer {
  position: absolute;
  top: 8px;
  right: 20px;
  z-index: 1001;
}
```
- `position: absolute` 相對父元素定位
- `top: 8px` 距頂部 8px
- `right: 20px` 距右側 20px
- 主題切換按鈕會顯示在右上角

### 4. 為什麼看起來在左邊？
- 父元素 `.topnav` 的 `position: relative` 提供定位基準
- 若父元素寬度不足或樣式衝突，可能影響視覺位置

### 5. 檢查方法
在開發者工具中檢查：
```javascript
// 檢查主題切換容器位置
const container = document.querySelector('.themeToggleContainer')
console.log(container.getBoundingClientRect())
```

**總結：** 已移除錯誤註解，主題切換按鈕應顯示在右上角。

## 你
可是我看top-navbar套件並沒有使用到themeToggleContainer類別名稱呀

## Cursor
## 分析

### 1. 實際情況
- 第 43 行：`<div className={styles.themeToggleContainer}>`
- 第 44 行：`<ThemeToggle />`

### 2. 為什麼看起來沒有使用？
- `styles.themeToggleContainer` 是 CSS Modules 的類名
- 編譯後會變成類似 `themeToggleContainer_abc123` 的哈希類名
- 在開發者工具中看到的是編譯後的類名，不是原始名稱

### 3. 檢查方法
在瀏覽器 Console 中執行：
```javascript
// 檢查主題切換容器
const container = document.querySelector('[class*="themeToggleContainer"]')
console.log('容器:', container)

// 檢查 CSS 類名
const themeToggle = document.querySelector('[class*="themeToggle"]')
console.log('主題切換組件:', themeToggle)
```

### 4. CSS Modules 的工作原理
```javascript
// 原始代碼
className={styles.themeToggleContainer}

// 編譯後
className="top-navbar_themeToggleContainer_abc123"
```

### 5. 驗證
- 在 Elements 面板查看 `<div>` 的 `class` 屬性
- 應包含 `themeToggleContainer` 的哈希版本
- 例如：`top-navbar_themeToggleContainer_abc123`

**總結：** `themeToggleContainer` 有在使用，只是 CSS Modules 會把類名編譯成哈希值，在開發者工具中看起來不同。

## 你
編譯後的類名我了解
'[class*="themeToggleContainer"]'是什麼寫法？

## Cursor
## `[class*="themeToggleContainer"]` 說明

### 1. 這是 CSS 屬性選擇器
```css
[class*="themeToggleContainer"]
```
- `[]` 屬性選擇器
- `class` 屬性名
- `*=` 包含匹配
- `"themeToggleContainer"` 要匹配的字串

### 2. 匹配規則
會匹配 class 屬性中包含 `"themeToggleContainer"` 的元素：

```html
<!-- 會匹配 -->
<div class="top-navbar_themeToggleContainer_abc123">
<div class="themeToggleContainer">
<div class="my-themeToggleContainer-other">

<!-- 不會匹配 -->
<div class="themeToggle">
<div class="container">
```

### 3. 其他屬性選擇器
```css
/* 完全匹配 */
[class="themeToggleContainer"]

/* 開頭匹配 */
[class^="themeToggle"]

/* 結尾匹配 */
[class$="Container"]

/* 包含匹配 */
[class*="themeToggle"]
```

### 4. 為什麼用這種寫法？
```javascript
// 在 Console 中查找
document.querySelector('[class*="themeToggleContainer"]')
```
- 避免依賴編譯後的哈希類名
- 只要包含 `themeToggleContainer` 就能找到
- 不受 CSS Modules 影響

### 5. 實際應用
```javascript
// 查找主題切換容器
const container = document.querySelector('[class*="themeToggleContainer"]')

// 查找所有主題按鈕
const buttons = document.querySelectorAll('[class*="themeButton"]')

// 查找包含特定文字的類名
const elements = document.querySelectorAll('[class*="theme"]')
```

### 6. 等價的 jQuery 寫法
```javascript
// jQuery
$('[class*="themeToggleContainer"]')

// 原生 JavaScript
document.querySelector('[class*="themeToggleContainer"]')
```

**總結：** `[class*="themeToggleContainer"]` 是 CSS 屬性選擇器，用來匹配 class 屬性中包含指定字串的元素，適合在 CSS Modules 環境中查找元素。

## 你
settings.json esbenp是什麼問題

## Cursor
## `esbenp.prettier-vscode` 說明

### 1. 這是什麼？
- **`esbenp.prettier-vscode`** 是 VS Code 的 Prettier 擴展 ID
- **`esbenp`** 是作者名稱（Esben Petersen）
- **`prettier-vscode`** 是擴展名稱

### 2. 作用
```json
"editor.defaultFormatter": "esbenp.prettier-vscode"
```
- 將 Prettier 設為預設格式化工具
- 自動格式化 JavaScript、TypeScript、CSS、SCSS 等

### 3. 為什麼用這個？
- 官方推薦的 Prettier 擴展
- 支援多種語言
- 與 VS Code 整合良好

### 4. 如何安裝？
1. 打開 VS Code
2. 按 `Ctrl+Shift+X` 打開擴展面板
3. 搜尋 "Prettier - Code formatter"
4. 安裝由 Esben Petersen 發布的版本

### 5. 檢查是否已安裝
```bash
# 在 VS Code 終端中檢查
code --list-extensions | grep prettier
```

### 6. 如果沒有安裝會怎樣？
- 格式化可能不生效
- 可能出現錯誤訊息
- 需要手動安裝擴展

### 7. 替代方案
```json
// 如果沒有 Prettier，可以使用其他格式化工具
"editor.defaultFormatter": "vscode.typescript-language-features"
```

**總結：** `esbenp.prettier-vscode` 是 Prettier 的 VS Code 擴展 ID，用於自動格式化代碼。如果沒有安裝，請在 VS Code 中安裝 "Prettier - Code formatter" 擴展。
