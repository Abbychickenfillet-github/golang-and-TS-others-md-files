# 前端字體完整筆記（從零開始）

> 寫給自己看：弄懂 `@font-face`、`unicode-range`、`subsets` 在做什麼，以及字體授權的坑。

---

## Part 1：三個核心名詞，用生活比喻理解

這三個概念會一直在 Next.js、瀏覽器、字體檔之間繞來繞去。先把它們講清楚，後面什麼都懂了。

### 1.1 `@font-face` 是什麼？

**一句話**：`@font-face` 就是**網頁在跟瀏覽器自我介紹字體**的 CSS 宣告。

**生活比喻**：想像你去新公司報到。HR 會給你一張名牌：

```
姓名：Abby
部門：前端工程師
座位：3 樓 B 區
上班時間：9:00–18:00
```

`@font-face` 就是字體的「名牌」：

```css
@font-face {
  font-family: 'Geist';                          /* 叫什麼名字 */
  src: url('/fonts/geist.woff2') format('woff2'); /* 檔案在哪 */
  font-weight: 400;                              /* 字重（粗細）*/
  font-style: normal;                            /* 是斜體嗎 */
  font-display: swap;                            /* 載入行為 */
}
```

**瀏覽器看到這段 CSS 就知道**：
- 喔，有個叫 `Geist` 的字體
- 要用的時候去 `/fonts/geist.woff2` 下載
- 這個檔案代表 400 字重、非斜體

之後你在 CSS 寫 `font-family: 'Geist';`，瀏覽器就知道要去載哪個檔案。

**關鍵認知**：**瀏覽器要能用自訂字體，`@font-face` 是唯一的機制。** 不管你用 Next.js、手寫 CSS、引 Google Fonts CDN，背後都在產 `@font-face`。

---

### 1.2 `unicode-range` 是什麼？

**一句話**：`unicode-range` 是在**一條 `@font-face` 裡**多加一句：「我這個字體檔只負責『這些字元』」。

**生活比喻**：藥局裡架子的分區標籤

```
A 區：感冒藥
B 區：止痛藥
C 區：維他命
D 區：外傷用品
```

客人來拿藥，不會整間藥局都翻——看標籤直接去對應區。

`unicode-range` 也是這樣告訴瀏覽器：「這個字體檔只放英文字母 A-Z 那一區，不用整包下載。」

```css
@font-face {
  font-family: 'Geist';
  src: url('/geist-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF;  /* ← 我只負責 U+0000 到 U+00FF 的字元 */
}

@font-face {
  font-family: 'Geist';
  src: url('/geist-cyrillic.woff2') format('woff2');
  unicode-range: U+0400-04FF;  /* ← 我只負責俄文字元 */
}
```

**Unicode 編碼簡表**（每個字元在 Unicode 都有一個編號）：

| 編碼範圍 | 這區是什麼 | 例子 |
|---|---|---|
| `U+0000–007F` | 基本 ASCII（英文字母、數字、標點）| `A` `B` `1` `!` |
| `U+0080–00FF` | 拉丁文補充（西歐字母）| `é` `ñ` `ü` |
| `U+0400–04FF` | 西里爾字母（俄文）| `Б` `Д` `Ж` |
| `U+4E00–9FFF` | **CJK 漢字統一區**（中日韓共用漢字）| `你` `好` `中` `文` |
| `U+3040–309F` | 日文平假名 | `あ` `い` `う` |

**瀏覽器的聰明之處**：
1. 掃描頁面上真實出現的字元
2. 對每個字元查：「哪一條 `@font-face` 的 `unicode-range` 包含它？」
3. **只下載那幾條對應的檔案**，其他的完全不載

**舉例**：你頁面全是英文 → 只下載 `geist-latin.woff2`（~20KB）。一個俄文字母沒出現 → `geist-cyrillic.woff2` 永遠不會被載。

---

### 1.3 `subsets` 是什麼？它和 `unicode-range` 的關係？

**一句話**：`subsets` 是 **Next.js / Google Fonts 給你的「下載清單」選項**，決定**要產幾條 `@font-face`、每條負責哪個 `unicode-range`**。

**`subsets` 本身就是「簡化體積」的設計**——沒錯，你的理解是對的。它讓你挑**語言區塊**，而不是整包字體拖下來。

**生活比喻**：去 Costco 買水果箱

- 不 subset：整箱 50 公斤綜合水果搬回家（有蘋果、葡萄、哈密瓜、奇異果……你只吃蘋果，其他爛掉）
- 有 subset：選「只要蘋果組合包」（5 公斤）

```js
// Next.js 寫法
import { Geist } from 'next/font/google'

const geist = Geist({
  subsets: ['latin'],  // ← 這一行就是「下載清單」
  weight: ['400', '700'],
})
```

上面這段程式告訴 Next.js：

> 請去 Google Fonts 抓 Geist，只要 **latin 這個 subset**，字重要 **400 和 700**。

Next.js build 時會：

1. **下載** 兩個 `.woff2` 檔（latin × 400 + latin × 700）
2. **自動產** 兩條 `@font-face`（每條帶對應的 `unicode-range`）
3. **自動 self-host** 到 `.next/static/media/`

**三個名詞的關係一張圖**：

```
你寫的 config
┌───────────────────────────┐
│  subsets: ['latin']       │  ← 你的選擇：要哪些「語言區塊」
│  weight: ['400', '700']   │  ← 你的選擇：要哪些字重
└───────────────────────────┘
          ↓ Next.js 處理
┌───────────────────────────┐
│ 產出 2 條 @font-face       │  ← 1 subset × 2 weights
│ 每條帶 unicode-range       │  ← 告訴瀏覽器「我涵蓋哪些字元」
│ 下載 2 個 .woff2 檔        │  ← 只載需要的，不整包拖
└───────────────────────────┘
          ↓ 瀏覽器看到 CSS
┌───────────────────────────┐
│ 掃頁面出現的字元           │
│ 對應到該下載哪個檔         │
│ 只下載必要的               │
└───────────────────────────┘
```

---

### 1.4 Next.js 支援哪些 `subsets`？

這是一個**有限清單**，不是你隨便寫什麼都行：

| subset 名稱 | 涵蓋什麼 |
|---|---|
| `latin` | 基本英文字母 + 標點 |
| `latin-ext` | 東歐、土耳其、越南拉丁字母變體 |
| `cyrillic` | 俄文 |
| `cyrillic-ext` | 烏克蘭、保加利亞等 |
| `greek` | 希臘文 |
| `greek-ext` | 希臘文擴充 |
| `vietnamese` | 越南文 |

**重點**：**沒有 `chinese-traditional`、`chinese-simplified`、`japanese`、`korean`**。這是因為 CJK 字集太龐大（2 萬個漢字），無法用「一個 subset」的方式切乾淨。

**結論**：你在 `Noto_Sans_TC` 寫 `subsets: ['latin']`，Next.js **只會打包 Noto Sans TC 的 Latin 部分**，中文字會 fallback 到系統字體。這就是之前討論的那個坑。

---

### 1.5 WOFF2 是什麼？跟中文字有關嗎

**完全沒有關**。WOFF2 是**字體檔案格式**，跟字體裡的語言、字元種類無關。容易誤會是因為它常跟 `Noto Sans TC` 出現在同一行程式。

#### WOFF2 = **W**eb **O**pen **F**ont **F**ormat version **2**

像圖片有 `.jpg` / `.png` / `.webp`、影片有 `.mp4` / `.mov`——**字體也有多種格式**。WOFF2 是專門給網頁用的現代格式。

#### 字體檔格式全家族

| 副檔名 | 全名 | 用途 | 體積 |
|---|---|---|---|
| `.ttf` | **T**rue**T**ype **F**ont | Windows / macOS 系統字體、印刷 | 最大 |
| `.otf` | **O**pen**T**ype **F**ont | 系統字體、印刷、支援進階排版 | 大 |
| `.woff` | **W**eb **O**pen **F**ont Format v1 | 早期網頁 | 中 |
| **`.woff2`** | **W**eb **O**pen **F**ont Format v2 | **現代網頁標準** | **最小** |
| `.eot` | **E**mbedded **O**pen**T**ype | 古早 IE（已棄用）| — |

#### WOFF2 的三大特點

1. **用 Brotli 壓縮**——比 `.ttf` 小 30~50%
2. **所有現代瀏覽器都支援**（2024 年以後不用再給 `.woff` fallback）
3. **跟字體裡的字元種類無關**——英文、中文、表情符號、韓文，都可以包成 WOFF2

#### 用生活比喻

你有一張貓咪照片，可以存成 `.jpg`、`.png`、`.webp`——照片內容都一樣（一隻貓），只是**檔案格式**不同。

字體也一樣：

- **「Noto Sans TC」是字體內容**（繁體中文字形）
- **`.woff2` 是打包格式**

所以可以有：

- `Noto-Sans-TC.ttf`（印刷用的原始檔）
- `Noto-Sans-TC.woff2`（網頁用的壓縮檔）
- `Geist.woff2`（英文字體也可以是 woff2）
- `Emoji.woff2`（表情符號字體也可以是 woff2）

#### 為什麼你常在 `@font-face` 看到 woff2

```css
@font-face {
  font-family: 'Geist';
  src: url('/fonts/geist.woff2') format('woff2');  /* ← 這裡 */
}
```

因為**網頁字體的現代標準就是 woff2**：

- Next.js `next/font/google` → 下載 woff2
- `@fontsource/*` npm 套件 → 提供 woff2
- Google Fonts CDN → 回傳 woff2
- 你自己手動下載字體，也優先挑 woff2

#### 關於 WOFF2 的三個常見誤會

##### 誤會 A：WOFF2 不是「wolf（狼）」

**WOFF 是四字縮寫**，不是一個單字：

| 字母 | 代表 |
|---|---|
| **W** | **W**eb（網頁）|
| **O** | **O**pen（開源、開放標準）|
| **F** | **F**ont（字體）|
| **F** | **F**ormat（格式）|

發音「woof / woff」接近但不等於 wolf（`/wʊlf/`，有 L 音）。純巧合，不是致敬狼。

##### 誤會 B：WOFF2 不屬於任何語言

**WOFF2 是「檔案格式」，不是語言**。

**類比 `.zip` 檔**：你有 `報告.zip`，裡面可以裝：

- 中文 Word 檔 `報告.docx`
- 英文 PDF `report.pdf`
- 日文 Excel `レポート.xlsx`

請問 `.zip` 屬於什麼語言？**不屬於任何語言**——只是打包機制。

WOFF2 一樣：

- `Noto-Sans-TC.woff2` 裡裝**繁中**字形
- `Geist.woff2` 裡裝**英文**字形
- `Noto-Sans-JP.woff2` 裡裝**日文**字形
- `Emoji.woff2` 裡裝**表情符號**字形

**盒子本身與語言無關，裡面裝什麼語言是另一件事**。

##### 誤會 C：你看到的「編碼」是 Unicode，不是 WOFF2 的

```css
@font-face {
  src: url('/geist.woff2') format('woff2');
  unicode-range: U+4E00-9FFF;  /* ← 這是 Unicode 編號，不是 WOFF2 的 */
}
```

**三層分開看**：

```
┌─────────────────────────────────────────────┐
│  .woff2 檔案（= 打包盒 + Brotli 壓縮）        │  ← 格式層
│  ┌───────────────────────────────────────┐  │
│  │  原始字體資料（TTF / OTF 內容）         │  │  ← 資料層
│  │  ┌─────────────────────────────────┐  │  │
│  │  │  Unicode → 字形對照表            │  │  │  ← 編碼層
│  │  │  U+4E00 → 「一」的向量畫法       │  │  │
│  │  │  U+4E2D → 「中」的向量畫法       │  │  │
│  │  │  U+0041 → 「A」的向量畫法        │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

| 層次 | 是什麼 | 誰制定 |
|---|---|---|
| **格式層** | `.woff2` 這個「盒子」 | W3C（網頁標準組織）|
| **資料層** | 盒子裡的原始字體檔 | 字體設計師做的 `.ttf` / `.otf` |
| **編碼層** | 「U+4E00 = 字元『一』」的對照 | Unicode 組織（全球共識）|

**Unicode 是全人類共用的字元編號表**，跟 WOFF2 完全獨立。就算用 `.ttf`、`.otf`、`.woff` 也一樣用 Unicode 編號來標字。

#### 一句話總結

**WOFF2 是網頁用的壓縮字體「盒子」**——盒子本身跟語言、跟 Unicode 編碼都無關。就像 `.zip` 能壓縮任何檔案、`.mp4` 能裝任何語言的影片——**格式 vs 內容 是兩件事**。

#### 延伸：`.ttf` 和 `.otf` 的名字由來 + 歷史脈絡

你在 WOFF2 家族表看到這兩個副檔名，也是縮寫：

##### `.ttf` = **T**rue**T**ype **F**ont

- 由 **Apple 在 1980 年代**開發，後來授權給 Microsoft
- **誕生背景**：當時 Adobe 掌握 PostScript 字體標準**並收授權費**，Apple 為了不被綁死，自己做了一套
- **「TrueType」的含義**：當時螢幕字體和印刷字體常常不一致（螢幕鋸齒、印出來糊），TrueType 要讓字體在螢幕上和印表機上**真實一致**地顯示
- 用**二次貝茲曲線**畫字形
- 至今 Windows / macOS / Linux 系統字體仍大量使用

##### `.otf` = **O**pen**T**ype **F**ont

- 由 **Microsoft + Adobe** 在 1990 年代共同開發
- **TrueType 的進化版**：可以包含 TrueType 曲線，也可以包含 PostScript（Adobe 原本的系統）曲線
- **「Open」的含義**：**開放標準**（注意：不是開源），各家廠商都能實作
- 關鍵進化——支援**進階排版功能**：

  | 功能 | 用途 | 範例 |
  |---|---|---|
  | **Ligatures（連字）** | 兩個字自動合成一個特殊形 | `fi` → `ﬁ`、`ae` → `æ` |
  | **OpenType Features** | 啟用特殊字形變體 | `ss01`（替代 a）、`tnum`（tabular numerals 表格數字）|
  | **Kerning（字距微調）** | 特定字母對的間距 | `AV` 的 V 靠近 A |
  | **CJK + Latin 共存** | 一個檔案多語言 | Noto Sans CJK 一檔多用 |
  | **Variable Fonts（可變字體）** | 一個檔案含所有字重 | Geist Variable 一檔搞定 100–900 |

##### 四種格式的演化關係

```
TrueType（Apple, 1984）
    ↓ 被擴充
OpenType（Microsoft + Adobe, 1996）—— 可以含 TrueType 或 PostScript 曲線
    ↓ 被「網頁化」
WOFF（W3C, 2009）—— 把 OTF/TTF 壓縮給網頁用
    ↓ 加強壓縮
WOFF2（W3C, 2014）—— 用 Brotli 進一步壓縮（比 WOFF 小 30%）
```

##### 面試白話總結

| 格式 | 誰做的 | 定位 |
|---|---|---|
| `.ttf` | Apple | **系統字體**原生格式（給作業系統用）|
| `.otf` | Microsoft + Adobe | 支援**進階排版**的擴充（設計師偏愛）|
| `.woff` | W3C | 把 TTF/OTF **打包壓縮**給網頁用（舊版）|
| `.woff2` | W3C | 壓縮更狠的 woff（Brotli 演算法，現代標準）|

**白話**：`.otf` 裡的進階設計功能（連字、tabular nums、ss01 變體等）**會保留到 woff2**——所以你在網頁上用 Geist 可以啟用 tabular nums，正是因為 Geist 原本是 `.otf`，包成 `.woff2` 時功能沒掉。

```css
/* 啟用 tabular numerals（所有數字等寬，對齊漂亮）*/
.timer {
  font-feature-settings: 'tnum' 1;
}
```

**這個功能是 OpenType 給的**——沒有 OpenType 標準，你沒辦法用一行 CSS 開啟這種效果。

---

### 1.6 沒有 `@font-face` 還能用字體嗎？

**能用，但只能用使用者電腦裡已有的字體**。想用「網路上的自訂字體」必須 `@font-face`——**這是 CSS 唯一的機制**。

#### 先釐清：SCSS / SASS 都支援 @font-face

**SCSS / SASS 是 CSS 的預處理器，最終都會編譯成 CSS**。所以：

```scss
// SCSS 寫法
@font-face {
  font-family: 'Geist';
  src: url('/fonts/geist.woff2');
}
```

編譯後變成完全一樣的 CSS。**三者都支援 `@font-face`**，差別只在語法糖。

所以這個問題真正要問的是：**「如果我完全不寫 @font-face，能用字體嗎？」**

#### 答案：三條路

##### 路 1：用「使用者電腦裡已經有」的字體（不用 `@font-face`）

```css
body {
  font-family: 'Arial', 'Microsoft JhengHei', sans-serif;
}
```

這不用寫 `@font-face`，因為：

- `Arial` 是 Windows / macOS 都內建的字體
- `Microsoft JhengHei`（微軟正黑）是 Windows 內建
- 瀏覽器找使用者電腦就好，不用從網路下載

**限制**：你只能用**大家電腦都有**的字體。你想用 `Geist`、`Noto Sans TC` 這種**非系統內建**的字體，使用者電腦沒有 → 只能網路下載 → **必須 @font-face**。

##### 路 2：引用外部 CSS（你自己的 CSS 沒寫 `@font-face`，但別人寫了）

```html
<!-- HTML 裡 -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist">
```

```css
/* 你的 CSS */
body {
  font-family: 'Geist', sans-serif;  /* ← 你沒寫 @font-face */
}
```

看起來你沒寫 `@font-face`，但**打開 Google Fonts 回傳的 CSS**會看到：

```css
/* Google 回傳的 CSS 裡寫好了 */
@font-face {
  font-family: 'Geist';
  src: url(https://fonts.gstatic.com/.../geist.woff2);
}
```

**本質上還是 `@font-face`**，只是**你沒寫，Google 幫你寫**。

##### 路 3：用 JavaScript FontFace API（新技術）

```js
const geist = new FontFace('Geist', 'url(/geist.woff2)')
await geist.load()
document.fonts.add(geist)
```

這是用 JS 動態載入字體。**本質上瀏覽器做的事跟 `@font-face` 一樣**，只是從 CSS 搬到 JS。

#### 核心結論

```
你想用「非系統內建」的字體（如 Geist、Noto Sans TC）
                    ↓
            必須從網路下載字體檔
                    ↓
            瀏覽器必須知道從哪下載
                    ↓
         只有 @font-face 能做這件事
                    ↓
    不管你用 CSS、SCSS、SASS、JS、Next.js
    不管誰寫、怎麼寫
    ╰─ 最終都會產生 @font-face ─╯
```

#### 真的不想寫 `@font-face` 的話，你只有兩個選項

| 選項 | 限制 |
|---|---|
| 用系統內建字體 | `Arial`、`Helvetica`、`Times New Roman`、`Microsoft JhengHei`、`PingFang` 這類 |
| 用 Web Safe Fonts | 幾乎所有電腦都有的通用字體（`Georgia`、`Verdana`、`Courier` 等）|

**代價**：不同作業系統看起來不一樣、字體選擇非常有限、無法用現代設計字體。

#### 面試重點整理

**如果面試官問：「為什麼要寫 `@font-face`？」**

標準答案：

> `@font-face` 是 CSS **唯一**能載入自訂字體的機制。沒有它，我們只能用使用者電腦裡已裝的系統字體，這樣：
>
> 1. **跨平台不一致**（macOS 看到蘋方、Windows 看到微軟正黑）
> 2. **無法統一品牌視覺**
> 3. **設計選擇被限制在大家都有的少數字體**
>
> 寫 `@font-face` 的代價是**多一次網路下載**，但換來的是**跨平台視覺一致 + 設計自由度**。

---

### 1.7 `@font-face` 的字元範圍：用「我愛你」實例理解

#### 先釐清：什麼是「字元（character）」

**一個字元 = 一個文字**。

| 字串 | 字元數 |
|---|---|
| `我` | 1 個 |
| `愛` | 1 個 |
| `你` | 1 個 |
| `我愛你` | **3 個** |
| `I love you` | **10 個**（包含空格！）|
| `你好 123` | 6 個（含空格）|

#### 每個字元都有 Unicode 編號（code point）

**code point** = 字元在 Unicode 標準裡的**唯一編號**。

| 字元 | Unicode code point |
|---|---|
| `我` | `U+6211` |
| `愛` | `U+611B` |
| `你` | `U+4F60` |
| `A` | `U+0041` |
| `a` | `U+0061` |
| `1` | `U+0031` |
| 空格 ` ` | `U+0020` |
| 😀 | `U+1F600` |

這些編號**全世界共通**——不管你用什麼字體、什麼作業系統、什麼程式語言，`我` 永遠是 `U+6211`。這是人類跨語言溝通的底層標準。

#### `@font-face` 的字元範圍由 `unicode-range` 定義

```css
@font-face {
  font-family: 'Noto Sans TC';
  src: url('/noto-cjk.woff2') format('woff2');
  unicode-range: U+4E00-9FFF;
  /*              ↑── 這條規則只負責字元編號從 U+4E00 到 U+9FFF 的字
   *                  （CJK 漢字區，共 20,992 個字元）
   */
}
```

**「我愛你」是否被這條規則涵蓋？**

| 字元 | code point | 落在 `U+4E00-9FFF` 嗎？| 會被這條 `@font-face` 渲染？|
|---|---|---|---|
| 我 | `U+6211` | ✅（6211 在 4E00~9FFF 之間）| ✅ |
| 愛 | `U+611B` | ✅ | ✅ |
| 你 | `U+4F60` | ✅ | ✅ |

**結論**：頁面上只有「我愛你」3 個字元時，**只有這條 `@font-face` 會被觸發**，瀏覽器只下載 `noto-cjk.woff2`。

但如果頁面還有個 `A`（`U+0041`）——`A` 不在這條範圍內，瀏覽器會找**另一條** `@font-face` 來處理。

#### 不寫 `unicode-range` 會怎樣？

```css
@font-face {
  font-family: 'Geist';
  src: url('/geist.woff2');
  /* 沒寫 unicode-range */
}
```

**預設值 = `U+0-10FFFF`**，意思是**整個 Unicode 全包**（`10FFFF` 是 Unicode 最大編號）。

白話：**不寫就代表「我什麼字都涵蓋」**——瀏覽器遇到任何字元都會嘗試用這個 font 渲染。

#### 多條 `@font-face` 如何分工（實戰模式）

同一個 `font-family` 下可以寫**多條 `@font-face`**，每條負責一段範圍：

```css
/* 條 1：負責英文 */
@font-face {
  font-family: 'MyFont';
  src: url('/my-font-latin.woff2');
  unicode-range: U+0020-007F;   /* 基本 ASCII（英文、數字、標點）*/
}

/* 條 2：負責中文 */
@font-face {
  font-family: 'MyFont';
  src: url('/my-font-cjk.woff2');
  unicode-range: U+4E00-9FFF;   /* CJK 漢字 */
}

/* 條 3：負責表情符號 */
@font-face {
  font-family: 'MyFont';
  src: url('/my-font-emoji.woff2');
  unicode-range: U+1F600-1F64F; /* 表情符號 */
}
```

CSS 使用：

```css
body {
  font-family: 'MyFont', sans-serif;
}
```

瀏覽器在頁面上看到字元時：

| 字元 | 走哪條 `@font-face` | 下載哪個檔 |
|---|---|---|
| `A`（U+0041）| 條 1 | `my-font-latin.woff2` |
| `我`（U+6211）| 條 2 | `my-font-cjk.woff2` |
| `😀`（U+1F600）| 條 3 | `my-font-emoji.woff2` |

**只有對應的檔案被下載**——這就是 Google Fonts 為 CJK 做的結構（把一個 font-family 切成幾十條 `@font-face`，按字頻切片，只載頁面用到的那段）。

#### 回答你的問題：`@font-face` 有範圍嗎？

**有**，而且是**必然有**——只是有沒有手動寫：

| 情境 | 範圍 |
|---|---|
| 有寫 `unicode-range` | 你宣告的那段 |
| 沒寫 `unicode-range` | 預設 `U+0-10FFFF`（整個 Unicode）|

**一條 `@font-face` = 一個字體檔 × 一段字元範圍 × 一個字重 × 一個字樣**。改任何一個欄位，就是**另一條** `@font-face`。

#### 速查：「我愛你」在不同 `unicode-range` 下的行為

| `unicode-range` 寫什麼 | woff2 會下載嗎？| 3 個字都會被渲染？|
|---|---|---|
| `U+4E00-9FFF`（包含全部 CJK）| ✅ 會 | ✅ 3 個都用 |
| `U+0020-007F`（只有英文）| ❌ 不會 | ❌ 都 fallback |
| `U+6000-9FFF` | ✅ 會（我 U+6211、愛 U+611B 在內）| ⚠ 只有 `我` `愛`，`你`（U+4F60）fallback |
| `U+4F60-4F60`（**精準只挑「你」**）| ✅ 會 | ⚠ 只有 `你`，我和愛 fallback |
| 沒寫（預設全部）| ✅ 會 | ✅ 3 個都用 |

這個表展示 `unicode-range` 的**精確度可以細到單一字元**。實務上不會這樣切，但原理上做得到。

---

### 1.8 實戰 Q&A：我需要手動寫多條 `@font-face` 嗎？

**結論：幾乎不用。Next.js 會自動幫你產。**

#### 為什麼不用手寫

在 Next.js 用 `next/font` 時，**你只要 import 多個字體，Next.js 就自動產出多條 `@font-face`**——每條帶對應 `unicode-range`、每條自動 preload、hash、self-host。

```js
// app/layout.js — 你只要這樣寫
import { Noto_Sans_TC } from 'next/font/google'
import localFont from 'next/font/local'

// Latin 字體
const geist = localFont({
  src: './fonts/Geist-Regular.woff2',
  variable: '--font-geist',
})

// 繁中字體
const notoSansTC = Noto_Sans_TC({
  weight: ['400', '700'],
  variable: '--font-noto-sans-tc',
})
```

```scss
// globals.scss — 你只要這樣設 font stack
body {
  font-family: var(--font-geist), var(--font-noto-sans-tc), sans-serif;
}
```

**Next.js 幫你產的 CSS**（你完全不用自己寫）：

```css
@font-face {
  font-family: '__Geist_abc';
  src: url('/_next/static/media/geist-xxx.woff2');
  unicode-range: U+0020-007F, ...;  /* Latin 範圍 */
}
@font-face {
  font-family: '__Noto_Sans_TC_def';
  src: url('/_next/static/media/noto-xxx.woff2');
  unicode-range: U+4E00-9FFF, ...;  /* CJK 範圍 */
}
```

**瀏覽器行為**：遇到英文 → 用 Geist；遇到中文 → 用 Noto Sans TC。**全自動**。

#### 什麼時候才會手動寫多條 `@font-face`

少數情況：

1. **完全不用框架**的純 HTML / 靜態網站 → 自己手寫 CSS
2. **Self-host 付費字體**（沒有對應 npm 套件）→ 手動下載 woff2 + 手寫 `@font-face`
3. **做進階 subset 優化**：把一個字體切成多個字頻檔（精確控制哪段先載）
4. **用一個框架不支援的字體載入策略**（進階需求）

#### 關於表情符號：你不用自己處理

多數情境下**不需要**自訂 emoji 字體：

- 作業系統都內建 emoji 字體：
  - macOS / iOS → **Apple Color Emoji**
  - Windows → **Segoe UI Emoji**
  - Android → **Noto Color Emoji**
- 瀏覽器會**自動 fallback** 到系統 emoji 字體
- 你只要在 `font-family` stack 放 `sans-serif` 當最後備援就行，系統遇到 emoji 字元會自動走 emoji 字體

**只在這種情境才需要自訂 emoji 字體**：

- 品牌希望**所有平台 emoji 外觀統一**（例如 Twitter / X 以前用 Twemoji 確保每個平台看到一樣的表情）
- 特殊用途（遊戲、兒童產品）需要特定風格 emoji

**結論**：Part 1.7 的「條 3：負責表情符號」是**示意原理**，不是實戰建議。你 99% 的專案不會寫那條。

#### 對你 Timelog 專案的直接建議

**不要手動寫 `@font-face`**。走這樣就夠：

```js
// app/layout.js
import localFont from 'next/font/local'
import { Noto_Sans_TC } from 'next/font/google'

// Latin 走 next/font/local（從 GitHub release 下載 Geist）
const geist = localFont({
  src: './fonts/Geist-Regular.woff2',
  variable: '--font-geist',
})

// 中文走 next/font/google（Next.js 自動處理 CJK 切片）
const notoSansTC = Noto_Sans_TC({
  weight: ['400', '700'],
  variable: '--font-noto-sans-tc',
})
```

Next.js 會自動幫你：

- ✅ 產兩條 `@font-face`（一條 Latin、一條 CJK）
- ✅ 加對應的 `unicode-range`
- ✅ 處理 preload / lazy load
- ✅ Hash 檔名防 cache 問題
- ✅ self-host 到 `.next/static/media/`

#### 核心心法

> **懂原理 ≠ 親手寫**
>
> 面試會問原理（「為什麼 `@font-face` 要分多條？」→ 你答得出來就贏）
> 實戰用框架自動化（Next.js `next/font` 一行 import 解決）
>
> **筆記 Part 1.1 ~ 1.7 是原理**（面試用），**1.8 是實戰怎麼做**（上線用），**1.9 是效能成本分析**。

---

### 1.9 `@font-face` 的頻寬成本：一定會多下載嗎？會佔多少

#### 問題 1：有 `@font-face` 就要多下載一次？

**是，但只下載「頁面實際用到的」那幾條**。

```
頁面只有英文
    ↓
只觸發英文那條 @font-face
    ↓
只下載 latin.woff2（~25KB）
    ↓
中文那條 @font-face 永遠不會被下載 ✅
```

**例外情況**：如果你用 `<link rel="preload">` 或 Next.js 的 `preload: true`（預設值）→ 瀏覽器**不管頁面有沒有用到，都先下載**。對 Latin 小檔沒差，但對 CJK 大檔要小心——一定要加 `preload: false`。

#### 問題 2：會佔多少網路頻寬？

**這是關鍵——CJK 和 Latin 差 200~400 倍**：

| 字體 | 格式 | 單一字重大小 | 相當於... |
|---|---|---|---|
| **Geist Regular** | WOFF2 | **~25 KB** | 1/2 張低解析度照片 |
| **JetBrains Mono Regular** | WOFF2 | ~40 KB | 一張 logo PNG |
| **Inter Regular** | WOFF2 | ~30 KB | — |
| **Noto Sans TC Regular 整包** | WOFF2 | **~7~10 MB** | **接近一部短影片** |
| Noto Sans TC subset 成 2000 常用字 | WOFF2 | ~500 KB | 一張大圖 |
| Google Fonts CJK 單一字頻切片 | WOFF2 | ~80~200 KB | 一張中等圖片 |

這個差距是你 CJK 專案**必須**在意的。

#### 你目前專案（Timelog）的實際頻寬計算

**現況**（`app/layout.js`）：

```js
Noto_Sans_TC({
  weight: ['300', '400', '500', '700'],  // 4 個字重
  subsets: ['latin'],                    // 只打包 Latin
})
```

**實際下載量**：

- 4 字重 × **Latin 部分**（~25KB/字重）= **~100 KB** ✅ 很輕
- **代價**：中文 fallback 到系統字體（Windows 看微軟正黑、Mac 看蘋方——跨平台不一致）

**如果你改成整包 CJK**（解決中文 fallback 問題）：

| 配置 | 單次下載總量 | 評估 |
|---|---|---|
| 4 字重 × 整包 CJK | **~32 MB** | ❌ 爆炸 |
| 2 字重 × 整包 CJK（400 + 700）| **~16 MB** | ⚠ 還是很重 |
| 2 字重 × Google Fonts 字頻切片 | **~400 KB～1 MB**（只載頁面用到的段）| ✅ 合理 |
| 2 字重 × 自己 subset 成 2000 字 | **~1 MB** | ✅ 合理 |

**Google Fonts 的聰明之處**：它把 CJK 切成**幾十個 chunk**（按字頻切），你頁面用到哪段載哪段，不是整包拖。

#### 優化頻寬的五個槓桿

| 槓桿 | 省多少 | 怎麼做 |
|---|---|---|
| **`font-display: swap`** | 不省下載，但**不阻塞渲染** | 文字先用系統字顯示，字體載完再換（你已經設定 ✅）|
| **減少字重** | 每少一字重省 25KB（Latin）或 8MB（CJK 整包）| 只留 400 + 700 兩個字重 |
| **Variable Font** | **省 60~80%** | 一個檔案包所有字重，用 `font-weight: 100–900` 調整 |
| **Subsetting** | CJK 省 **90%+**（8MB → 500KB）| 用 `pyftsubset` 或 `subset-font` 切常用 2000 字 |
| **HTTP Cache** | 第二次訪問 **免費** | server 設 `Cache-Control: max-age=31536000` |

#### 三種修法的量化對照

| 方案 | 下載量 | 中文外觀 | 專業度 | 適合情境 |
|---|---|---|---|---|
| **A. 維持現狀** + 明確指定系統 CJK fallback | ~100 KB | 🟡 跨平台不同但都好看 | 🟡 | 極度省頻寬優先 |
| **B. 換 `@fontsource/noto-sans-tc` + 400/700 字重 + swap** | ~16 MB（用 swap 體感不差）| 🟢 全平台一致 | 🟢 | **推薦：面試作品集** |
| **C. B + 自己 subset 成 2000 常用字** | ~1 MB | 🟢 全平台一致 | 🟢 | **面試加分題**：能說成故事 |

#### 面試答題範本

**問**：「你怎麼平衡字體視覺品質和頁面效能？」

**標準答**：

> 三個策略同時用：
>
> 1. **`font-display: swap`** —— 字體不阻塞渲染，First Contentful Paint 不會因為字體慢被拖累
> 2. **字重精簡** —— 我的專案只留 400 和 700 兩個字重，一個字體省下 6MB
> 3. **CJK 特別處理** —— 中文字體太大（單字重 8MB），我走 Google Fonts 的字頻切片或用 `pyftsubset` 自己 subset 到 2000 常用字，把實際下載量從 8MB 壓到 500KB
>
> 此外 HTTP Cache 設長 `max-age`，回訪使用者零下載成本。

#### 關鍵心法

> **CJK 是「效能大魔王」**。英文字體幾十 KB 怎麼搞都沒事，CJK 一個失誤就是 10MB 塞進使用者流量。
>
> 面試講「字體效能」時，**只要你點出 CJK vs Latin 200 倍的體積差**，並說出**至少一個處理策略**（subset、swap、字頻切片），就贏 90% 只會複製貼上 `next/font/google` 的人。

---

### 1.10 迷思釐清：**靜態儲存 ≠ 網路傳輸**

這是新手超常踩的認知盲點：「我都放 static hosting / CDN 了，為什麼大檔還是問題？」

#### 核心觀念

**儲存**和**傳輸**是兩個完全不同的成本層：

```
┌────────────────────┐           ┌────────────────────┐
│  你的 server / CDN │  ——網路—→ │  使用者的瀏覽器      │
│  （字體檔存這裡）   │           │  （要下載到這裡才能用）│
└────────────────────┘           └────────────────────┘
      ↑                                ↑
      儲存成本（便宜）                   傳輸成本（貴）
      1GB / 月 ≈ $0.02                10MB 在 4G 要 16 秒
      你的問題                          使用者的問題
```

#### Static hosting 解決了什麼、沒解決什麼

| 問題 | Static hosting 有解決？ |
|---|---|
| 伺服器 CPU 算力成本 | ✅ 解決（不用跑程式，直接吐檔）|
| 部署複雜度 | ✅ 簡化 |
| 硬碟儲存成本 | ✅ 幾乎免費（1GB/$0.02）|
| **每次訪客都要「透過網路下載一份到他瀏覽器」** | ❌ **完全沒解決** |
| 使用者感受到的載入時間 | ❌ 沒解決 |
| 使用者的行動網路流量費 | ❌ 沒解決 |
| Google Core Web Vitals / SEO 排名 | ❌ 沒解決 |

**關鍵誤解**：「靜態檔」= 伺服器**預先存好的檔案**，使用者訪問網站時**還是要透過網路傳一份過去**。不是「放在那邊就免費」。

#### 關鍵數字：不同網路下載 10MB 要多久

| 網路類型 | 速度 | 下載 10MB 要... | 可接受？ |
|---|---|---|---|
| 光纖寬頻 | 100 Mbps | ~0.8 秒 | ✅ |
| 一般 WiFi | 50 Mbps | ~1.6 秒 | ✅ |
| 4G 良好訊號 | 20 Mbps | ~4 秒 | 🟡 |
| **4G 人多訊號差** | 5 Mbps | **~16 秒** | ⚠️ |
| **3G / 地鐵 / 停車場 / 偏鄉** | 1 Mbps | **~80 秒** | ❌ |

**Google 研究數據**：**53% 的使用者會在頁面載入超過 3 秒就離開**。你的字體拖慢 4 秒 = **一半使用者跑掉**。

#### 生活比喻（幫助理解）

##### 比喻 1：倉庫 vs 宅配

你有全台最大的倉庫（static storage 便宜），但每個訂單宅配到客戶家要一週（網路傳輸慢）——**客戶還是不會回購**。

##### 比喻 2：自助餐 vs 外送

餐廳冰箱存了 100 斤肉（儲存便宜），但每個外送員要騎 2 小時才能送到——**生意一樣做不起來**。

#### 還有一個關鍵：**使用者要付流量費**

台灣多數人吃到飽還好，但：

- **國際訪客**（作品集被國外人看）：很多國家行動網路**按流量計費**
- **無線熱點分享**：用熱點看網站，10MB 字體 = 燒使用者的手機流量
- **公司 / 學校 / 飛機 WiFi**：管理員看流量帳單
- **企業付費 WiFi**（例如機場）：使用者實際在付錢

**讓使用者「免費」逛你的網站是 UX 基本尊重**。

#### 結論

**靜態儲存解決的是「你的錢」，網路傳輸解決的是「使用者的時間和錢」**。

這是兩個完全不同的層面。CJK 字體大的問題**100% 是網路傳輸問題**，跟你放哪裡儲存無關。

#### 面試答題

**問**：「我們用 CDN / S3 / Cloudflare 了，字體還需要優化嗎？」

**答**：

> CDN 解決的是**傳輸距離和頻寬瓶頸**（讓檔案從離使用者最近的節點出發），但**檔案大小本身**還是要傳過去。一個 10MB 的 CJK 字體，不管走 CDN 還是本機 server，在 4G 訊號差的環境都要 16 秒。**CDN 讓「遠的變近」，subsetting 讓「大的變小」——兩件事要同時做**。

---

### 1.11 `@font-face` 的家族與進階寫法

前面 1.1 ~ 1.10 都在講**最常見的用法**。這節講 `@font-face` 的**完整面貌**——知道這些讓你能答出面試的進階題。

#### 層次 1：CSS @-rule 家族（`@font-face` 的親戚們）

所有以 `@` 開頭的 CSS 規則都叫 **at-rule**。`@font-face` 是其中一員：

| At-rule | 用途 | 範例 |
|---|---|---|
| **`@font-face`** | **定義字體** | 你整個筆記都在講的 |
| `@media` | 媒體查詢（響應式設計）| `@media (min-width: 768px) { ... }` |
| `@import` | 引入其他 CSS 檔 | `@import url('other.css');` |
| `@keyframes` | 定義動畫關鍵影格 | `@keyframes fade { 0% {...} 100% {...} }` |
| `@supports` | 特性偵測 | `@supports (display: grid) { ... }` |
| `@container` | 容器查詢（2023+ 新標準）| `@container (min-width: 400px) { ... }` |
| `@layer` | 串接層級控制（Cascade Layers）| `@layer base, utilities;` |
| `@property` | 註冊 CSS 變數型別 | `@property --x { syntax: '<color>'; }` |
| `@page` | 列印樣式 | `@page { margin: 2cm; }` |
| `@scope` | 範圍限定（最新）| `@scope (.card) { ... }` |
| `@font-feature-values` | **字體功能命名**（`@font-face` 的表親）| `@font-feature-values MyFont { @styleset { cool: 1; } }` |
| `@counter-style` | 自訂清單符號 | — |
| `@namespace` | XML 命名空間 | 幾乎沒人用 |

**記法**：`@` 開頭的都是**規則宣告**，不是普通 CSS 選擇器。每個 `@-rule` 有自己的語法和用途。

#### 層次 2：`@font-face` 內部的完整屬性清單

你目前看到的只是冰山一角：

```css
@font-face {
  /* ═══ 基本五件組（你已經熟的）═══ */
  font-family: 'Geist';                        /* 字體名稱 */
  src: url('geist.woff2') format('woff2');     /* 檔案位置 */
  font-weight: 400;                            /* 字重 */
  font-style: normal;                          /* 字樣（normal/italic/oblique）*/
  font-display: swap;                          /* 載入行為 */

  /* ═══ 範圍控制 ═══ */
  unicode-range: U+0020-007F;                  /* 字元範圍 */

  /* ═══ Variable Font 專屬：用範圍 ═══ */
  /* 一個檔案可以包 100–900 所有字重 */
  font-weight: 100 900;           /* ⚠ 不是單一值，是範圍 */
  font-stretch: 75% 125%;         /* 寬度範圍 */
  font-style: oblique 0deg 10deg; /* 斜體角度範圍 */

  /* ═══ OpenType 進階功能（繼承自 .otf）═══ */
  font-feature-settings:
    'kern' 1,      /* 啟用字距微調 */
    'liga' 1,      /* 啟用連字（fi → ﬁ）*/
    'tnum' 1,      /* 等寬數字（計時器必備！）*/
    'ss01' 1;      /* 啟用 stylistic set 01（替代字形）*/

  /* ═══ Variable Font 軸（新）═══ */
  font-variation-settings:
    'wght' 400,    /* weight 軸 */
    'wdth' 100,    /* width 軸 */
    'slnt' 0;      /* slant 軸 */

  /* ═══ 度量覆寫（消除 FOUT/FOIT 位移，進階優化）═══ */
  ascent-override: 90%;
  descent-override: 20%;
  line-gap-override: 0%;
  size-adjust: 100%;
}
```

#### 兩種現代的 `@font-face` 寫法

##### 寫法 A：**傳統——一個字重一個檔**

```css
@font-face {
  font-family: 'Geist';
  src: url('/Geist-Regular.woff2');
  font-weight: 400;
}
@font-face {
  font-family: 'Geist';
  src: url('/Geist-Bold.woff2');
  font-weight: 700;
}
```

**特點**：每個字重一個 woff2 檔，要用哪個載哪個。

##### 寫法 B：**Variable Font——一個檔搞定所有字重**

```css
@font-face {
  font-family: 'Geist';
  src: url('/Geist-Variable.woff2');
  font-weight: 100 900;    /* ← 範圍寫法！關鍵差異 */
  font-style: normal;
}
```

然後 CSS 裡：

```css
.heading { font-weight: 850; }   /* ✅ 可以用任意值 */
.body    { font-weight: 400; }
.label   { font-weight: 650; }   /* ✅ 不整齊的 650 都可以 */
```

**好處對比**：

| 比較項 | 傳統寫法 | Variable Font |
|---|---|---|
| 檔案數 | 9 個（100~900 每 100 一個）| **1 個** |
| 總檔案大小 | 9 × 25KB = **225 KB** | ~**80 KB** |
| 可用字重 | 固定 9 階 | **100–900 任意數字** |
| 動畫效果（字重平滑變化）| ❌ 跳階 | ✅ **平滑過渡** |

**現代字體（Geist、Inter、Fraunces、Satoshi…）大多有 Variable 版**，選 Variable 幾乎無腦加分。

#### `@font-face` 可以巢狀在其他 at-rule 裡嗎？

**技術上可以，實務上罕見**：

```css
/* ✅ 合法，但幾乎沒人這樣寫 */
@media (min-width: 768px) {
  @font-face {
    font-family: 'Geist';
    src: url('/geist-desktop.woff2');
  }
}

@supports (font-variation-settings: normal) {
  @font-face {
    font-family: 'Geist';
    src: url('/geist-variable.woff2');
  }
}

@layer base {
  @font-face {
    font-family: 'Geist';
    src: url('/geist.woff2');
  }
}
```

**為什麼不推薦**：

- 字體管理會變很混亂
- `@font-face` 本身就有 `unicode-range` 可以精準切分，不需要靠 media query
- 維護成本高

**正常做法**：`@font-face` **放 global CSS 最上層**，用 `font-family` stack 或 CSS 變數切換控制。

#### 相關的 `@font-feature-values`（進階、少用）

這是 `@font-face` 的表親——讓你**給 OpenType 功能取別名**：

```css
@font-feature-values 'Geist' {
  @styleset {
    cool-a: 1;    /* 給 ss01 取別名 cool-a */
    fancy: 2 3;   /* 同時啟用 ss02 和 ss03 */
  }
}

.special {
  font-family: 'Geist';
  font-variant-alternates: styleset(cool-a);
}
```

**什麼時候用**：大型設計系統要給客戶/設計師**用語義名稱**取代魔術數字時。一般專案用不到。

---

#### 面試加分題彙整

知道這節內容，你可以在面試回答：

| 問題 | 你能答 |
|---|---|
| 「`@font-face` 是什麼？」 | 完整機制 + `unicode-range` + 屬性清單 |
| 「CSS 有哪些 at-rule？」 | 家族表 10+ 種 |
| 「你用過 Variable Font 嗎？」 | ✅ 解釋 `font-weight: 100 900` 範圍寫法 + 省檔案的好處 |
| 「怎麼啟用 OpenType 的 tabular numerals？」 | ✅ `font-feature-settings: 'tnum' 1` |
| 「`@font-face` 可以巢狀嗎？」 | ✅ 技術上可以，但不推薦，會亂 |

---

## Part 2：字體授權的三個陷阱

商業專案（你的 Timelog 有電商）最怕「不小心用了盜版字型」，會有法律風險。

### 陷阱 1：「免費下載 ≠ 可商用」

很多字型集散網站（中文圈有些很大的下載站）放的檔案是**盜版**——只是把付費字體偷偷放上來讓你載。你以為「網路上能下載就是免費」，實際上你已經違法使用。

**正確做法**：下載前**一定找授權檔案**：

| 檔名 | 意義 |
|---|---|
| `LICENSE.txt` | 通用授權檔 |
| `OFL.txt` | **SIL Open Font License**（最寬鬆，可商用）|
| `OFL-FAQ.txt` | OFL 常見問題 |
| `EULA.txt` | 商業授權（通常要付錢）|
| `README.md` 裡的 License 段 | 專案自訂條款 |

**SIL Open Font License（OFL）是什麼**：

- 開源字體界的標準授權
- **可以**：商用、嵌入網頁、打包進產品、修改字體
- **不可以**：單獨把字體檔當商品賣（= 禁止字體套裝的盜版）
- **必須**：發布時附上 OFL 授權檔

**認得 OFL 的字體你都可以放心用**：Noto 系列、Geist、LXGW 文楷、Pretendard、JetBrains Mono、源石黑體……

---

### 陷阱 2：justfont 的 jf open 有分免費版 vs Pro 版

**justfont（就是字）** 是台灣的字體設計工作室，他們的品牌有兩條產線：

| 名稱 | 授權 | 可商用？ |
|---|---|---|
| **jf open 系列**（開源版）| SIL OFL | ✅ 可 |
| **justfont Pro 系列**（像 **金萱**、**蘭陽明朝**）| 商業授權，月費 / 流量計費 | ❌ 不付費不行 |

**常見誤解**：很多人以為「jf open 粉圓」免費 = 「粉圓 Pro」也免費。**不是**——Pro 版字集更完整、筆畫細節優化，屬於商品。

**怎麼分辨**：
- 名稱有 `jf open` = 開源版
- 名稱有 `Pro`、或獨立品名（金萱、蘭陽、刻石錄）= 付費版

**前端判斷**：你在 `package.json` 安裝 `@fontsource/xxx` 的套件如果是 OFL 授權，直接用就對了。

---

### 陷阱 3：系統預設字體**不能用 `@font-face` 打包**

**關鍵區分**：

| 用法 | 合法嗎 |
|---|---|
| `font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif` （fallback）| ✅ 合法 |
| `@font-face { src: url('msjh.ttf'); }` （打包 / 嵌入）| ❌ 違反微軟 EULA |

**為什麼**：

- 微軟正黑體（Microsoft JhengHei）屬於 Windows，授權只給「**使用者電腦上執行**」
- 蘋方（PingFang）屬於 macOS / iOS
- 你**不能把這些字體檔上傳到 server 讓其他人下載**（= `@font-face` 的行為）

**但你可以在 CSS 寫它當 fallback**——意思是「如果使用者電腦上有，就用；沒有就找下一個」。這屬於「引用使用者自己安裝的字體」，不是你在散布。

---

## Part 3：你目前專案的實戰建議

### 目前狀態（`app/layout.js`）

```js
const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],  // ← 問題：中文沒被這個字體渲染
  weight: ['300', '400', '500', '700'],
  display: 'swap',
  variable: '--font-noto-sans-tc',
})
```

**問題**：`subsets: ['latin']` 讓 Next.js 只打包 Noto Sans TC 的拉丁字部分，中文字 fallback 到使用者系統字體（Windows 看到微軟正黑，macOS 看到蘋方）。**跨平台外觀不統一**。

### 建議的改法：三選一

#### 方案 A：整包 CJK 全帶（最簡單、最肥）

移除 `subsets`，讓 Next.js 下載 Noto Sans TC 所有字元範圍：

```js
const notoSansTC = Noto_Sans_TC({
  weight: ['400', '700'],  // 字重盡量少
  display: 'swap',
  variable: '--font-noto-sans-tc',
  preload: false,          // ⚠ 必要：CJK 太大不要 preload
})
```

| 項目 | 影響 |
|---|---|
| Docker image 大小 | +40MB 以上 |
| 首頁載入 | 稍慢（但 `preload: false` 讓它 lazy load）|
| 字形統一性 | ✅ Windows / macOS 看起來一樣 |

#### 方案 B：走 `@fontsource` npm 套件（推薦）

```bash
npm install @fontsource/noto-sans-tc
npm install @fontsource-variable/geist
```

`app/layout.js`：
```js
import '@fontsource-variable/geist'
import '@fontsource/noto-sans-tc/400.css'
import '@fontsource/noto-sans-tc/700.css'
```

| 項目 | 優點 |
|---|---|
| 版本鎖 | ✅ 寫在 `package-lock.json`，不同時間 build 結果一致 |
| 離線 build | ✅ 不用連 Google Fonts |
| Docker 友善 | ✅ 字體在 `node_modules/` 這層，改程式不重下 |
| 面試加分 | ✅ 看 `package.json` 就知道你在用什麼字體（= 工程感） |

#### 方案 C：自己 subset 成 2000 常用字（最省、最進階）

用 `pyftsubset`（Python 工具）或 `subset-font`（Node 工具）把 Noto Sans TC 切成只剩**常用繁體字 2000 字**：

- 原檔 ~10MB
- 切完 ~500KB（**小 20 倍**）

適合追求極致效能的情境。但工具鏈複雜，**初期先不做**。

### 我的推薦：方案 B（`@fontsource`）

**理由**：
1. 對商業產品最安全（版本鎖、離線可 build）
2. 面試情境看 `package.json` 就是工程感加分
3. 未來要升級字體（換 Pretendard、加 Geist Mono）都是 `npm install` 一行搞定

---

## Part 4：面試情境的字體推薦組合

全部 SIL OFL 授權，可商用：

```
✅ Latin Body / Display：
   - Geist（Vercel 開源，很 2025）
   - Pretendard（韓系，中英文搭配很強）
   - General Sans（ITF 免費層）

✅ 繁中 Body：
   - Noto Sans TC（Google + Adobe，最安全）

✅ 繁中 Display（可選，增加層次感）：
   - Noto Serif TC（宋體，對比黑體英文）
   - LXGW 文楷 TC（楷體，有人味）

✅ 等寬（代碼、數字）：
   - Geist Mono
   - JetBrains Mono
```

**搭配邏輯**：
- **英文走 Sans-serif 無襯線** + **中文走宋體或楷體** → 中英對比強烈，顯示你懂 CJK 排版
- **數字用 tabular-nums** → 在時間記錄的計時器上特別有敘事性

---

## Part 5：Noto Sans TC 學習資源

### 你應該搜尋的**頻道 / 網站**

以下都是**真實存在的權威來源**，我不亂推網址，你自己搜尋選最新內容：

#### 🎥 YouTube 頻道（推薦訂閱）

1. **justfont 字戀**（台灣字體工作室）
   - 搜尋：`justfont` 或 `字戀`
   - 內容：CJK 字體設計、Noto 系列解析、台灣字體文化
   - 語言：中文為主

2. **Adobe Fonts 官方**
   - 搜尋：`Adobe Fonts`
   - 內容：Source Han Sans 製作幕後（= Noto Sans CJK 的另一品牌）
   - 語言：英文

3. **Google Fonts 官方頻道**
   - 搜尋：`Google Fonts YouTube`
   - 內容：Noto 專案介紹、網頁字體最佳實務

#### 📽️ 特別推薦的具體內容（搜尋關鍵字）

| 搜尋關鍵字 | 你會看到什麼 |
|---|---|
| `Source Han Sans Making Of` | Adobe 做思源黑體的紀錄片（= Noto Sans CJK 同一組字體）|
| `思源黑體 Adobe` | 中文圈對思源黑體的解析 |
| `justfont Noto 黑體` | justfont 對 Noto 系列的分析 |
| `CJK typography web` | 網頁上的 CJK 排版技術 |
| `next/font 教學` | Next.js 字體系統實戰 |

#### 📚 網站 / 部落格

1. **justfont 字戀部落格**
   - 搜尋：`字戀`
   - 台灣字體教育最重要的資源

2. **The Noto Project**
   - 搜尋：`Google Noto fonts`
   - Noto 系列官方介紹、設計哲學（Noto = No more tofu「豆腐」，指字體缺字時的方框 □）

3. **Adobe Source Han Sans**
   - 搜尋：`Source Han Sans GitHub`
   - 開源字體的技術文件（Noto Sans CJK 的技術基礎）

### 概念補充：Noto Sans TC 的身世

- **Noto = "No more tofu"** —— tofu 是字體缺字時出現的□方框
- Google 和 Adobe 合作做「**涵蓋全世界所有語言、沒有缺字**」的開源字體
- `Noto Sans CJK`（中日韓版）在 Adobe 那邊叫 `Source Han Sans`（思源黑體）
- `Noto Sans TC` = 繁體中文版
- `Noto Sans SC` = 簡體中文版
- `Noto Sans JP` = 日文版
- `Noto Sans KR` = 韓文版
- **全部開源、SIL OFL 授權、可商用**

### 進階：想深入字體工程

| 主題 | 搜尋關鍵字 |
|---|---|
| `@font-face` 所有屬性 | `MDN @font-face` |
| unicode-range 實戰 | `MDN unicode-range`、`CSS Tricks font subsetting` |
| 字體 subsetting 技術 | `pyftsubset tutorial`、`subset-font npm` |
| WOFF2 壓縮原理 | `WOFF2 compression explained` |
| variable fonts | `variable fonts web`、`axis-praxis`（互動體驗網站）|

---

## Part 6：速查卡（以後忘了翻這裡）

### 最常混淆的三個名詞

| 名詞 | 一句話 | 你會在哪看到 |
|---|---|---|
| `@font-face` | 瀏覽器的字體「名牌」，告訴它去哪載檔 | `globals.scss`、Next.js 產出的 CSS |
| `unicode-range` | 這個字體檔「負責哪些字元」| `@font-face` 內的一個屬性 |
| `subsets` | 下載清單，決定產幾條 `@font-face` | `Noto_Sans_TC({ subsets: [...] })` |

### Unicode 速查

| 範圍 | 是什麼 |
|---|---|
| `U+0000–007F` | 英文、數字、標點 |
| `U+4E00–9FFF` | 中日韓漢字（含繁體）|
| `U+3040–309F` | 日文平假名 |
| `U+AC00–D7AF` | 韓文諺文 |

### 授權速查

| 授權 | 可商用？| 例子 |
|---|---|---|
| SIL OFL | ✅ | Noto、Geist、LXGW、Pretendard |
| Apache 2.0 | ✅ | Roboto |
| MIT | ✅ | 部分開源字體 |
| Microsoft EULA | ❌（不能嵌入）| 微軟正黑、Calibri |
| Apple 系統字體 | ❌（不能嵌入）| PingFang、SF Pro |
| justfont Pro | ❌（月費 / 流量）| 金萱、蘭陽明朝 |

---

## 附錄：最後一個重點

**如果你要面試前檢查網站字體有沒有跑對**，做這個動作：

1. 打開你的網站，**F12** 開發者工具
2. 切到 **Elements** 分頁
3. 選中一段中文字
4. 看右邊 **Computed** 分頁的 `font-family`
5. **滾到最底**看 **Rendered Fonts**（實際使用的字體）

如果 Rendered Fonts 顯示的是 `Noto Sans TC` → 你的配置生效了
如果顯示的是 `Microsoft JhengHei` 或 `PingFang TC` → 你踩到前面說的坑，需要修

---

**寫於 2026-04-16**
**相關對話匯出**：`frontend-doc/typography.txt`
