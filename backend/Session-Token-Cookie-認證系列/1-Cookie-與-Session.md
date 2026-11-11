---
title: Cookie 與 Session(Web 身分驗證與狀態管理)
type: 2026-06-01T00:00:00
source: Gemini
tags:
  - gemini
  - web
  - cookie
  - session
  - auth
  - http
  - express
sources:
  - https://gemini.google.com/app/cc5b875ac137a823
updated: 2026-06-10
---

# Cookie 與 Session

## 重點整理

**為什麼需要 Cookie / Session?**

HTTP 協定本身是**無狀態的(Stateless)**:<mark style="background: #FFB8EBA6;">伺服器**把每個請求都當成獨立事件,沒有內建機制把「同一個客戶端的前後兩個請求」關聯起來**(這比「伺服器不記得你是誰」精確)。</mark>
<mark style="background: #FF5582A6;">所以任何要「跨請求記住狀態」的功能——登入、購物車、偏好設定、多步驟表單——都需要額外的狀態管理,Cookie 就是 RFC 2109 為此設計的機制。</mark>

> ⚠️ 原筆記檢討(為什麼原本那三行寫得不夠好):
> a. **太登入導向**:原文說「為了維持登入狀態才需要」,但登入只是其中一種應用;Cookie/Session 是通用的**狀態管理**(購物車、偏好都算)。
> b. **把 Cookie 和 Session 當同類並列**:其實 **Cookie 是「傳遞機制」**(RFC 2109 定義的兩個 header),**Session 是蓋在它上面的「有狀態的一段期間」**,兩者不同層,不該用「和」並列成同類。
> c. **「session」一詞混用兩個意思**:(1) RFC 講的 **stateful session ＝「有狀態的一段期間/上下文」**;(2) 開發口語的 **伺服器端 Session 物件(session_id ＋ store)**。原文把兩者混在一起,讀者會搞不清在講哪個。
> d. **「伺服器不記得你是誰」太口語**:精確說法是「HTTP 沒有內建機制關聯前後請求」。

### 小圖示:HTTP 請求與回應 →（create）→ stateful session

<svg viewBox="0 0 780 195" xmlns="http://www.w3.org/2000/svg" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif">
  <defs><marker id="ar" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#7d8a94"/></marker></defs>
  <polygon points="40,60 250,60 220,130 10,130" fill="#eaf2f7" stroke="#3f6f8f" stroke-width="1.6"/>
  <text x="130" y="88" text-anchor="middle" font-size="14" fill="#1d2b36" font-weight="600">HTTP 請求與回應</text>
  <text x="130" y="108" text-anchor="middle" font-size="11.5" fill="#41525f">Set-Cookie↓ ／ Cookie↑</text>
  <line x1="252" y1="95" x2="300" y2="95" stroke="#7d8a94" stroke-width="1.8" marker-end="url(#ar)"/>
  <rect x="302" y="60" width="202" height="70" fill="#ffffff" stroke="#3f6f8f" stroke-width="1.6"/>
  <text x="403" y="84" text-anchor="middle" font-size="13.5" fill="#1d2b36" font-weight="600">create（建立關聯）</text>
  <text x="403" y="102" text-anchor="middle" font-size="11" fill="#41525f">用兩個 header 反覆交換,</text>
  <text x="403" y="118" text-anchor="middle" font-size="11" fill="#41525f">把前後請求綁成同一人</text>
  <line x1="506" y1="95" x2="554" y2="95" stroke="#7d8a94" stroke-width="1.8" marker-end="url(#ar)"/>
  <polygon points="586,60 770,60 744,130 560,130" fill="#eafaf0" stroke="#4a9b5e" stroke-width="1.8"/>
  <text x="665" y="88" text-anchor="middle" font-size="14" fill="#1d2b36" font-weight="700">有狀態 session</text>
  <text x="665" y="108" text-anchor="middle" font-size="11.5" fill="#2f6b43">stateful session</text>
  <text x="390" y="165" text-anchor="middle" font-size="11" fill="#6b7b88">形狀:▱ 平行四邊形＝資料　▭ 直角矩形＝處理（ISO 5807）</text>
</svg>

> 讀法:HTTP 的請求與回應(資料)經過「用 `Set-Cookie`／`Cookie` 兩個 header 反覆交換」這個處理,把原本各自獨立的請求綁成「同一個人的一段連續狀態」,**創造出(create)** 一個有狀態的 session。這正是 RFC 2109 開宗明義要做的事。

**Cookie(客戶端儲存)**
- 一小段文字資料,由伺服器發送、儲存在使用者瀏覽器中。
- 瀏覽器在<mark style="background: #D2B3FFA6;">後續</mark><mark style="background: #FFF3A3A6;">每次請求</mark>會<mark style="background: #FFB86CA6;">自動</mark><mark style="background: #FF5582A6;">把 Cookie 帶回給伺服器(放在請求標頭)</mark>。
- 特點:存在使用者端,**容易被竄改或竊取,不適合放敏感資料**。
- 運作流程:登入後伺服器發 `Set-Cookie` → 瀏覽器寫入本地 → 之後每次請求標頭都帶上 Cookie。

**Session(伺服器端儲存)**
- 資料存在**伺服器端**(記憶體或資料庫)。
- 伺服器給使用者一張「身分證」`session_id`,這個 ID 透過 Cookie 傳給瀏覽器。
- 下次請求帶上 `session_id`,伺服器比對後就能識別使用者狀態。
- 特點:**安全性較高**,因為使用者只看得到 Session ID,看不到實際內容。
- 運作流程:登入後伺服器建立一塊 Session 資料 →<mark style="background: #FFF3A3A6;"> 發 `session_id` 給瀏覽器(通常也存在 Cookie 裡)→ 下次請求帶上 `session_id` 比對識別。</mark>

**實作**:Node.js + Express 通常用 `express-session` 中介軟體來管理 Session。

**Cookie 安全旗標(補)**:`HttpOnly`(JS 讀不到、防 XSS 偷 cookie)、`Secure`(只走 HTTPS)、`SameSite`(防 CSRF,搭配 [[CSRF-與-Antiforgery-Cookie]])、`Expires/Max-Age`(決定關機後是否還在)。查法:F12 → Application → Cookies。

**Session(有狀態) vs JWT(無狀態)**:Session 把狀態存伺服器、登出刪那筆即可;JWT 無狀態、難主動撤銷,所以本專案才需要[[LOGOUT_AND_LOGIN_EXPLANATION|黑名單 jti]] 機制。詳見 [[JWT_TOKEN_EXPLANATION]]。

> 補充:原對話的完整 Express 範例程式碼放在 Gemini 的 Canvas 檔(`web_auth_example.js`)裡,本筆記未含逐行程式碼;核心是用 `express-session` 設定 session,登入後把使用者資訊存進 `req.session`,後續請求由中介軟體依 cookie 裡的 session id 還原。
> 延伸:[[OAuth與RESTful-Firebase登入-彈窗vs重定向]](OAuth 授權、登入狀態維持、「session」三種意思辨析)。

## F12 觀察重點:Set-Cookie 在哪、為什麼有時看不到

- **口訣:`Set-Cookie` 是伺服器設定給我(response header)、`Cookie` 是我帶回去(request header)。**
- 容易踩的坑:在 F12 複製「Response」卻看不到 `Set-Cookie`,是因為你複製到的是**回應主體(body)**,而 `Set-Cookie` 是**標頭(header)**。要看它:點那個請求 →<mark style="background: #FFB86CA6;"> **Headers** 分頁 → **Response Headers**</mark>。
- 就算看了 Headers 也可能沒有:<mark style="background: #FF5582A6;">`Set-Cookie` 只在伺服器「發新 cookie 或更新 cookie」時才出現</mark>(登入、登出、換 session)。平常載入頁面時,是瀏覽器**帶 `Cookie` 上去(request)**,伺服器通常不回 `Set-Cookie`,所以「沒有」很正常。
- 例:Next.js App Router 的 RSC/Flight 回應(像 `1:"$Sreact.fragment"`、`I[...]` 那種)是**頁面內容的 body**,本來就不會有 `Set-Cookie`。

## 如果要自己用資料表存 session_id(有狀態 Session 的 store)

> 對應原文那句「使用者或遠端伺服器都可以把對話終止」——下面的 `revoked` 或直接刪列,就是「終止」的實作。

PostgreSQL:

```sql
CREATE TABLE sessions (
  id             TEXT PRIMARY KEY,       -- session_id（建議存「雜湊後」的值，不是原始 id）
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data           JSONB,                  -- 選用：要存進 session 的額外資料
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL,   -- 過期時間，查詢時比對 now()
  last_active_at TIMESTAMPTZ,            -- 選用：滑動過期 / idle timeout
  user_agent     TEXT,                   -- 選用：稽核、異常偵測
  ip             INET,                   -- 選用：稽核
  revoked        BOOLEAN NOT NULL DEFAULT false  -- 選用：強制登出
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

白話逐欄:

a. `id`:就是 session_id 當主鍵。<mark style="background: #BBFABBA6;">建議存雜湊(例如 SHA-256)後的值</mark>——這樣 DB 外洩時別人也不能直接拿去冒用(跟密碼要雜湊同理)。
b. `user_id`:外鍵指到 `users`;`ON DELETE CASCADE` 讓使用者被刪時、他的 session 一起清掉。
c. `expires_at`:過期時間。每次查 session 比對 `now()`;過期的列可以定期清掉。
d. `revoked` 或直接刪這一列 ＝ <mark style="background: #FFF3A3A6;">強制登出</mark>。這正是「有狀態 Session」勝過 JWT 的地方:能即時踢人(JWT 很難主動撤銷)。
e. 「對話終止」兩種來源:使用者自己登出(刪自己的列)、或伺服器端踢人(設 `revoked` 或刪列)。

Prisma(next-one 用):

```prisma
model Session {
  id           String    @id            // session_id（存雜湊值）
  userId       Int
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  data         Json?
  createdAt    DateTime  @default(now())
  expiresAt    DateTime
  lastActiveAt DateTime?
  userAgent    String?
  ip           String?
  revoked      Boolean   @default(false)

  @@index([userId])
  @@index([expiresAt])
}
```

> 注意:這是「有狀態 Session」自建 store 的設計。你 next-one 現在用的 **iron-session 是加密 cookie 派(stateless、沒有這張表)**;只有當你想要「能即時撤銷、server 端查表」時,才需要像這樣建 `sessions` 表。見 [[3-Session與JWT-有狀態與無狀態驗證-過期機制與Base64url]]。

### 實作補充(2026-11-10 共讀 DB session 時釐清)

a. **iron-session 的加密發生在 `session.save()`**:不是你寫 `session.sid = ...` 當下,而是呼叫 `save()` 時,iron 才用 `ironOptions.password` 把資料**加密 ＋ 簽章**後寫進 cookie。

b. **`lib/prisma.js` 的 `global` 單例寫法**:`PrismaClient` 本身**不是連線池**,但它**內部管理一個連線池**。Next.js 開發模式會頻繁**熱重載(hot reload)**,每次重載若都 `new PrismaClient()` 會**很快耗盡資料庫連線數**。所以用 `global.prisma` 把實例掛在全域物件下重用:
```js
const prisma = global.prisma || new PrismaClient()      // 有就重用，沒有才新建
if (process.env.NODE_ENV === 'development') global.prisma = prisma  // 只在開發模式掛全域
```
白話:**只有開發模式需要這招**(生產模式模組只載入一次、本來就單例);`next dev` 指令會自動把 `NODE_ENV` 設成 `development`,所以用它判斷。這是 Prisma 官方文件特別強調的規範。

c. **`cookies()`(Next.js 伺服器)vs `document.cookie`(瀏覽器)**:`cookies()` 是 Next.js 的**伺服器端**函式,結構化地讀寫請求/回應裡的 cookie;`document.cookie` 是**瀏覽器原生、客戶端** API,用字串操作 cookie。不同端、不同用途。詳見 [[延伸/SPA單頁應用與document-cookie-是兩件事]]。

d. **session id vs access token**:兩者都是「令牌(token)」——登入後拿到、之後每次請求出示的憑證。差別:session id 通常存加密 cookie、伺服器拿它**查狀態**(有狀態);access token 常是**自帶資料**的憑證、用於 API 驗證(無狀態)。

e. **JSDoc 不是 TypeScript**:JSDoc(`/** @param {string} x */`)只是**說明文件 ＋ 編輯器提示**,**不會在編譯時強制型別檢查**;TypeScript 才會硬性約束。`{Promise<string>}` 是宣告「這個非同步函式回傳一個**會解析成字串的 Promise**」;`ttlMs` 的 **TTL ＝ Time To Live(存活時間)**,單位毫秒,`7 * 24 * 60 * 60 * 1000` 就是 7 天換算成毫秒。

## 名詞定義與用詞校正(讀 RFC 2109 時)

**origin server 與 user agent**(RFC 常出現的兩個詞):

- **user agent(使用者代理)**:代表使用者發出 HTTP 請求的**客戶端程式**。最常見是瀏覽器(Chrome、Firefox、當年的 Netscape Navigator),但也包含 App 的 HTTP client、`curl`、爬蟲。RFC 不寫「瀏覽器」而寫 user agent,是為了**不假設客戶端一定是瀏覽器**。
- **origin server(原始伺服器)**:真正持有該資源、並對請求產生**權威回應**的伺服器,也就是資源的「源頭」。對照 CDN、快取、代理(proxy)這些中間節點——origin server 是最源頭那台。
- 📖 來源:[RFC 9110 — HTTP Semantics](https://datatracker.ietf.org/doc/html/rfc9110)(user agent、origin server 的正式定義)。

**你的 wording 校正**:「原本 session 可能需要透過 URL 來帶入加密資訊」——方向對,但兩點不精確:

a. **不是「加密資訊」**:URL 帶的是 **session 識別碼(session id)或狀態值**,它**沒有加密**;反而因為露在網址列、容易外洩,這正是它的缺點。
b. **URL 不是唯一舊方法**:cookie 出現前,維持 session 狀態靠 **URL rewriting(把 session id 塞進網址,如 `?sid=...`)** 或 **隱藏表單欄位(hidden input)**。

→ 精確版:「在 cookie 出現前,要跨請求維持 session,得把 **session id** 放進 **URL** 或 **隱藏表單欄位**傳遞;但這些方式容易外洩、難維護,所以 RFC 2109 才改用 `Cookie`／`Set-Cookie` 兩個 header 來做。」

## RFC 是什麼?IETF 發布就是「準則」嗎?

- **RFC ＝ Request for Comments(請求評論)**:這名字是**歷史遺留**。1969 年 ARPANET 時期這些文件真的是「發出來徵求評論」的草稿;名字沿用至今,但現在很多 RFC 其實已是定稿標準。**名字還叫徵求意見,內容不一定還是草稿**。
- **不是每個 RFC 都是標準**,要看它的**狀態/分類**:
  a. Standards Track(標準軌):Proposed Standard → Internet Standard(STD),這類才是標準方向。
  b. Best Current Practice(BCP):最佳實務。
  c. Informational／Experimental／Historic:資訊性、實驗性、已淘汰——**不是標準**。
- 標準也會被新 RFC **取代(obsoleted)**:cookie 的 **RFC 2109(1997)→ 2965 → 現行 6265**。
- 甚至有惡搞 RFC(RFC 1149「用信鴿傳 IP 封包」是愚人節玩笑)。
- 📖 來源:[RFC Editor(查每個 RFC 的狀態)](https://www.rfc-editor.org/)。
- 歷史脈絡:RFC 2109 發布於 **1997-02**,比 **Ajax(2005 命名)** 早了八年;當時主流瀏覽器是 **Netscape Navigator**(cookie 正是 Netscape 1994 年發明的,RFC 2109 說要與「Netscape 的 Cookie 提案」相容就是指它)。

**ECMAScript 有納入 RFC 嗎?**

- **沒有直接關係**。ECMAScript 由 **Ecma International 的 TC39** 維護,標準編號 **ECMA-262**(也等同 ISO/IEC 16262),跟 **IETF 的 RFC 是不同標準組織、不同流程**(ECMAScript 走每年版本 ES2015、ES2016… ＋ TC39 proposal 的 stage 0–4)。
- 但兩邊在某些點**刻意對齊**:例如 **JSON** 同時被 ECMA-404 與 IETF **RFC 8259** 定義、保持相容;ECMAScript 用到 URL、日期時也會**引用**特定 RFC。但它**不會自動納入 RFC 每次改版**。

## 各對話來源

### Cookie 與 Session 概念與範例(2026-06-02)— https://gemini.google.com/app/cc5b875ac137a823

**使用者:** 教我 cookie 跟 session 並且帶上範例程式碼。

**Gemini:** 了解 Cookie 和 Session 是掌握 Web 開發身分驗證與狀態管理的基礎。因為 HTTP 協定本身是「無狀態的(Stateless)」,伺服器不記得你是誰,所以需要 Cookie 和 Session 來維持登入狀態。
- **Cookie(客戶端儲存)**:一小段文字資料,由伺服器發送、儲存在使用者瀏覽器中;瀏覽器在後續請求會自動帶回給伺服器。特點:存在使用者端,容易被竄改或竊取,不適合放敏感資料。
- **Session(伺服器端儲存)**:資料存在伺服器端;伺服器給使用者一個「身分證」(Session ID),透過 Cookie 傳給瀏覽器;再次請求時伺服器透過這個 ID 查詢對應 Session 資料。特點:安全性較高,使用者只看得到 Session ID。
- 附上「Cookie 與 Session 實作指南」與 Node.js (Express) 範例 `web_auth_example.js`(用 `express-session` 中介軟體管理 Session)。
- 指南內容:① Cookie 運作流程——登入後伺服器發 `Set-Cookie`,瀏覽器寫入本地,之後每次請求標頭帶上 Cookie。② Session 運作流程——登入後伺服器在記憶體或資料庫建立 Session 資料,發一個 `session_id` 給瀏覽器(通常存在 Cookie 裡),下次請求帶上 `session_id`,伺服器比對後識別使用者狀態。
