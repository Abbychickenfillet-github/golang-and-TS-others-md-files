# PDF 下載功能 Debug 全記錄：從 html2pdf.js 到 window.print()

> **關聯筆記**：[digital-book-implementation-plan.md](../plan/digital-book-implementation-plan.md) — Phase 8 踩坑紀錄
> **GitHub Issue（含截圖）**：https://github.com/yutuo-tech/future_sign.official-website/issues/86

### 截圖

**oklch 錯誤畫面**：

![oklch error screenshot](https://github.com/user-attachments/assets/b8662f35-e5a7-4d37-8366-c623269068a8)

**window.print() 方案成功畫面**：

![window.print success screenshot](https://github.com/user-attachments/assets/85e630f4-6fb0-4758-b94b-9f5e95368b42)

---

## 結論先講

**html2pdf.js 在使用 Tailwind CSS v4 的專案中無法正常運作**，經過 5 次嘗試修復都失敗，最終放棄 html2pdf.js，改用瀏覽器原生 `window.open()` + `document.write()` + `window.print()` 方案，一次成功。

---

## 實驗紀錄表

| # | 嘗試方案 | 改了什麼 | 結果 | 為什麼失敗 |
|---|---------|---------|------|-----------|
| 1 | `<button>` 放在 `<Link>` 裡面 | 在 button 加 `e.preventDefault()` + `e.stopPropagation()` | ❌ 點擊沒反應，API 沒觸發 | React Router 的 `<Link>` 攔截了所有子元素的 click 事件 |
| 2 | `<button>` 和 `<Link>` 改為同層級 siblings | 用 `<div>` 包裝，button 和 Link 並排 | ✅ API 觸發了，但 Console 報 oklch 錯誤 | html2canvas 不支援 `oklch()` CSS 顏色函式 |
| 3 | 改用 bundled 版本 html2pdf.js | `import('html2pdf.js/dist/html2pdf.bundle.min.js')` | ❌ 同樣的 oklch 錯誤 | bundled 只是把 html2canvas + jsPDF 打包在一起，html2canvas 本身還是不支援 oklch |
| 4 | onclone 裡移除所有 stylesheet | `clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => el.remove())` | ❌ PDF 下載成功但**內容空白**（沒有文字也沒有圖片） | 移除所有 CSS 後，html2canvas 失去渲染資訊 |
| 5 | opacity:0 隱藏 + oklch 替換為 #000 + onclone 還原 opacity | 三管齊下修復 | ❌ PDF 仍然空白 | html2pdf 內部 clone 流程複雜，opacity 還原沒有正確覆蓋到 html2pdf 自己 clone 的副本 |
| 6 | **放棄 html2pdf.js，改用 `window.open()` + `window.print()`** | 完全重寫 `generateHandbookPdf.ts` | ✅ **成功！** 內容完整顯示，可存為 PDF | 瀏覽器原生列印引擎支援所有 CSS，不需要第三方解析器 |

---

## 每次嘗試的詳細記錄

### 嘗試 1：Button 放在 Link 裡面（失敗）

**現象**：點擊下載 icon 完全沒反應，Network tab 沒有 API 請求

**程式碼**：
```tsx
<Link to={`/event/${eventId}/handbook/${handbook.id}`}>
  <button onClick={async (e) => {
    e.preventDefault()      // 嘗試阻止 Link 導航
    e.stopPropagation()     // 嘗試阻止事件冒泡
    // ... 下載邏輯
  }}>
    <Download />
  </button>
</Link>
```

**原因**：React Router 的 `<Link>` 組件在內部用 `onClick` 處理導航。即使子元素 `<button>` 呼叫了 `e.stopPropagation()`，React 的合成事件系統在 `<Link>` 層級已經處理了 click，導致 button 的 handler 根本不會執行（或執行後頁面已跳轉）。

**修正**：把 `<button>` 和 `<Link>` 拆成 siblings（同級元素），用 `<div>` 包裝。

---

### 嘗試 2：Button 和 Link 同級（API 成功，oklch 錯誤）

**現象**：Network tab 出現 API 請求，但 Console 報錯：
```
Error: Attempting to parse an unsupported color function "oklch"
```

**原因**：html2pdf.js 內部使用 html2canvas 來把 DOM 轉成 Canvas 圖片。html2canvas 有自己的 **CSS 解析器**（用 JavaScript 寫的，不是瀏覽器的 CSS 引擎）。這個解析器不認識 `oklch()` 顏色函式。

Tailwind CSS v4 預設用 oklch 定義所有顏色。html2canvas 在 clone DOM 時會連帶 clone 整個頁面的 `<style>` 標籤，然後嘗試解析裡面所有 CSS 規則，遇到 `oklch(...)` 就 crash。

---

### 嘗試 3：改用 bundled 版本（失敗）

**改動**：
```typescript
// 之前：用 package.json 的 main 入口（非 bundled，用 require 載入 html2canvas）
const html2pdf = (await import('html2pdf.js')).default

// 之後：直接用 bundled 版本（html2canvas + jsPDF 打包在一起）
const mod = await import('html2pdf.js/dist/html2pdf.bundle.min.js')
const html2pdf = mod.default ?? mod
```

**為什麼沒用**：bundled vs non-bundled 只是「依賴怎麼載入」的差別。bundled 版本把 html2canvas 的程式碼內嵌進去，但 html2canvas 本身的 CSS 解析器還是同一套，照樣不支援 oklch。

**bundled 的意思**：
- **非 bundled**（`dist/html2pdf.js`）：檔案裡寫 `require("html2canvas")`，依賴需要另外安裝
- **bundled**（`dist/html2pdf.bundle.min.js`）：html2canvas 和 jsPDF 的程式碼**打包在同一個檔案裡**，不需要另外安裝
- 本質上跑的是同一套程式碼，只是載入方式不同

---

### 嘗試 4：onclone 裡移除所有 stylesheet（PDF 空白）

**改動**：
```typescript
html2canvas: {
  onclone: (clonedDoc: Document) => {
    clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => el.remove())
  },
},
```

**什麼是 onclone？**

`onclone` 是 **html2canvas 套件的 callback 選項**，不是原生 JS。

html2canvas 的工作流程：
1. 接收一個 DOM 元素
2. **Clone（複製）整個 document**（包含所有 HTML + CSS）
3. 在 clone 上讀取每個元素的 CSS 屬性
4. 用 Canvas API 畫出來

`onclone` 讓你在**步驟 2 和 3 之間**插入修改：clone 已經建好，但還沒開始畫。你可以在這裡修改 clone 的 CSS。

```typescript
onclone: (clonedDoc: Document) => {
  // clonedDoc 是「複製出來的整個 HTML 文件」
  // 你在這裡的修改只影響 clone，不影響使用者看到的原始頁面
}
```

**為什麼空白？** 移除所有 `<style>` 和 `<link>` 後，html2canvas 的 clone 裡沒有任何 CSS。雖然我們的 PDF 容器用 inline style，但 html2canvas 的渲染引擎可能還是需要某些基礎 CSS 資訊才能正確計算元素尺寸和位置。

---

### 嘗試 5：三管齊下（PDF 仍然空白）

**改動一：opacity: 0 取代 left: -9999px**
```typescript
// 之前：把容器移到畫面外
container.style.left = '-9999px'

// 之後：容器留在畫面內但看不見
container.style.opacity = '0'        // 透明
container.style.zIndex = '-9999'     // 放在最底層
container.style.pointerEvents = 'none' // 不會擋到滑鼠
```

**opacity 是什麼？**
- `opacity: 0` = 完全透明（元素存在、佔空間，但看不見）
- `opacity: 1` = 完全不透明（正常顯示）
- 為什麼不用 `left: -9999px`？因為 html2canvas 在渲染時是用座標計算的，元素在 -9999px 的位置，html2canvas 可能會畫在可視區域之外，導致空白

**改動二：oklch 替換為 #000 而非移除整個 stylesheet**
```typescript
clonedDoc.querySelectorAll('style').forEach(styleEl => {
  if (styleEl.textContent?.includes('oklch')) {
    styleEl.textContent = styleEl.textContent.replace(/oklch\([^)]*\)/g, '#000')
  }
})
```

**#000 是什麼？**
- `#000` 是 CSS hex 顏色碼 `#000000` 的簡寫
- `#000000` = RGB(0, 0, 0) = **純黑色**
- 6 位 hex 色碼：`#RRGGBB`（紅、綠、藍各 2 位，00-FF）
- 如果 RR、GG、BB 兩位數相同可以簡寫：`#000000` → `#000`、`#ffffff` → `#fff`
- 這裡用 `#000` 是「佔位值」，只要不是 oklch 就好，html2canvas 認得 hex 顏色
- 實際上 PDF 容器用 inline style 設定了自己的顏色（`color: #333`），inline style 優先權高於 stylesheet，所以 `#000` 不會影響到 PDF 的顯示

**改動三：onclone 裡還原 opacity**
```typescript
// 用 data attribute 標記我們的容器
container.setAttribute('data-pdf-render', 'true')

// 在 clone 裡找到它並還原 opacity
onclone: (clonedDoc: Document) => {
  const pdfContainer = clonedDoc.querySelector('[data-pdf-render]') as HTMLElement
  if (pdfContainer) {
    pdfContainer.style.opacity = '1'  // 讓 clone 裡的容器可見
  }
}
```

**data-pdf-render 是什麼？**

`data-*` 是 **HTML5 原生語法**（不是任何套件），讓你在 HTML 元素上存自訂資料：
```html
<!-- data- 後面可以接任何名稱 -->
<div data-pdf-render="true">...</div>
<div data-user-id="123">...</div>
<div data-color="blue">...</div>
```

JavaScript 讀取：
```javascript
el.getAttribute('data-pdf-render')  // "true"
el.dataset.pdfRender               // "true"（camelCase）
```

CSS 選擇器：
```css
[data-pdf-render] { ... }          /* 有這個 attribute 的元素 */
[data-pdf-render="true"] { ... }   /* 值為 "true" 的元素 */
```

我們用 `data-pdf-render` 是為了在 onclone 裡能精準找到 PDF 容器，而不是用 class name 或 id（可能跟頁面其他元素衝突）。

**為什麼還是空白？**

html2pdf.js 內部有自己的 clone 流程：
1. html2pdf 先 clone 我們的容器放進自己建立的 overlay div
2. 然後 html2canvas 再 clone 整個 document（包含 overlay）
3. 我們的 onclone 是在步驟 2 執行的

問題：html2pdf 在步驟 1 clone 容器時，`opacity: 0` 被帶到了 overlay 裡的副本。我們的 onclone 找到的 `[data-pdf-render]` 可能是原始容器（不在 overlay 裡），不是 html2pdf overlay 裡的那個副本。所以 overlay 裡的副本依然是 `opacity: 0`。

---

### 嘗試 6：放棄 html2pdf.js，改用 window.print()（成功！）

**根本想法**：html2pdf.js 用 JavaScript 重新實作了一個 CSS 渲染引擎（html2canvas），但這個引擎跟不上現代 CSS 的發展。與其不斷修補第三方渲染器的 bug，不如直接用瀏覽器自己的渲染引擎——它原本就支援所有 CSS。

**做法**：
```typescript
// 1. 開一個全新的空白分頁
const printWindow = window.open('', '_blank')

// 2. 寫入乾淨的 HTML（只有手冊內容 + 自己的 CSS）
printWindow.document.write(fullHtml)
printWindow.document.close()

// 3. 使用者看到內容預覽 + 點擊「列印 / 儲存為 PDF」按鈕
// 按鈕呼叫 window.print() = 等同使用者按 Ctrl+P
```

**為什麼成功？**
- `window.open('')` 打開的新分頁是**完全乾淨**的環境，沒有 Tailwind CSS，沒有 oklch
- `document.write()` 直接寫入我們自己的 HTML + CSS，用的是 hex 顏色（`#333`、`#111`）
- `window.print()` 呼叫的是**瀏覽器原生的列印引擎**，支援所有 CSS 規格
- 使用者可以在新分頁先看到完整內容，確認沒問題再存 PDF

---

## Claude Code 在此次 Debug 中犯的錯誤

### 錯誤 1：假設 oklch 是唯一問題
看到 `oklch` 錯誤就以為修好 oklch 就能解決，沒考慮到 html2canvas 可能有其他渲染問題（如 off-screen 元素、clone 流程）。

### 錯誤 2：移除所有 stylesheet 而非替換
第一次修 oklch 時直接移除所有 `<style>` 和 `<link>`，沒想到這會導致 html2canvas 失去渲染所需的 CSS 資訊。應該用替換（replace）而非移除（remove）。

### 錯誤 3：不理解 html2pdf.js 的多層 clone 架構
以為 onclone 裡修改一次就夠了，但 html2pdf.js 有自己的 clone 流程（先 clone 一次放進 overlay），然後 html2canvas 再 clone 一次。兩層 clone 讓 opacity 還原的邏輯失效。

### 錯誤 4：連續多次「小修補」而非重新評估方案
每次失敗後都嘗試在 html2pdf.js 上打補丁（改 import、改 onclone、改 opacity），而非早點退一步思考「這個方案根本不適合」。應該在第 3 次失敗後就考慮換方案。

### 錯誤 5：沒有先在 Console 驗證 html2pdf 的基本行為
如果一開始就在 Console 測試 `html2pdf().from(simpleDiv).save()`，就能更快發現 html2canvas 與 Tailwind 的不相容問題。

---

## 技術概念速查

| 術語 | 說明 | 類型 |
|------|------|------|
| `html2canvas` | 用 JS 重新實作 CSS 解析器，把 HTML 畫到 Canvas 上 | 第三方套件 |
| `html2pdf.js` | 包裝 html2canvas + jsPDF，把 HTML 轉成 PDF | 第三方套件 |
| `onclone` | html2canvas 的 callback 選項，在 clone 後、渲染前呼叫 | **html2canvas 套件 API** |
| `data-pdf-render` | HTML5 的 `data-*` 自訂屬性，存自訂資料在元素上 | **HTML5 原生語法** |
| `window.open()` | 瀏覽器內建 API，開新分頁/視窗 | **瀏覽器原生 API** |
| `window.print()` | 瀏覽器內建 API，觸發列印對話框（= Ctrl+P） | **瀏覽器原生 API** |
| `document.write()` | 瀏覽器內建 API，把 HTML 字串寫入文件 | **瀏覽器原生 API** |
| `opacity: 0` | CSS 屬性，元素完全透明但仍佔空間 | CSS 原生 |
| `z-index: -9999` | CSS 屬性，元素放到最底層（被其他元素覆蓋） | CSS 原生 |
| `#000` | hex 色碼 `#000000` 的簡寫 = RGB(0,0,0) = 純黑色 | CSS 原生 |
| `oklch()` | CSS Color Level 4 新顏色函式，Tailwind v4 預設使用 | CSS 原生（新） |
| bundled | 把所有依賴打包成一個檔案（不需要 `require` 外部套件） | 打包概念 |
| non-bundled | 檔案裡用 `require()` 載入外部依賴（需另外安裝） | 打包概念 |

---

## 最終方案架構

```
使用者點擊下載 icon
  → API: GET /events/:id/handbooks/:hid/full（取得所有頁面 HTML）
  → window.open('', '_blank')（開新分頁）
  → document.write(fullHtml)（寫入乾淨 HTML + 自訂 CSS）
  → 使用者看到預覽 + 頂部「列印 / 儲存為 PDF」按鈕
  → 點擊按鈕 → window.print()（瀏覽器列印對話框）
  → 選擇「儲存為 PDF」→ ✅ 下載完成
```

---

## 相關筆記

- [digital-book-implementation-plan.md](../plan/digital-book-implementation-plan.md) — Phase 8 完整實作計畫 + 踩坑摘要
- [struct-tag-backtick-json.md](../Golang/struct-tag-backtick-json.md) — Phase 8 中順帶學習的 Go struct tag 語法
