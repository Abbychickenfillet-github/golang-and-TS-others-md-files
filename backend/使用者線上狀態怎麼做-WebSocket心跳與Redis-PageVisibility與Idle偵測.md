---
title: 使用者線上狀態怎麼做 — WebSocket 心跳與 Redis、Page Visibility 與 Idle 偵測
type: topic-note
source: Gemini
tags: [gemini, websocket, redis, presence, heartbeat, page-visibility, 系統設計, 面試]
aliases: [線上狀態, presence系統, 上線下線忙碌]
related:
  - "[[WebTransport-雙向傳輸機制與三種模式]]"
  - "[[JWT_TOKEN_EXPLANATION]]"
  - "[[IoT大範圍斷線-告警機制與重試策略-系統設計面試]]"
  - "[[Cookie-與-Session]]"
sources:
  - https://gemini.google.com/app/d9c81309bc44e965
updated: 2026-09-05
---

# 使用者線上狀態怎麼做 — WebSocket 心跳與 Redis、Page Visibility 與 Idle 偵測

> [!info]- 🔗 與既有筆記的關聯
> (1) [[JWT_TOKEN_EXPLANATION]] 講 Token 能證明什麼，本篇正好是它的邊界說明：<mark style="background: #FF5582A6;">Token 只能證明「驗證過」，證明不了「現在人在不在」</mark>。這兩篇要一起看才不會把「有 Token」誤當成「在線上」。
> (2) [[IoT大範圍斷線-告警機制與重試策略-系統設計面試]] 討論的是裝置端大量斷線時的重試與告警，本篇的心跳逾時判定是同一套機制用在「人」身上。
> (3) [[WebTransport-雙向傳輸機制與三種模式]] 記的是新一代雙向傳輸，本篇的作法 A 用的是它的前輩 WebSocket，可以對照兩者的取捨。
> (4) [[Cookie-與-Session]] 講的是「身分怎麼被記住」，本篇講的是「狀態怎麼被即時同步」，兩件不同的事常被混為一談。

> 本篇重點 a–j，共 10 個。

## 重點整理

### 一、為什麼不能只看 Token（a–b）

(a) <mark style="background: #FF5582A6;">實務上絕對不會單靠 Token 判斷線上狀態</mark>。JWT 這類 Token 只能證明<mark style="background: #ADCCFFA6;">「使用者通過了身分驗證」</mark>，它<mark style="background: #FF5582A6;">無法反映使用者當下在不在、視窗開著還是縮小、或是已經斷線</mark>。

(b) <mark style="background: #BBFABBA6;">正確作法是把問題拆成兩層</mark>：<mark style="background: #ADCCFFA6;">「連線層」決定 online／offline</mark>（WebSocket 或輪詢），<mark style="background: #ADCCFFA6;">「行為層」決定 idle／away／busy</mark>（瀏覽器事件）。<mark style="background: #D2B3FFA6;">面試被問到這題，先講這個拆分再講細節，會比直接背 API 好很多。</mark>

### 二、線上／離線：兩種作法（c–e）

(c) <mark style="background: #BBFABBA6;">作法 A：WebSocket／Socket.io 長連線（主流，即時性高）</mark>

| 事件 | 發生什麼 |
| --- | --- |
| 上線 | 登入後建立 WebSocket 長連線；連線成功即把 Redis／DB 中該 user 狀態改為 `online`，並廣播給好友 |
| 正常下線 | 使用者點登出或關分頁，前端主動送斷線通知 |
| 異常斷線 | 伺服器在時限內收不到 Heartbeat／Ping-Pong 封包，自動觸發 `disconnect` 事件改為 `offline` |

(d) <mark style="background: #BBFABBA6;">作法 B：Heartbeat／Polling 輪詢（即時性要求不高時）</mark>。前端每 30 秒到 1 分鐘打一次 Ping API，伺服器收到就更新 Redis 裡的 <mark style="background: #ADCCFFA6;">`last_active_time`</mark>；<mark style="background: #FFB8EBA6;">若超過 2～3 分鐘沒更新就判定離線</mark>，靠 Redis Key 的 TTL 或背景 Task 掃描。

(e) <mark style="background: #FFF3A3A6;">兩種作法的差別只在「誰主動」</mark>：WebSocket 是伺服器發現連線斷掉，輪詢是伺服器發現時間戳過期。<mark style="background: #FF5582A6;">但兩者都需要逾時判定，因為「使用者拔網路線」不會有任何通知送到伺服器。</mark>

### 三、閒置／離開／忙碌：純前端偵測（f–h）

(f) <mark style="background: #ADCCFFA6;">Page Visibility API</mark> 負責「切分頁／視窗縮小」：

```js
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // 切走了 → 送出「離開 (Away)」
  } else {
    // 回來了 → 送出「線上 (Online)」
  }
});
```

(g) <mark style="background: #ADCCFFA6;">Idle Detection 靠自己起一個 Timer</mark>：監聽 `mousemove`、`keydown`、`scroll`、`click`，<mark style="background: #BBFABBA6;">有動作就重置計時器</mark>；<mark style="background: #FFB8EBA6;">5～10 分鐘沒動作就切成「閒置 (Idle)」</mark>。

(h) <mark style="background: #FFF3A3A6;">手動狀態的優先權最高</mark>。像 Slack、Discord 的「請勿打擾 (Do Not Disturb)」是使用者自己選的，<mark style="background: #FF5582A6;">存進資料庫後必須壓過所有自動偵測結果</mark>，否則使用者一動滑鼠就被系統改回 online，體驗會很糟。

### 四、業界常見組合（i–j）

(i) <mark style="background: #BBFABBA6;">前端負責「判斷」，後端負責「儲存與廣播」</mark>：前端用 Page Visibility ＋ 滑鼠鍵盤 idle 事件決定當下狀態，透過 WebSocket 把狀態變更事件送出。

(j) <mark style="background: #BBFABBA6;">後端用 Redis 而不是主資料庫</mark>。狀態變動非常頻繁，寫進主 DB 會把它打爆；Redis 的 Key-Value 讀寫快，還能用 <mark style="background: #ADCCFFA6;">Pub/Sub</mark> 做跨伺服器廣播。<mark style="background: #D2B3FFA6;">這也是為什麼 presence 幾乎是 Redis 的教科書級使用情境。</mark>

## ⚠️ 存疑／需要留意

| 項目 | 對話中的說法 | 需要留意的地方 |
| --- | --- | --- |
| 正常下線 | 「關閉分頁，前端發送斷線通知」 | <mark style="background: #FF5582A6;">關分頁時送請求並不可靠</mark>。`beforeunload` 裡的一般 `fetch` 常來不及送出，要用 `navigator.sendBeacon()`；即使如此仍應以伺服器端心跳逾時為最終依據 |
| 逾時秒數 | 2～3 分鐘、5～10 分鐘 | 這是慣例值不是規範，實際要依產品對「延遲多久算離線」的容忍度調整 |

## 各對話來源（原文摘要）

### 使用者狀態偵測與同步架構（2026-09-05）— https://gemini.google.com/app/d9c81309bc44e965

**使用者：** 大家做登入（上線、下線、忙碌）的顯示是會用有登入的 token 還是其他偵測 method，譬如視窗打開的話。

**Gemini：** 回答如上方重點整理，分成連線層（WebSocket／輪詢）與行為層（Page Visibility／Idle）兩部分，並建議後端用 Redis 承接高頻狀態寫入。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話 | https://gemini.google.com/app/d9c81309bc44e965 | Gemini Flash，2026-09-05 |
| MDN — Page Visibility API | https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API | MDN，2026-09-05 查證 |
| MDN — Navigator.sendBeacon() | https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon | MDN，2026-09-05 查證 |
| Socket.IO — 連線狀態管理與 Ping/Pong | https://socket.io/docs/v4/how-it-works/ | Socket.IO v4 文件，2026-09-05 查證 |
| Redis — Key 過期（TTL） | https://redis.io/docs/latest/develop/use/keyspace/#key-expiration | Redis 現行文件，2026-09-05 查證 |
| Redis — Pub/Sub | https://redis.io/docs/latest/develop/interact/pubsub/ | Redis 現行文件，2026-09-05 查證 |

## 練習題（LeetCode／NeetCode 對照）

| 題目 | 連結 | 為什麼相關 |
| --- | --- | --- |
| 362. Design Hit Counter | https://leetcode.com/problems/design-hit-counter/ | 時間窗內的活動計數，就是 `last_active_time` 逾時判定的抽象版（Premium） |
| 359. Logger Rate Limiter | https://leetcode.com/problems/logger-rate-limiter/ | 「幾秒內只算一次」的節流，對應心跳頻率控制（Premium） |
| 146. LRU Cache | https://leetcode.com/problems/lru-cache/ | 理解 Redis 這類記憶體快取為什麼要淘汰、怎麼淘汰 |

## 關聯筆記

| 筆記 | 關聯原因 |
| --- | --- |
| JWT_TOKEN_EXPLANATION | Token 能證明身分但證明不了在線，本篇是那篇的邊界補充 |
| IoT大範圍斷線-告警機制與重試策略-系統設計面試 | 心跳逾時與重試策略是同一套機制用在裝置上 |
| WebTransport-雙向傳輸機制與三種模式 | WebSocket 的下一代方案，可對照選型 |
| Cookie-與-Session | 「身分被記住」與「狀態被同步」是兩件事 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-05
