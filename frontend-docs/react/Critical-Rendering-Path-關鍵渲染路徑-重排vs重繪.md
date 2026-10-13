---
title: Critical Rendering Path（關鍵渲染路徑）與 Event Loop：什麼時候畫、rAF 在哪、改 textContent 之後發生什麼
type: topic-note
tags: [rendering, critical-rendering-path, event-loop, requestAnimationFrame, textContent, reflow, repaint]
updated: 2026-10-13
---

# Critical Rendering Path（關鍵渲染路徑）與 Event Loop

> 六大步驟、重排 vs 重繪誰先、什麼操作會觸發、優化技巧與互動測驗，都在 [互動版](Critical-Rendering-Path-關鍵渲染路徑-重排vs重繪-互動版.html)。本篇只補互動版沒接起來的三件事：a. 渲染在 Event Loop 的哪一格；b. `textContent` 這類 DOM 操作之後畫面怎麼更新；c. `requestAnimationFrame` 排在哪。

本篇重點 a–c，共 3 個。

## a. 渲染在 Event Loop 的哪一格

<div class="tip-glossary" data-term="Call Stack" data-img="obsidian-attachment/學習JS_圖解_Stack位址與SP-BP_2026-07-29.svg" data-text="Call Stack（呼叫堆疊）＝整個容器，後進先出（LIFO）：只有「開口」能 push／pop，底部「封閉」；位址數字越小越靠近開口（越晚 push）。"></div>

一個影格（約 16.6ms，對齊螢幕更新率）裡的順序如下。<mark style="background: #FFF3A3A6;">渲染不是每個巨任務之後都做</mark>：微任務清空後，瀏覽器才判斷「現在是不是該更新畫面」，沒東西要畫、或這個影格已經畫過，就整段跳過。

| 順序 | 階段 | 說明 |
|------|------|------|
| 1 | 一個巨任務 | 例如 click 的 callback、`setTimeout` 到期的 callback、整份腳本的最外層程式碼 |
| 2 | 清空微任務 | `Promise.then`、`queueMicrotask`、`MutationObserver`，全部清光才往下 |
| 3 | rAF callbacks | `requestAnimationFrame` 登記的函式，在這裡執行 |
| 4 | Style | 計算每個元素最後套用哪些樣式 |
| 5 | Layout（重排） | 算出每個元素的位置與大小 |
| 6 | Paint（重繪） | 把元素畫成像素 |
| 7 | Composite | 把各圖層合成成最後的畫面（實作細節因瀏覽器而異） |

第 3–7 步合起來才是「更新畫面」；第 2 步一定排在它們前面，因為微任務沒清完，資料還沒算好，畫出來只是過渡狀態。

## b. 改 `textContent` 之後發生什麼

```javascript
const box = document.querySelector('#box');
box.textContent = '完成';      // ① 同步：DOM 樹當下就改好
console.log(box.textContent);  // ② 同步：馬上讀得到「完成」
// ③ 同步程式碼跑完、微任務清完，到了渲染機會，使用者才看到「完成」
```

| 時間點 | 發生什麼 |
|--------|----------|
| 執行 `textContent = ...` 的當下 | DOM 樹立刻改好（同步）；瀏覽器只把「樣式／排版需要重算」標記起來，還沒畫 |
| 同步程式碼跑完 → Call Stack 清空 → 微任務清空 | 這段時間畫面仍是舊的 |
| 下一個渲染機會 | 依 a 的順序：rAF → Style → Layout（文字長度可能改變大小，所以通常要重排）→ Paint → Composite，使用者才看到新文字 |
| 中途讀取 `el.offsetHeight` 等幾何值 | 瀏覽器必須立刻重算 Layout（強制同步重排）；讀寫交錯就是 Layout Thrashing，見互動版 ⑤ |

<mark style="background: #FF5582A6;">長時間同步運算（例如死迴圈）會讓 Call Stack 一直不清空</mark>，後面的微任務與渲染全部輪不到，畫面就凍結。事件循環一輪的細節見 [[事件循環-Event-Loop-微任務與巨任務]]。

## c. `requestAnimationFrame` 排在哪

rAF 不屬於宏任務也不屬於微任務，它有自己的隊伍，<mark style="background: #FFF3A3A6;">在「下一次重繪之前」、Style 之前執行</mark>，所以適合放動畫位移計算：這一幀改的樣式，馬上在同一幀的 Style → Layout → Paint 被畫出來，不會掉影格。

| 寫法 | 什麼時候跑 | 會不會對齊渲染 |
|------|------------|----------------|
| `setTimeout(fn, 16)` | 16ms 後進宏任務佇列排隊 | 不保證，可能剛好錯過這一幀 |
| `requestAnimationFrame(fn)` | 下一次渲染前（上表第 3 步） | 對齊 |

互動版的優化技巧也提到：動畫用 rAF，以及用它把寫入集中，避免在同一幀內讀寫交錯造成 Layout Thrashing。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|------|------|-----------|
| 事件循環處理模型（巨任務、微任務檢查點、update the rendering 與 rAF 的順序） | https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model | HTML Living Standard；本次未逐字查證，依既有筆記與記憶整理，2026-10-13 |
| Composite 由哪個執行緒做 | 規格未定義，屬瀏覽器實作 | 2026-10-13，本篇只寫「因瀏覽器而異」 |

## 關聯筆記

- [[JavaScript-Event Loop事件循環機制與閉包-面試核心]]——關聯原因：那篇 1-3 講「DOM 操作同步、畫面更新延後」，本篇 b 補上畫面更新的具體步驟。
- [[事件循環-Event-Loop-微任務與巨任務]]——關聯原因：完整的事件循環一輪順序（含 rAF）與 Call Stack 圖解。
- [[DevTools-Performance-面板-渲染管線與Repaint判讀]]——關聯原因：在 DevTools 裡實際看見 Style、Layout、Paint 各佔多久。
- [[css-兩種卡頓-render-blocking與執行期jank]]——關聯原因：區分載入時卡住與執行期卡頓，執行期卡頓就是 a 的長任務擋住渲染。
