# 一個 `<div>` 可能被切成兩半——從 TCP 封包到 DOM 樹

> 這篇是 `script載入方式+前因後果` 的深入版，尚未編入鐵人賽日程，可當獨立文章或之後補進系列。

## 你的三個提問

1. 都說 HTML 是「邊收邊解析」，那到底是收到「一個標籤」才解析一次嗎？
2. 如果封包剛好切在標籤中間會怎樣？
3. 這跟 `<script>` 為什麼要阻塞解析有關係嗎？

---

## 先破除一個直覺

大部分人（包括我自己）對 HTML 解析的想像是這樣的：

```
瀏覽器收到 <div>  → 建立一個 div 元素
瀏覽器收到 <h1>   → 建立一個 h1 元素
```

**好像標籤是「一個一個」送過來的。**

實際上完全不是。**網路送過來的是「一堆位元組」，而位元組的切點跟標籤的邊界毫無關係。**

這篇要證明的就是這件事，以及它連帶解釋的三個現象。

---

## 一、封包是按位元組切的，不管標籤在哪

先複習兩個名詞：

| 名詞 | 全名 | 意思 | 典型值 |
|---|---|---|---|
| **MTU** | Maximum Transmission Unit（最大傳輸單元） | 網路線路一次能搬多大一包 | 1500 bytes |
| **MSS** | Maximum Segment Size（最大區段大小） | 扣掉 IP 與 TCP 標頭後，真正裝資料的空間 | **約 1460 bytes** |

白話講：`1500 − 20（IP 標頭）− 20（TCP 標頭）= 1460`。**你的 HTML 每 1460 個位元組就被切成一包。**

### 實測

我拿一段很普通的 HTML，把 MSS 縮到 40 bytes（真實是 1460，縮小才看得出切點），結果：

```
封包  內容（↵ 代表換行）                      切點落在哪
------------------------------------------------------------------
 #1  <!DOCTYPE html>↵<html lang="zh-Hant">↵<h    ⚠️ 標籤正中間被切斷
 #2  ead><meta charset="utf-8"><title>我的�       標籤邊界外
 #3  ��站</title></head>↵<body>↵  <div id="r     ⚠️ 標籤正中間被切斷
 #4  oot" class="container">↵    <h1 class="t    ⚠️ 標籤正中間被切斷
 #5  itle">歡迎</h1>↵    <p>這是一段內              標籤邊界外
 #6  容。</p>↵  </div>↵</body>↵</html>            標籤邊界外
```

**六個封包裡有三個切在標籤正中間。**

被切斷的長相是這樣：

```
封包 #3 結束時：
  已收到    「<div id="r」                      ← 標籤還沒完
  還在路上  「oot" class="container">」         ← 要等下一個封包
  完整標籤  「<div id="root" class="container">」
```

**解析器在封包 #3 結束的那一刻，處於一個很尷尬的狀態：它知道有一個標籤開始了，但不知道那是什麼標籤。** 它甚至不知道標籤名稱是 `div` 還是 `divider`，因為只讀到 `<div id="r` 就沒了。

---

## 二、所以解析器必須是「可暫停、可續傳」的狀態機

既然封包隨時可能在任何位置斷掉，解析器就不能寫成「讀完一個標籤再處理」的樣子。

它的做法是把**狀態存在外面**：

```js
function createTokenizer() {
  let state = 'TEXT';    // 我現在在讀文字，還是在讀標籤？
  let buffer = '';       // 還沒讀完的那半個標籤，先暫存在這
  const tokens = [];

  return {
    feed(chunk) {
      for (const ch of chunk) {
        if (state === 'TEXT') {
          if (ch === '<') {
            if (buffer.trim()) tokens.push({ type: 'text', value: buffer.trim() });
            buffer = '<'; state = 'TAG';
          } else buffer += ch;
        } else {
          buffer += ch;
          if (ch === '>') {
            tokens.push({ type: 'tag', value: buffer });
            buffer = ''; state = 'TEXT';
          }
        }
      }
      return { state, pending: buffer };
    },
    tokens,
  };
}
```

白話講這段程式碼：它只有兩個狀態——**TEXT（我在讀文字）** 和 **TAG（我在讀標籤）**。遇到 `<` 就切到 TAG，遇到 `>` 就吐出一個 token 並切回 TEXT。關鍵是 `state` 和 `buffer` 這兩個變數**活在 `feed()` 外面**，所以每次只餵一小段也沒問題。

### 一包一包餵進去，觀察它卡在哪

```
封包  餵完之後的狀態       還卡在 buffer 裡的東西
--------------------------------------------------
 #1   TAG（標籤讀一半）      「<h」
 #2   TEXT（文字讀一半）     「我的�」
 #3   TAG（標籤讀一半）      「<div id="r」
 #4   TAG（標籤讀一半）      「<h1 class="t」
 #5   TEXT（文字讀一半）     「這是一段內」
 #6   TEXT（文字讀一半）     「」
```

**每一個封包結束時，解析器手上都有一段「還不能下結論」的殘料。** 它不會丟掉，也不會硬猜，就是留著等下一包。

> **這就是「串流解析（incremental parsing）」能成立的原因**——不是因為網路好心地按標籤切，而是因為解析器設計成不在乎切點在哪。

---

## 三、更底層：連一個中文字都會被切成兩半

上面封包 #2 的結尾出現了 `我的�`，那個 `�` **不是亂碼，是一個字元被切斷了**。

因為 UTF-8 是**變動長度編碼**：

| 字元 | UTF-8 佔幾個位元組 |
|---|---|
| `a`、`<`、`1` | 1 byte |
| 中文字（如「網」） | **3 bytes** |
| 部分 emoji | 4 bytes |

「網」這個字的位元組是 `0xe7 0xb6 0xb2`。**封包邊界是按 byte 切的，所以這 3 個位元組可能被切開。**

### 實測：切在中文字中間會發生什麼

拿 `我的網站` 這四個字（共 12 bytes），在第 5、6、7 個位元組切開：

**方式一：每段各自獨立解碼（錯的做法）**

```
在第 5 個位元組切開 → 「我��網站」
在第 6 個位元組切開 → 「我的網站」   ← 剛好切在字的邊界，僥倖對了
在第 7 個位元組切開 → 「我的���站」
```

**方式二：用 stream 模式（對的做法）**

```js
const dec = new TextDecoder('utf-8');
dec.decode(封包A, { stream: true }) + dec.decode(封包B, { stream: true })
```

```
在第 5 個位元組切開 → 「我的網站」  ✅
在第 6 個位元組切開 → 「我的網站」  ✅
在第 7 個位元組切開 → 「我的網站」  ✅
```

白話講 `{ stream: true }` 的意思是「**這還沒完，下次還有**」。解碼器會把湊不成一個完整字元的殘留位元組留著，等下一批補齊——**跟上面 tokenizer 的 buffer 是一模一樣的設計思路。**

### 所以完整的管線有兩個「可暫停」的階段

```
位元組  →（TextDecoder，stream 模式）→  字元  →（Tokenizer，狀態機）→  token  →  DOM 樹
        ↑ 這裡要能暫停在半個字元               ↑ 這裡要能暫停在半個標籤
```

**兩個階段都必須能停在半路**，因為封包完全不管你的邊界在哪。

---

## 四、這解釋了三件事

### a. 為什麼「串流解析」做得到

因為狀態存在外面。解析器不需要一次拿到整份 HTML，**收到多少就處理多少**，剩下的殘料留著。

這也是為什麼你會看到網頁「由上而下逐漸長出來」，而不是整頁一次跳出來。

### b. 為什麼 `<script>` 一定要阻塞解析（Day 18 講過的那個坑）

因為 JavaScript 可以用 `document.write()` **改寫「還沒讀到的那段位元流」**：

```html
<script>document.write('<h1>我插隊寫進 HTML 了</h1>')</script>
```

白話講：這行 JS 會在解析器目前讀到的位置，硬塞一段新的 HTML 進去，**解析器接下來要讀的內容就被改掉了**。

既然後面的內容可能被動過，解析器就**不敢繼續讀**——它必須停下來等這支 JS 跑完，確認沒有人改過後面，才能安全地繼續。

**這就是 parser-blocking 的根本原因。** 而 `defer` 和 `async` 之所以能安全延後執行，正是因為**規範明文規定它們裡面的 `document.write()` 會被忽略**——不能改寫解析流程，就不需要阻塞解析。

### c. 為什麼前 14 KB 這麼關鍵

TCP 有**慢啟動（slow start）**機制：它不敢一開始就全速衝，第一輪只送 **initcwnd（initial congestion window，初始擁塞窗口）** 個封包，然後停下來等對方回應 ACK。

Linux 從 2.6.39 起 `initcwnd` 預設是 **10**，所以第一輪能送：

```
10 個封包 × 1460 bytes ≈ 14,600 bytes ≈ 14 KB
```

**你的 HTML 前 14 KB 是「一個來回」就能到的，超過的要等下一個 RTT（Round-Trip Time，來回時間）。**

| 連線情境 | 典型 RTT | 超過 14 KB 的代價 |
|---|---|---|
| 同城市的 CDN 節點 | 10～30 ms | 還算小 |
| 跨國（台灣打美國） | 150～250 ms | 明顯有感 |
| 行動網路訊號差 | 100～500 ms | 非常痛 |

所以「首屏 HTML 壓在 14 KB 以內」不是迷信，它在說：**讓解析器在第一個來回就拿到足以畫出首屏的位元組。**

---

## 五、最糟的組合，以及為什麼

把三件事疊起來：

- 封包一包一包到，**前 14 KB 最快到**
- 解析器**收到多少就解析多少**
- 解析到 `<script>` 時**要不要停下來**

**最糟的組合是：一般的 `<script src>` 放在 `<head>`。**

因為它落在「前 14 KB」裡，也就是**最早被解析到的位置**，而它一被解析到就中斷解析——主執行緒停在那裡等一個全新的網路請求，**又是一個 RTT，而且那支 JS 自己也要經歷一次慢啟動。**

白話講：**你花了力氣讓 HTML 前 14 KB 快快到，結果第 5 行就叫瀏覽器停下來等另一個檔案。**

---

## 六、今天的判斷標準

下次看效能報告或設計 HTML 結構時，問自己三個問題：

| 問題 | 為什麼重要 |
|---|---|
| 首屏需要的內容，在前 14 KB 以內嗎？ | 決定要不要多花一個 RTT |
| `<head>` 裡有沒有**沒掛 async／defer** 的 `<script src>`？ | 它會在最早的位置中斷解析 |
| 第三方腳本（GA、廣告）有沒有掛 `async`？ | 它們跟 DOM 無關，不該阻塞 |

還有一個心態上的調整，是我寫這篇最大的收穫：

> **不要用「標籤」當思考單位，要用「位元組」。**
>
> 一旦習慣了「網路送的是 bytes 不是 tags」，很多原本要硬背的規則——為什麼要 `defer`、為什麼 `<script>` 要放最後、為什麼 14 KB 是個數字——就變成同一件事的推論，不用一條一條記。

---

---

## 完整可執行程式碼

存成 `packet-boundary-demo.js`，執行 `node packet-boundary-demo.js` 可以重跑本文所有實測（封包切點、被切斷的標籤、tokenizer 狀態機、TextDecoder 的 stream 模式對照）。純 Node.js 不需要任何套件。

程式碼有點長，這裡放最核心的兩段。

**第一段：證明封包會切斷標籤**

```js
// 白話講：Buffer.from 把字串變成位元組陣列，才能按 byte 精準切。
//         中文一個字在 UTF-8 佔 3 bytes，所以不能用 string.slice。
const bytes = Buffer.from(html, 'utf8');
const MSS = 40;                    // 真實約 1460，縮小才看得出切點

const packets = [];
for (let i = 0; i < bytes.length; i += MSS) {
  packets.push(bytes.subarray(i, i + MSS));
}

// 白話講：往回找最後一個 < 和最後一個 >，
//         如果 < 比 > 晚出現，就代表現在卡在標籤中間。
const isInsideTag = (text, pos) => {
  const before = text.slice(0, pos);
  return before.lastIndexOf('<') > before.lastIndexOf('>');
};
```

**第二段：TextDecoder 的 stream 模式**

```js
const sentence = Buffer.from('我的網站', 'utf8');
const cut = 5;                     // 刻意切在「網」字的 3 個位元組中間

// ❌ 錯的：每段各自獨立解碼，殘留位元組變成 �
const naive = new TextDecoder('utf-8');
naive.decode(sentence.subarray(0, cut)) + naive.decode(sentence.subarray(cut));
// → 「我��網站」

// ✅ 對的：stream: true 告訴解碼器「這還沒完」，它會留著殘料等下一批
const dec = new TextDecoder('utf-8');
dec.decode(sentence.subarray(0, cut), { stream: true })
  + dec.decode(sentence.subarray(cut), { stream: true });
// → 「我的網站」
```

---

## 參考來源與內容出處說明

延續這個系列的做法，把內容分類標示。

**一、有正式出處的部分**

| 內容 | 出處 |
|---|---|
| HTML tokenizer 是狀態機、`document.write()` 在 defer／async 中被忽略 | WHATWG HTML Standard，Parsing 章節：https://html.spec.whatwg.org/multipage/parsing.html |
| `TextDecoder` 的 `stream` 選項語意 | WHATWG Encoding Standard：https://encoding.spec.whatwg.org/ ／ MDN：https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/decode |
| TCP 初始擁塞窗口設為 10 的提案 | IETF draft-ietf-tcpm-initcwnd：https://datatracker.ietf.org/doc/html/draft-ietf-tcpm-initcwnd-04 |
| 14 KB 規則的推導 | Tyler Cipriani, The 14kB in the TCP Initial Window：https://tylercipriani.com/blog/2016/09/25/the-14kb-in-the-tcp-initial-window/ ／ Tune The Web, Critical Resources and the First 14 KB：https://www.tunetheweb.com/blog/critical-resources-and-the-first-14kb/ |

**二、我實際跑出來的部分**

封包切點表、被切斷的標籤、tokenizer 每包的狀態、TextDecoder 三種切法的對照，全部由 `packet-boundary-demo.js` 實測產生（Node.js v22），可以重跑驗證。

**特別說明一件事**：第三節「連中文字都會被切斷」**是我跑完 Part 1 才發現的**——原本只是想證明標籤會被切斷，結果輸出裡冒出一個 `�`，才追下去發現 UTF-8 也有同樣的問題。這段不在我原本的寫作計畫裡。

**三、我自己的整理與比喻（沒有外部出處）**

- 「不要用標籤當思考單位，要用位元組」這個說法

- 把「解碼」與「解析」畫成兩個都要可暫停的階段

- 第六節那三個判斷問題

- 「最糟的組合是 `<head>` 裡的同步 script」這個推論（規範沒有這樣講，是把 14 KB 規則與 parser-blocking 疊起來的結論）

**四、數字的注意事項**

`initcwnd = 10` 是 Linux 預設值，**CDN 常調大（有些到 30）**，所以 14 KB 是典型值不是硬規則，實際要看伺服器與 CDN 設定。另外 **HTTP/3 走 QUIC（UDP）**，壅塞控制機制不同，但慢啟動與初始窗口的概念仍然存在。

（查閱日期：2026-09-21。程式碼實測於 Node.js v22）
