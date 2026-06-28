# Critical Rendering Path（關鍵渲染路徑）＋ 重排 vs 重繪

> 同資料夾配對檔：
> - `Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪.html` — 互動筆記（流程動畫／填空／是非／申論）
> - `Critical-Rendering-Path-reflow-repaint-demo.html` — 開 F12 → Performance 親手驗證重排/重繪的 demo

## 一句話
把字串（HTML/CSS/JS）變成像素（畫面）的最短關鍵流程。優化它＝畫面更快出現（FCP / LCP）。

## 六大步驟
1. **DOM** — 解析 HTML
2. **CSSOM** — 解析 CSS（渲染阻塞資源）
3. **Render Tree** — DOM ＋ CSSOM，只留可見節點（`display:none` 不進，`visibility:hidden` 會進）
4. **Layout / Reflow（重排）** — 算幾何：位置、寬高
5. **Paint / Repaint（重繪）** — 填像素：顏色、邊框、陰影
6. **Composite（合成）** — 圖層疊合，常由 GPU 處理

## ⭐ 重排 vs 重繪，誰先？
**重排（Reflow）先，重繪（Repaint）後**（Layout → Paint）。
- 先決定「東西在哪、多大」（重排），才能「在那塗顏色」（重繪）。
- **重排一定引發重繪；重繪不一定引發重排** → 重排成本更高，優先避免。

| | 重排 Reflow | 重繪 Repaint |
|---|---|---|
| 改什麼 | 幾何（位置/大小） | 外觀（顏色/陰影） |
| 順序 | 先 | 後 |
| 連帶 | 必引發重繪 | 不引發重排 |
| 成本 | 高 | 較低 |

## 優化重點
- 批次改樣式（切 class / 一次 cssText）
- **讀寫分離**，避免 layout thrashing（強制同步重排）
- 離線操作：`DocumentFragment` / 先 `display:none`
- 動畫用 `transform` + `opacity` → 只走 Composite，跳過重排重繪
- 動畫排程用 `requestAnimationFrame`

## 關聯筆記
- [[React-Context-Provider消費者-AuthProvider與路由保護]]
- [[樂觀更新-Optimistic-Update]]
- [[lazy-loading-vs-tab-badge]]
- [[useMemo-return]]
- [[../web-platform/|web-platform 筆記區]]
- [[../前端開發工具-打包編譯Lint與Parser|前端開發工具：打包/編譯/Lint/Parser]]

## Obsidian 小撇步
- 用 **HTML Reader** 外掛直接在筆記裡看 `.html` 互動版
- 用 **Highlightr** 標重點（重排先、重繪後）
- 流程圖可用 **Excalidraw**：DOM→CSSOM→Render Tree→Layout→Paint→Composite

---
來源對照：對照了 ChatGPT 匯出資料（其中於 `requestAnimationFrame` 脈絡曾提到 repaint），補齊完整 CRP 與重排/重繪順序。
