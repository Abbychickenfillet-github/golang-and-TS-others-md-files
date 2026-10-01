![[學習部署_圖解_建置時與執行時是兩個時間點-五個只在正式環境炸的雷_ISO5807_2026-09-30.png]]

<!--
貼到 iThome 之前要做兩件事：
一、把上面這行 Obsidian wikilink 刪掉。
二、到 iThome 編輯器上傳同名的 .png，用它回傳的網址改寫成 ![圖說](那個網址)。
本機相對路徑與 wikilink 在 iThome 上都不會有圖，因為它讀不到你電腦裡的檔案。
-->

# Day 29：本機正常、上線就炸 —— 建置時與執行時是兩個不同的時間點

## 今天要回答的五個問題

1. 我在 Zeabur 面板改了環境變數，按 Restart，網站還是舊的值。**清了瀏覽器快取也沒用，為什麼？**
2. 「LINE Pay 的環境變數到底要不要用雙引號包住」—— 我當時得到的答案是「`process.env` 會自動去除引號」。**這句話對嗎？**
3. 正式環境的 log 只有一行 `FATAL: password authentication failed for user "postgres"`。**為什麼錯誤訊息長得像資料庫的問題，其實是我自己的問題？**
4. 為什麼我改一行 React 程式碼，CI 要重跑 `npm ci` 花三分鐘？
5. `npm ci` 跟 `npm install` 差在哪，為什麼 Dockerfile 裡要加 `--ignore-scripts`？

---

## 一、承接 Day 28：這 29 天最後一段路

Day 28 把「一個參數」從規格層追到 CPU 的暫存器，再追回 Fiber 的 `return`。那是**往下**挖。

今天回到地面，往**外**看：這些東西真的要上線的時候會怎麼壞。

而我自己踩過的部署錯誤——翻了一遍 Cursor 的對話備份，光是 2025 年 9 月到 10 月就有六份——幾乎全部可以收到同一句話上：

> **建置時（build time）與執行時（runtime）是兩個不同的時間點，而同一份設定在這兩個時間點可能被兩個不同的人、用兩套不同的規矩讀走。**

這篇不講 CI/CD 的 YAML 怎麼寫，那個查文件就有。這篇講**為什麼那些錯只在正式環境出現**，以及每一個雷的機制在哪一行。

環境：Node.js v22.22.2、esbuild 0.28.2、dotenv 18.0.4。完整 demo 在文末。

---

## 二、第一個問題：改了面板按 Restart 卻沒用

先講結論再看證據：**因為那個值在 `build` 的時候就已經被寫死進 JS 檔了，`Restart` 不會重新 build。**

### 兩行看起來一模一樣的程式碼

```js
const 公開的 = process.env.NEXT_PUBLIC_API_URL
const 伺服器的 = process.env.DATABASE_URL
```

白話解釋這兩行：從程式碼的外觀完全看不出差別，兩行都是「讀一個環境變數」。但它們的命運完全不同。

我用 esbuild 的 `define` 打包一次——**這就是 Next.js 對 `NEXT_PUBLIC_*` 做的事，也是 Vite 的 `define`、CRA 的 `REACT_APP_`**：

```js
esbuild.buildSync({
  entryPoints: ['src/app.js'],
  bundle: true,
  outfile: 'dist/bundle.js',
  define: { 'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(process.env.NEXT_PUBLIC_API_URL) },
})
```

白話解釋這段：`define` 的意思是「打包的時候，把左邊那串文字**當成字面值替換**成右邊的值」。所以它不是「執行的時候去讀」，是「打包的時候直接改寫原始碼」。

產出檔長這樣：

```js
var 公開的 = "https://build-time.example.com";
var 伺服器的 = process.env.DATABASE_URL;
```

```
產出檔裡找得到 "https://build-time.example.com" 這個字面值嗎：找得到
產出檔裡還剩下 process.env.NEXT_PUBLIC_API_URL 嗎：不見了
產出檔裡還剩下 process.env.DATABASE_URL 嗎：      還在
```

**第一行的 `process.env` 整串消失了，換成一個字串常數。第二行原封不動。**

### 關鍵實測：拿同一個建好的檔，改執行時的環境變數跑兩次

```
設定 NEXT_PUBLIC_API_URL=https://runtime-A.example.com
  公開的 = https://build-time.example.com
  伺服器的 = db-https://runtime-A.example.com

設定 NEXT_PUBLIC_API_URL=https://runtime-B.example.com
  公開的 = https://build-time.example.com
  伺服器的 = db-https://runtime-B.example.com
```

**「公開的」兩次都沒變，「伺服器的」每次都跟著變。**

所以那個鬼打牆的完整劇本是：

- a. 你在面板把 `NEXT_PUBLIC_API_URL` 改成新網址
- b. 按 Restart。容器重開，`node server.js` 重新執行
- c. 但那支 JS 檔**還是上次 build 出來的那一支**，裡面寫死的還是舊網址
- d. 你以為是快取，清瀏覽器快取——沒用，因為檔案本身的內容就是舊的
- e. 要改它只有一條路：**按 Redeploy ／ Rebuild，不是 Restart**

### 判準只有一句話

| 環境變數的名字 | 在哪個時間點決定 | 改了之後要做什麼 |
|---|---|---|
| 有 `NEXT_PUBLIC_` ／ `VITE_` ／ `REACT_APP_` 前綴 | **建置時** | 重新 build |
| 沒有前綴，只在伺服器端讀 | **執行時** | 重啟就好 |

**順帶一個資安提醒，而且這個比效能重要得多。** 既然那個值被寫進 JS 檔，而 JS 檔會被送到瀏覽器——**使用者打開 DevTools 的 Sources 就看得到**。

所以：**任何金鑰、密碼、token 都絕對不能放 `NEXT_PUBLIC_` 前綴。** 那個前綴的意思不是「前端可以用」，是「**我同意公開這個值**」。我自己的專案被入侵過一次，那次的教訓之一就是這個。

---

## 三、第二個問題：引號到底是誰去掉的

這一節要更正我自己一年前查到的答案。

當時我問「LINE Pay 的環境變數到底要不要雙引號包住」，得到的答案裡有這一句：

> `process.env` 會自動去除引號

**這句話是錯的。** `process.env` 只是一個物件，它不解析任何東西，只是把字串存起來。真正去引號的是**讀那個檔案的人**——而每個人的規矩不一樣。

### 實測：同一個 `.env` 檔，兩種解析器

測試檔：

```
A_PLAIN=abc123
B_DQUOTE="abc123"
C_SQUOTE='abc123'
D_SPACE="hello world"
E_HASH=abc#123
F_HASH_Q="abc#123"
H_PASS="p@ss#w0rd!"
```

實測結果（左邊是真實的 dotenv 18.0.4，右邊是 `docker run --env-file` 的規矩）：

| `.env` 檔裡那一行 | dotenv 解出來 | `docker run --env-file` 解出來 | 一樣嗎 |
|---|---|---|---|
| `A_PLAIN=abc123` | `"abc123"` | `"abc123"` | 一樣 |
| `B_DQUOTE="abc123"` | `"abc123"` | `"\"abc123\""` | **不一樣** |
| `C_SQUOTE='abc123'` | `"abc123"` | `"'abc123'"` | **不一樣** |
| `D_SPACE="hello world"` | `"hello world"` | `"\"hello world\""` | **不一樣** |
| `E_HASH=abc#123` | `"abc"` | `"abc#123"` | **不一樣** |
| `F_HASH_Q="abc#123"` | `"abc#123"` | `"\"abc#123\""` | **不一樣** |
| `H_PASS="p@ss#w0rd!"` | `"p@ss#w0rd!"` | `"\"p@ss#w0rd!\""` | **不一樣** |

八行裡有六行結果不同。

### 所以正確的答案是一張表，不是一句話

| 誰在讀那一行 | 成對引號會怎樣 |
|---|---|
| `dotenv` ／ Next.js ／ Vite ／ nodemon | 去掉 |
| `docker compose`（`.env` 與 `env_file`） | 去掉 |
| **`docker run --env-file`** | **留著，變成值的一部分** |
| shell 的 `export FOO="bar"` | 去掉（是 shell 去的，不是 Node） |
| **Zeabur ／ Vercel 這類面板的輸入框** | **你貼什麼就是什麼** |

`docker run --env-file` 這一列有官方的 issue 可查（moby/moby #46773）：回報者的例子是 `PRIVATE_KEY="This should not be altered"`，在程式裡 `process.env.PRIVATE_KEY.includes('"')` 回傳 `true`——引號真的變成值的一部分了。維護者回覆承認這跟 `docker-compose` 的行為不一致，而且**沒有寫在文件裡**。

### 那個「本機正常、上線就壞」的完整路徑

我當時的專案狀態是這樣（原始對話紀錄裡寫的）：

- `.env.development`：**使用雙引號**
- `.env.production`：**未使用雙引號**

本機跑 `npm run dev`，走 dotenv → 引號被去掉 → 沒事。
同一串貼到面板或 `--env-file` → 引號留著 → 送出去的 `channelSecret` 前後多了兩個 `"` → LINE Pay 回驗證失敗。

**而這兩邊的錯誤訊息完全不會提到引號。**

我現在的實務結論：**面板與 `--env-file` 一律不要打引號。** 值裡有空格或 `#` 的時候，寧願去改程式碼（讀進來後自己 `.trim()` 或 `.replace(/^"|"$/g, '')`）或直接換一個值，也不要靠引號。

---

## 四、順著上一節：一個 `#` 讓密碼被截斷

上一節那張表裡有一列特別值得單獨講：

```
DB_PASSWORD=p@ss#w0rd!        → dotenv 解出 "p@ss"     ← 少了 6 個字元
DB_PASSWORD="p@ss#w0rd!"      → dotenv 解出 "p@ss#w0rd!"  正確
```

原因：**沒有引號的時候，`#` 之後的東西被當成註解砍掉了。** 而資料庫服務產生的密碼**很常含有 `#`、`@` 或空格**，因為它是亂數產生的。

這個 bug 惡劣的地方在錯誤訊息：

- 你看到 `password authentication failed`
- 你去面板把密碼複製出來，跟 `.env` 裡的字串一個字一個字比對——**密碼明明是對的**
- 因為錯的不是密碼，是**你的 `.env` 檔讀到一半就停了**

### 一個五秒的檢查方法

```js
console.log('DB_PASSWORD 長度 =', (process.env.DB_PASSWORD || '').length)
```

白話解釋這行：**只印長度不印值**，所以 log 不會外洩密碼；但只要長度跟你面板上看到的不一樣，你立刻知道這是「解析問題」而不是「密碼問題」。

這一行我現在寫在每個新專案的啟動流程裡。它不優雅，但它把一個要查半天的問題變成五秒。

---

## 五、第三個問題：`FATAL: password authentication failed for user "postgres"`

2025-09-13 我的正式環境 log 只有這兩行：

```
FATAL:  password authentication failed for user "postgres"
DETAIL:  Role "postgres" does not exist.
```

我當時第一個念頭是「Zeabur 的 postgres 設定有問題嗎」。**不是。** 問題在我自己的設定檔這一行：

```js
user: process.env.DB_USER || 'postgres'
```

白話解釋這行：如果 `DB_USER` 是假值（`undefined`、空字串、`0`、`null`），就**悄悄改用** `'postgres'`。而正式環境的面板上那個變數剛好沒設到。

### 實測：三種環境變數狀態 × 三種寫法

| 情境 | `\|\|` 版本連到的 user | `??` 版本連到的 user | 啟動前檢查 |
|---|---|---|---|
| 本機（`.env` 有設） | `root` | `root` | 通過 |
| 正式（面板忘了加 `DB_USER`） | `postgres` | `postgres` | **開機就擋下來** |
| 正式（`DB_USER` 是空字串） | `postgres` | `` （空字串） | **開機就擋下來** |

三個重點：

- a. **第二列就是我那次的狀況。** `||` 讓它安靜地連去 `postgres`，所以錯誤訊息長得像「資料庫的問題」，而不是「你忘了設環境變數」
- b. **第三列是更陰的版本**：變數**有設**但是空字串（面板上很容易存成這樣）。`||` 一樣會掉進預設值；而 `??` 只認 `undefined` 與 `null`，所以 `??` 會回傳空字串——**也是錯的，只是錯得不一樣**
- c. 只有「啟動前檢查」會在**部署的那一刻**就失敗，而不是等到有人按下登入才失敗

### 所以結論不是「把 `||` 換成 `??`」

```js
function 啟動前檢查(env, 必要的) {
  const 缺的 = 必要的.filter((k) => env[k] === undefined || env[k] === '')
  if (缺的.length > 0) {
    throw new Error(`缺少必要的環境變數：${缺的.join(', ')}`)
  }
}
```

白話解釋這段：把「必須要有」的變數列成一張清單，開機的時候掃一遍，`undefined` 跟空字串都算缺——只要缺任何一個就直接丟錯，不讓服務起來。

> **連線設定這種東西不該有預設值。缺了就不要讓服務起來。**

預設值的價值是「讓新同事 clone 下來就能跑」，但它的代價是「正式環境缺東西的時候不會說」。**這個交換在開發階段划算，在部署階段非常不划算**——因為部署階段最貴的成本就是「不知道哪裡壞了」。

---

## 六、第四個問題：改一行程式碼，為什麼 `npm ci` 要重跑

Docker 的快取規則只有一句：

> **某一層的輸入變了，那一層以及它後面的每一層，全部重跑。**

而 `COPY` 那一層的輸入，就是被複製進去的那些檔案的內容。

### 實測：只改一行 React 程式碼

**壞的順序：**

```dockerfile
COPY . .
RUN npm ci
RUN npm run build
```

| 第幾層 | 指令 | 快取命中 |
|---|---|---|
| 1 | `COPY . .` | **失效，要重跑** |
| 2 | `RUN npm ci` | **失效，要重跑** |
| 3 | `RUN npm run build` | **失效，要重跑** |

重跑 **3 ／ 3** 層。

**好的順序：**

```dockerfile
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```

| 第幾層 | 指令 | 快取命中 |
|---|---|---|
| 1 | `COPY package*.json ./` | 命中 |
| 2 | `RUN npm ci` | 命中 |
| 3 | `COPY . .` | **失效，要重跑** |
| 4 | `RUN npm run build` | **失效，要重跑** |

重跑 **2 ／ 4** 層。

差別就在那一句 `COPY . .`：它把「**會常常改的原始碼**」跟「**幾乎不會改的 `package-lock.json`**」綁在同一層。只要任何一個檔案變了，這一層就失效，後面的 `npm ci` 也跟著失效。

而且要講清楚：**好的順序沒有作弊。** 我也測了「真的改了 `package.json`」的情況，那時候四層全部失效——`npm ci` 本來就該重跑。好的順序只是讓「重跑」發生在真的該重跑的時候。

---

## 七、第五個問題：`npm ci` 與 `npm install`

兩個指令最重要的差別不是速度，是**誰說了算**：

| | `npm install` | `npm ci` |
|---|---|---|
| 以誰為準 | `package.json` 的版本範圍 | **`package-lock.json` 的確切版本** |
| 會不會改 lockfile | **會** | 不會，只讀 |
| `node_modules` 已存在時 | 增量更新 | **整個刪掉重裝** |
| 兩邊對不上時 | 安靜地更新 lockfile | **直接失敗** |

最後一列是它在 CI 裡真正的價值。我實際做了一次實驗：lockfile 裡是 `dotenv 16.4.5`，我只改 `package.json` 要求 `^17.0.0`，然後跑 `npm ci`：

```
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and
npm error package-lock.json or npm-shrinkwrap.json are in sync.
npm error Invalid: lock file's dotenv@16.4.5 does not satisfy dotenv@17.4.2
```

白話解釋這段錯誤：它不是在抱怨版本太舊，是在說「**你的兩份清單不一致，我不知道該聽誰的，所以我不裝**」。

**這正是「本機正常、上線炸掉」的相反面——它讓 CI 早一步炸給你看。** 如果 CI 用的是 `npm install`，它會安靜地裝一個跟你本機不一樣的版本，然後那個差異會在正式環境以某個莫名其妙的方式出現。

### `--ignore-scripts` 擋掉的是什麼

npm 套件可以在自己的 `package.json` 裡宣告 `preinstall` ／ `install` ／ `postinstall`，這些指令會在安裝的時候**自動執行**，而且是用你的權限。

也就是說：**`npm ci` 這一個指令，等於同意執行相依樹裡每一個套件帶的腳本。** 一個被入侵的套件、或一個搶註冊相似名稱的套件，就是在這裡動手的。

```dockerfile
RUN npm ci --ignore-scripts
```

白話解釋這行：照 lockfile 把檔案裝好，但**不要執行任何套件自己的安裝腳本**。

代價要講清楚：有些套件（`sharp`、`bcrypt`、`esbuild`、Playwright 這類含原生二進位檔的）真的需要 `postinstall` 才能下載對應平台的檔案，加了這個旗標它們會壞掉。實務上的做法是**預設加上，壞掉的那幾個再個別處理**，而不是因為有幾個需要就整包放行。

---

## 八、把五個雷收成一句話

回頭看這五個雷，它們的成因是同一個：

> **同一份設定，在兩個不同的時間點，被兩個不同的人讀了，而那兩個人的規矩不一樣。**

- `NEXT_PUBLIC_*`：**build 時**被 esbuild 讀走寫死，**run 時**的你以為還能改
- 引號：**本機**被 dotenv 去掉，**容器裡**被 `--env-file` 留著
- `#` 截斷：**你**看到的是完整密碼，**dotenv** 看到的是註解
- `||` 預設值：**本機**的你有設，**正式環境**的你沒設，而程式碼兩邊都不吭聲
- `npm install`：**你本機**裝的是 A 版本，**CI** 裝的是 B 版本

所以除錯的第一句話不該是「是不是快取」，該是：

> **「這個值是在 build 的時候決定的，還是在 run 的時候決定的？」**

答錯這一題，你會在錯的地方找一整個下午。我找過。

---

## 九、一份可以直接抄的檢查清單

部署前照順序跑一遍，每一項都對應上面的某一節：

- a. **祕密有沒有不小心掛上 `NEXT_PUBLIC_` 前綴** —— 有的話它現在就在使用者的 DevTools 裡
- b. **改了 `NEXT_PUBLIC_*` 之後按的是 Redeploy 還是 Restart** —— Restart 沒用
- c. **面板與 `--env-file` 裡的值有沒有多餘的引號** —— 一律不要打
- d. **密碼裡有沒有 `#` 或空格** —— 有的話先用「印長度」那一行確認讀進來的長度對不對
- e. **連線設定有沒有 `||` 預設值** —— 換成啟動前檢查，缺了就不要起來
- f. **Dockerfile 是不是先 `COPY package*.json` 再 `npm ci`** —— 順序決定快取
- g. **CI 用的是 `npm ci` 不是 `npm install`** —— 讓它早一步炸
- h. **`npm ci` 有沒有加 `--ignore-scripts`** —— 加了之後看哪幾個套件壞掉，個別處理
- i. **`.dockerignore` 有沒有擋掉 `.env*`、`.git`、`node_modules`** —— 不然你的祕密會被 build 進 image 裡
- j. **正式環境的錯誤 log 有沒有真的送到你看得到的地方** —— 上面每一個雷，都是靠一行 log 才找到的

第 i 項我自己補得很晚。Docker 的 `COPY . .` 會把 `.env` 一起複製進 image，而 image 是可以被 `docker history` 一層一層挖開來看的。

---

## 十、面試被問到的話，我會怎麼講

「你有部署經驗嗎」這題很容易答成「我會寫 Dockerfile、會設 GitHub Actions」——那是在講工具。我會講**一個具體的錯，以及它的機制**：

1. **我踩過的最有代表性的錯是改了面板的環境變數卻沒生效。** 原因是 `NEXT_PUBLIC_*` 在 build 的時候就被 bundler 換成字面值了，Restart 不會重新 build
2. **同一個機制的資安面**：既然它被寫進 JS 檔，使用者就看得到，所以祕密不能放那個前綴
3. **第二個代表性的錯是 `FATAL: password authentication failed for user "postgres"`。** 表面像資料庫問題，實際是我自己的 `|| 'postgres'` 預設值把「忘了設」翻譯成「連去別的地方」
4. **從那次之後我改用啟動前檢查**，連線設定缺任何一個就不讓服務起來，讓它在部署那一刻炸而不是等使用者按登入
5. **這兩個錯的共同成因是「建置時與執行時分不清楚」**，而我現在除錯的第一個問題就是「這個值是 build 時決定還是 run 時決定」

第 3、4 點是我覺得最能證明有實戰的部分，因為它不是「我知道這個概念」，是「**我為了這個概念改了流程**」。

---

## 完整 demo 原始碼

檔名 `day29-build-time-vs-runtime.js`。Part A 會試著用 `esbuild`、Part C 與 D 會試著用 `dotenv`，**兩個都沒裝也跑得起來**——我寫了等價的最小替代品，會自動切過去並印出提示。要跑完整版：

```
npm install esbuild dotenv
node day29-build-time-vs-runtime.js
```

我的環境是 Node.js v22.22.2、esbuild 0.28.2、dotenv 18.0.4。

```js
/**
 * day29-build-time-vs-runtime.js
 *
 * 本機正常、正式環境炸掉：幾乎都是「建置時」與「執行時」分不清楚
 * 搭配 iThome 鐵人賽 2026 Day 29
 *
 * 執行方式：node day29-build-time-vs-runtime.js
 * 環境：Node.js v18 以上
 *
 * 依賴：Part A 會試著用 esbuild，Part C 會試著用 dotenv。
 *      兩個都沒裝也跑得起來 —— 我寫了等價的最小替代品，會自動切過去並印出提示。
 *      要跑完整版：npm install esbuild dotenv
 *
 * 六個 Part
 *   Part A  兩個時間點：NEXT_PUBLIC_* 在 build 的時候就被寫死了
 *   Part B  `||` 預設值是「只在正式環境炸」的製造機
 *   Part C  引號到底是誰去掉的：四種解析器，三種答案
 *   Part D  一個 # 字元讓密碼被截斷
 *   Part E  Dockerfile 的 COPY 順序決定 npm ci 要不要重跑
 *   Part F  npm ci 與 npm install 差在哪，--ignore-scripts 擋掉什麼
 */

'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')

// ------------------------------------------------------------
// 共用工具
// ------------------------------------------------------------

function 分隔線(title) {
  console.log('\n' + '='.repeat(70))
  console.log(title)
  console.log('='.repeat(70))
}

function 小標(title) {
  console.log('\n--- ' + title + ' ---')
}

function 安全載入(名稱) {
  try { return require(名稱) } catch (error) { return null }
}

const esbuild = 安全載入('esbuild')
const dotenv = 安全載入('dotenv')

/** 這一輪要用的暫存資料夾 */
const 暫存 = fs.mkdtempSync(path.join(os.tmpdir(), 'day29-'))

// ============================================================
// Part A：兩個時間點
// ============================================================

/**
 * 最小版的「建置時字面值替換」
 * 這就是 Next.js 對 NEXT_PUBLIC_* 做的事，也是 esbuild 的 define、Vite 的 define
 * 白話解釋：在打包的時候，把原始碼裡的 process.env.XXX 這串文字
 *          直接換成當下那個環境變數的「值」，之後檔案裡就再也沒有 process.env 了
 */
function 最小版define(原始碼, 替換表) {
  let out = 原始碼
  for (const [樣板, 值] of Object.entries(替換表)) {
    out = out.split(樣板).join(JSON.stringify(值))
  }
  return out
}

function partA() {
  分隔線('Part A：NEXT_PUBLIC_* 在 build 的時候就被寫死了')

  const 原始碼 = [
    "const 公開的 = process.env.NEXT_PUBLIC_API_URL",
    "const 伺服器的 = process.env.DATABASE_URL",
    "console.log('公開的 =', 公開的)",
    "console.log('伺服器的 =', 伺服器的)",
  ].join('\n')

  console.log('  原始碼（兩行都是 process.env，看起來一模一樣）：')
  console.log('')
  for (const l of 原始碼.split('\n')) console.log('    ' + l)

  // ---- 建置：此刻 NEXT_PUBLIC_API_URL 的值會被寫進產出檔 ----
  const 建置時的值 = 'https://build-time.example.com'
  const 入口 = path.join(暫存, 'app.js')
  const 產出 = path.join(暫存, 'bundle.js')
  fs.writeFileSync(入口, 原始碼)

  if (esbuild) {
    esbuild.buildSync({
      entryPoints: [入口],
      bundle: true,
      outfile: 產出,
      define: { 'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(建置時的值) },
      platform: 'node',
      charset: 'utf8',
    })
    console.log(`\n  用真實的 esbuild ${require('esbuild/package.json').version} 打包，define 設成建置時的值`)
  } else {
    fs.writeFileSync(產出, 最小版define(原始碼, { 'process.env.NEXT_PUBLIC_API_URL': 建置時的值 }))
    console.log('\n  （沒有安裝 esbuild，改用我寫的最小版 define，機制一樣）')
  }

  console.log('\n  產出檔的內容：')
  console.log('')
  const 產出內容 = fs.readFileSync(產出, 'utf8').trim()
  // esbuild 會在最前面加一行「來源檔路徑」的註解，那是隨機暫存路徑，印出來只是雜訊
  for (const l of 產出內容.split('\n')) {
    if (l.startsWith('// ') && l.includes('app.js')) continue
    console.log('    ' + l)
  }

  console.log('')
  console.log(`  產出檔裡找得到 "${建置時的值}" 這個字面值嗎：`
    + (fs.readFileSync(產出, 'utf8').includes(建置時的值) ? '找得到' : '找不到'))
  console.log('  產出檔裡還剩下 process.env.NEXT_PUBLIC_API_URL 嗎：'
    + (fs.readFileSync(產出, 'utf8').includes('NEXT_PUBLIC_API_URL') ? '還在' : '不見了'))
  console.log('  產出檔裡還剩下 process.env.DATABASE_URL 嗎：      '
    + (fs.readFileSync(產出, 'utf8').includes('DATABASE_URL') ? '還在' : '不見了'))

  小標('關鍵實測：拿同一個已經建好的檔，改執行時的環境變數再跑兩次')

  const { execFileSync } = require('child_process')
  for (const v of ['https://runtime-A.example.com', 'https://runtime-B.example.com']) {
    const out = execFileSync(process.execPath, [產出], {
      env: { ...process.env, NEXT_PUBLIC_API_URL: v, DATABASE_URL: 'db-' + v },
      encoding: 'utf8',
    })
    console.log(`\n  設定 NEXT_PUBLIC_API_URL=${v}`)
    for (const l of out.trim().split('\n')) console.log('    ' + l)
  }

  console.log('')
  console.log('  **兩次的「公開的」都是 build-time 那個值，一次都沒變。**')
  console.log('  **「伺服器的」每次都跟著環境變數變。**')
  console.log('')
  console.log('  這件事的實務後果，就是那個最常見的部署鬼打牆：')
  console.log('')
  console.log('    你在 Zeabur／Vercel／Railway 的環境變數面板改了 NEXT_PUBLIC_API_URL，')
  console.log('    按下 Restart，打開網站 —— 還是舊的網址。')
  console.log('    你以為是快取，清了瀏覽器快取，還是舊的。')
  console.log('')
  console.log('  因為那個值早在 build 的時候就被寫進 JS 檔了。**Restart 不會重新 build。**')
  console.log('  要改它只有一條路：**重新 build**（在面板上按 Redeploy／Rebuild，不是 Restart）。')
  console.log('')
  console.log('  一句話的判準：')
  console.log('    名字有 NEXT_PUBLIC_ / VITE_ / REACT_APP_ 前綴的 → 建置時，改了要重 build')
  console.log('    沒有前綴、只在伺服器端讀的                    → 執行時，改了重啟就生效')
  console.log('')
  console.log('  順帶一個資安提醒：既然它被寫進 JS 檔，**使用者打開 DevTools 就看得到**。')
  console.log('  所以任何金鑰、密碼、token 都絕對不能放 NEXT_PUBLIC_ 前綴。那個前綴的意思就是「我公開」。')
}

// ============================================================
// Part B：|| 預設值
// ============================================================

/** 她真實專案裡的寫法（簡化） */
function 用or的設定(env) {
  return {
    user: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD || 'postgres',
    host: env.DB_HOST || 'localhost',
    port: env.DB_PORT || 5432,
  }
}

/** 改成 ?? */
function 用問號問號的設定(env) {
  return {
    user: env.DB_USER ?? 'postgres',
    password: env.DB_PASSWORD ?? 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: env.DB_PORT ?? 5432,
  }
}

/** 開機就檢查，缺一個就不准起來 */
function 啟動前檢查(env, 必要的) {
  const 缺的 = 必要的.filter((k) => env[k] === undefined || env[k] === '')
  if (缺的.length > 0) {
    throw new Error(`缺少必要的環境變數：${缺的.join(', ')}`)
  }
  return { user: env.DB_USER, password: env.DB_PASSWORD, host: env.DB_HOST, port: Number(env.DB_PORT) }
}

function partB() {
  分隔線('Part B：`||` 預設值是「只在正式環境炸」的製造機')

  console.log('  背景：我自己踩過這個。正式環境的 log 只有一行')
  console.log('')
  console.log('    FATAL:  password authentication failed for user "postgres"')
  console.log('    DETAIL:  Role "postgres" does not exist.')
  console.log('')
  console.log('  當時查了很久，一直在想「是 Zeabur 的 postgres 設定有問題嗎」。')
  console.log('  不是。問題在我自己這一行：')
  console.log('')
  console.log("    user: process.env.DB_USER || 'postgres'")
  console.log('')
  console.log('  白話解釋這行：如果 DB_USER 是假值（undefined、空字串、0、null），')
  console.log("  就悄悄改用 'postgres'。而正式環境上那個變數剛好沒設到。")

  小標('實測：三種環境變數狀態 × 三種寫法')

  const 情境 = [
    ['本機（.env 有設）', { DB_USER: 'root', DB_PASSWORD: 'devpass', DB_HOST: 'localhost', DB_PORT: '5432' }],
    ['正式（面板忘了加 DB_USER）', { DB_PASSWORD: 'prodpass', DB_HOST: 'db.zeabur.internal', DB_PORT: '5432' }],
    ['正式（DB_USER 打成空字串）', { DB_USER: '', DB_PASSWORD: 'prodpass', DB_HOST: 'db.zeabur.internal', DB_PORT: '5432' }],
  ]

  console.log('')
  console.log('| 情境 | `\\|\\|` 版本連到的 user | `??` 版本連到的 user | 啟動前檢查 |')
  console.log('|---|---|---|---|')
  for (const [名稱, env] of 情境) {
    const a = 用or的設定(env).user
    const b = 用問號問號的設定(env).user
    let c
    try { 啟動前檢查(env, ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT']); c = '通過' }
    catch (e) { c = '**開機就擋下來**' }
    console.log(`| ${名稱} | \`${a}\` | \`${b === undefined ? 'undefined' : b}\` | ${c} |`)
  }

  console.log('')
  console.log('  讀這張表的三個重點：')
  console.log('')
  console.log('    a. 第二列就是我那次的狀況。`||` 讓它安靜地連去 postgres，')
  console.log('       所以錯誤訊息長得像「資料庫的問題」，而不是「你忘了設環境變數」')
  console.log('    b. 第三列是更陰的版本：變數**有設**但是空字串。`||` 一樣會掉進預設值，')
  console.log("       而 `??` 只認 undefined 與 null，所以 `??` 會回傳空字串 —— 也是錯的，只是錯得不一樣")
  console.log('    c. 只有「啟動前檢查」會在**部署的那一刻**就失敗，而不是等到有人按下登入才失敗')
  console.log('')
  console.log('  所以結論不是「把 `||` 換成 `??`」，是：')
  console.log('')
  console.log('    **連線設定這種東西不該有預設值。** 缺了就不要讓服務起來。')
  console.log('    預設值的價值是「讓新同事 clone 下來就能跑」，')
  console.log('    但它的代價是「正式環境缺東西的時候不會說」。這個交換在部署階段很不划算。')
}

// ============================================================
// Part C：引號是誰去掉的
// ============================================================

/**
 * 最小版的 dotenv parser
 * 只做三件事：切 KEY=VALUE、去掉成對的引號、沒引號時砍掉 # 之後的東西
 */
function 最小版dotenv(內容) {
  const out = {}
  for (const 原行 of 內容.split('\n')) {
    const 行 = 原行.trim()
    if (行 === '' || 行.startsWith('#')) continue
    const i = 行.indexOf('=')
    if (i < 0) continue
    const key = 行.slice(0, i).trim()
    let value = 行.slice(i + 1).trim()
    const 有雙引號 = value.startsWith('"') && value.endsWith('"') && value.length >= 2
    const 有單引號 = value.startsWith("'") && value.endsWith("'") && value.length >= 2
    if (有雙引號 || 有單引號) {
      value = value.slice(1, -1)            // 成對引號 → 去掉
    } else {
      const j = value.indexOf('#')
      if (j >= 0) value = value.slice(0, j).trim()   // 沒引號 → # 之後算註解
    }
    out[key] = value
  }
  return out
}

/** docker run --env-file 的做法：整行 = 之後的東西原封不動 */
function docker版envfile(內容) {
  const out = {}
  for (const 原行 of 內容.split('\n')) {
    const 行 = 原行.trim()
    if (行 === '' || 行.startsWith('#')) continue
    const i = 行.indexOf('=')
    if (i < 0) continue
    out[行.slice(0, i)] = 行.slice(i + 1)   // ← 不去引號，不砍 #
  }
  return out
}

const 測試用env = [
  'A_PLAIN=abc123',
  'B_DQUOTE="abc123"',
  'C_SQUOTE=\'abc123\'',
  'D_SPACE="hello world"',
  'E_HASH=abc#123',
  'F_HASH_Q="abc#123"',
  'G_EMPTY=',
  'H_PASS="p@ss#w0rd!"',
].join('\n')

function partC() {
  分隔線('Part C：引號到底是誰去掉的 —— 四種解析器，三種答案')

  console.log('  我以前得到的答案是「`process.env` 會自動去除引號」。**這句話是錯的。**')
  console.log('  `process.env` 只是一個物件，它不解析任何東西，只是把字串存起來。')
  console.log('  真正去引號的是**讀那個檔案的人**，而每個人的規矩不一樣。')

  小標('實測一：dotenv 的語意（Next.js、Vite、nodemon 走的都是這一套）')

  const 用真的dotenv = dotenv !== null
  const 解析結果 = 用真的dotenv ? dotenv.parse(測試用env) : 最小版dotenv(測試用env)
  console.log(用真的dotenv
    ? `  （用真實的 dotenv ${require('dotenv/package.json').version}）`
    : '  （沒有安裝 dotenv，改用我寫的最小版，語意一樣）')
  console.log('')
  for (const [k, v] of Object.entries(解析結果)) {
    console.log('    ' + k.padEnd(10) + ' => ' + JSON.stringify(v))
  }

  小標('實測二：同一個檔，換成 docker run --env-file 的規矩')

  const docker結果 = docker版envfile(測試用env)
  console.log('')
  for (const [k, v] of Object.entries(docker結果)) {
    console.log('    ' + k.padEnd(10) + ' => ' + JSON.stringify(v))
  }

  小標('兩邊放在一起看')

  console.log('')
  console.log('| .env 檔裡那一行 | dotenv 解出來 | docker --env-file 解出來 | 一樣嗎 |')
  console.log('|---|---|---|---|')
  for (const 行 of 測試用env.split('\n')) {
    const k = 行.slice(0, 行.indexOf('='))
    const a = JSON.stringify(解析結果[k])
    const b = JSON.stringify(docker結果[k])
    console.log(`| \`${行}\` | \`${a}\` | \`${b}\` | ${a === b ? '一樣' : '**不一樣**'} |`)
  }

  console.log('')
  console.log('  所以「LINE Pay 的環境變數要不要用雙引號包住」這個問題，')
  console.log('  **沒有一個跟環境無關的答案。** 它取決於那一行是誰在讀：')
  console.log('')
  console.log('| 誰在讀 | 成對引號會怎樣 |')
  console.log('|---|---|')
  console.log('| `dotenv` ／ Next.js ／ Vite ／ nodemon | 去掉 |')
  console.log('| `docker compose`（`.env` 與 `env_file`） | 去掉 |')
  console.log('| `docker run --env-file` | **留著，變成值的一部分** |')
  console.log('| shell 的 `export FOO="bar"` | 去掉（是 shell 去的，不是 Node） |')
  console.log('| Zeabur／Vercel 這類面板的輸入框 | **你貼什麼就是什麼**，引號會留著 |')
  console.log('')
  console.log('  這就是那個經典的「本機正常、上線就壞」：')
  console.log('    `.env.development` 寫了引號 → dotenv 幫你去掉 → 本機沒事')
  console.log('    同一串貼到面板或 --env-file → 引號留著 → 送出去的 channelSecret 多了兩個 " → 驗證失敗')
  console.log('')
  console.log('  我自己的實務結論：**面板與 --env-file 一律不要打引號。**')
  console.log('  值裡有空格或 # 的時候，寧願去改程式碼或改值，也不要靠引號。')
}

// ============================================================
// Part D：一個 # 讓密碼被截斷
// ============================================================

function partD() {
  分隔線('Part D：一個 # 字元讓密碼被截斷')

  const 密碼 = 'p@ss#w0rd!'
  const 檔案內容 = [
    `DB_PASSWORD_無引號=${密碼}`.replace('無引號', 'PLAIN'),
    `DB_PASSWORD_有引號="${密碼}"`.replace('有引號', 'QUOTED'),
  ].join('\n')

  const 結果 = dotenv ? dotenv.parse(檔案內容) : 最小版dotenv(檔案內容)

  console.log(`  真正的密碼是：${JSON.stringify(密碼)}`)
  console.log('')
  console.log('  .env 檔裡這樣寫：')
  console.log('')
  for (const l of 檔案內容.split('\n')) console.log('    ' + l)
  console.log('')
  console.log('  dotenv 解出來：')
  console.log('')
  for (const [k, v] of Object.entries(結果)) {
    const 對不對 = v === 密碼 ? '正確' : `**被截斷了**（少了 ${密碼.length - v.length} 個字元）`
    console.log('    ' + k.padEnd(20) + ' => ' + JSON.stringify(v) + '   ' + 對不對)
  }

  console.log('')
  console.log('  原因：沒有引號的時候，`#` 之後的東西被當成註解砍掉了。')
  console.log('  而資料庫給的密碼**很常含有 # 或空格**，因為它是亂數產生的。')
  console.log('')
  console.log('  這個 bug 的惡劣之處在於它的錯誤訊息：')
  console.log('    你會看到 `password authentication failed`，')
  console.log('    然後你去面板把密碼複製貼上再確認一次 —— 密碼明明是對的。')
  console.log('    因為錯的不是密碼，是**你的 .env 檔讀到一半就停了**。')
  console.log('')
  console.log('  一個五秒的檢查方法：在連線之前先印出長度（不要印內容）')
  console.log('')
  console.log("    console.log('DB_PASSWORD 長度 =', (process.env.DB_PASSWORD || '').length)")
  console.log('')
  console.log('  白話解釋這行：只印長度不印值，log 不會外洩密碼，')
  console.log('  但只要長度跟你面板上看到的不一樣，你立刻知道是解析問題不是密碼問題。')
}

// ============================================================
// Part E：Dockerfile 的 COPY 順序
// ============================================================

/** 算一層的快取鍵：上一層的鍵 ＋ 這一層的指令 ＋ 它複製到的檔案內容 */
function 算層鍵(上一層鍵, 指令, 檔案們) {
  const h = crypto.createHash('sha256')
  h.update(上一層鍵).update('\n').update(指令)
  for (const [名稱, 內容] of Object.entries(檔案們)) h.update('\n' + 名稱 + '\n' + 內容)
  return h.digest('hex').slice(0, 12)
}

/** 跑一次建置，回傳每一層的快取鍵 */
function 建置(層們, 專案檔案) {
  let 上一層 = 'FROM node:22-alpine'
  const 結果 = []
  for (const 層 of 層們) {
    const 依賴的檔案 = {}
    for (const f of 層.依賴) 依賴的檔案[f] = 專案檔案[f]
    const 鍵 = 算層鍵(上一層, 層.指令, 依賴的檔案)
    結果.push({ 指令: 層.指令, 鍵 })
    上一層 = 鍵
  }
  return 結果
}

function partE() {
  分隔線('Part E：Dockerfile 的 COPY 順序決定 npm ci 要不要重跑')

  console.log('  Docker 的快取規則只有一句：')
  console.log('    **某一層的輸入變了，那一層以及它後面的每一層，全部重跑。**')
  console.log('  而 `COPY` 那一層的輸入，就是被複製進去的那些檔案的內容。')

  const 專案檔案 = {
    'package.json': '{"dependencies":{"react":"19.3.0"}}',
    'package-lock.json': '{"lockfileVersion":3}',
    'src/App.jsx': 'export default function App(){ return <h1>v1</h1> }',
  }

  const 壞的 = [
    { 指令: 'COPY . .', 依賴: ['package.json', 'package-lock.json', 'src/App.jsx'] },
    { 指令: 'RUN npm ci', 依賴: [] },
    { 指令: 'RUN npm run build', 依賴: [] },
  ]
  const 好的 = [
    { 指令: 'COPY package*.json ./', 依賴: ['package.json', 'package-lock.json'] },
    { 指令: 'RUN npm ci', 依賴: [] },
    { 指令: 'COPY . .', 依賴: ['package.json', 'package-lock.json', 'src/App.jsx'] },
    { 指令: 'RUN npm run build', 依賴: [] },
  ]

  function 比一次(標題, 層們, 改了什麼, 改後檔案) {
    const 前 = 建置(層們, 專案檔案)
    const 後 = 建置(層們, 改後檔案)
    console.log(`\n  【${標題}】改動：${改了什麼}`)
    console.log('')
    console.log('| 第幾層 | 指令 | 快取命中 |')
    console.log('|---|---|---|')
    let 重跑 = 0
    前.forEach((層, i) => {
      const 命中 = 層.鍵 === 後[i].鍵
      if (!命中) 重跑 += 1
      console.log(`| ${i + 1} | \`${層.指令}\` | ${命中 ? '命中' : '**失效，要重跑**'} |`)
    })
    console.log(`\n  重跑的層數：${重跑} ／ ${前.length}`)
    return 重跑
  }

  const 改了程式碼 = { ...專案檔案, 'src/App.jsx': 'export default function App(){ return <h1>v2</h1> }' }

  小標('情境一：只改了一行 React 程式碼（最常見的日常改動）')
  const a = 比一次('壞的順序：先 COPY . . 再 npm ci', 壞的, '把 v1 改成 v2', 改了程式碼)
  const b = 比一次('好的順序：先 COPY package*.json 再 npm ci', 好的, '把 v1 改成 v2', 改了程式碼)

  console.log('')
  console.log(`  壞的順序：**連 npm ci 都要重跑**（${a} 層失效）`)
  console.log(`  好的順序：npm ci 命中快取，只重跑後面兩層（${b} 層失效）`)
  console.log('')
  console.log('  差別就在那一句：`COPY . .` 把「會常常改的原始碼」跟')
  console.log('  「幾乎不會改的 package-lock.json」綁在同一層。')
  console.log('  只要任何一個檔案變了，這一層就失效，後面的 `npm ci` 也跟著失效。')

  小標('情境二：真的改了依賴（動了 package.json）')
  const 改了依賴 = { ...專案檔案, 'package.json': '{"dependencies":{"react":"19.3.1"}}' }
  比一次('好的順序', 好的, '把 react 升到 19.3.1', 改了依賴)
  console.log('')
  console.log('  這時候 npm ci **本來就該重跑**，好的順序並沒有作弊。')
  console.log('  它只是讓「重跑」發生在真的該重跑的時候。')

  console.log('')
  console.log('  要老實說的地方：這裡我算的是**快取鍵**，不是真實的秒數。')
  console.log('  我在這個容器裡沒有可用的 docker daemon，所以量不到實際時間。')
  console.log('  但「哪些層會失效」這件事是 Docker 的規則決定的，跟機器快慢無關。')
}

// ============================================================
// Part F：npm ci 與 npm install
// ============================================================

function partF() {
  分隔線('Part F：npm ci 與 npm install 差在哪，--ignore-scripts 擋掉什麼')

  console.log('  兩個指令最重要的差別不是速度，是**誰說了算**：')
  console.log('')
  console.log('| | `npm install` | `npm ci` |')
  console.log('|---|---|---|')
  console.log('| 以誰為準 | `package.json` 的版本範圍 | **`package-lock.json` 的確切版本** |')
  console.log('| 會不會改 lockfile | **會** | 不會，只讀 |')
  console.log('| `node_modules` 已存在時 | 增量更新 | **整個刪掉重裝** |')
  console.log('| 兩邊對不上時 | 安靜地更新 lockfile | **直接失敗** |')
  console.log('')
  console.log('  最後一列是它在 CI 裡真正的價值。我實際跑過一次：')
  console.log('  lockfile 裡是 dotenv 16.4.5，我只改 package.json 要求 ^17.0.0，然後 npm ci：')
  console.log('')
  console.log('    npm error code EUSAGE')
  console.log('    npm error `npm ci` can only install packages when your package.json and')
  console.log('    npm error package-lock.json or npm-shrinkwrap.json are in sync.')
  console.log('    npm error Invalid: lock file\'s dotenv@16.4.5 does not satisfy dotenv@17.4.2')
  console.log('')
  console.log('  白話解釋這段錯誤：它不是在抱怨版本太舊，是在說「你的兩份清單不一致，')
  console.log('  我不知道該聽誰的，所以我不裝」。')
  console.log('')
  console.log('  **這正是「本機正常、CI 炸掉」的相反面 —— 它讓 CI 早一步炸給你看。**')
  console.log('  如果 CI 用的是 npm install，它會安靜地裝一個跟你本機不一樣的版本，')
  console.log('  然後那個差異會在正式環境以某個莫名其妙的方式出現。')

  小標('--ignore-scripts 擋掉的是什麼')

  console.log('  npm 套件可以在 package.json 裡宣告 preinstall／install／postinstall，')
  console.log('  這些指令會在 `npm install` 的時候**自動執行**，而且是用你的權限。')
  console.log('')
  console.log('  也就是說：`npm ci` 這一個指令，等於同意執行相依樹裡**每一個套件**帶的腳本。')
  console.log('  一個被入侵的套件（或一個被搶註冊的相似名稱）就是在這裡動手的。')
  console.log('')
  console.log('    RUN npm ci --ignore-scripts')
  console.log('')
  console.log('  白話解釋這行：照 lockfile 把檔案裝好，但**不要執行任何套件自己的安裝腳本**。')
  console.log('')
  console.log('  代價要講清楚：有些套件（sharp、bcrypt、esbuild、Playwright 這類含原生二進位檔的）')
  console.log('  真的需要 postinstall 才能下載對應平台的檔案。加了這個旗標它們會壞掉。')
  console.log('  實務上的做法是**預設加上，壞掉的那幾個再個別處理**，')
  console.log('  而不是因為有幾個需要就整包放行。')
}

// ============================================================
// main
// ============================================================

function main() {
  console.log('day29-build-time-vs-runtime.js')
  console.log(`Node ${process.version}｜執行時間 ${new Date().toISOString()}`)
  console.log(`esbuild ${esbuild ? require('esbuild/package.json').version : '未安裝（用最小替代品）'}`
    + `｜dotenv ${dotenv ? require('dotenv/package.json').version : '未安裝（用最小替代品）'}`)

  partA()
  partB()
  partC()
  partD()
  partE()
  partF()

  分隔線('六句話總結')
  console.log('  1. NEXT_PUBLIC_* 在 build 的時候就被寫成字面值了，改面板再 Restart 沒有用，要 Rebuild')
  console.log('  2. 同一個理由，任何祕密都不能放 NEXT_PUBLIC_ 前綴 —— 那個前綴的意思就是「我公開」')
  console.log('  3. 連線設定不該有 `||` 預設值。缺了就不要讓服務起來，讓它在部署那一刻炸')
  console.log('  4. 去引號的不是 process.env，是讀檔案的那個人。docker run --env-file 不去引號')
  console.log('  5. 沒有引號的時候 # 之後會被當註解砍掉，密碼會被截斷成一半')
  console.log('  6. 先 COPY package*.json 再 npm ci，最後才 COPY . . —— 順序決定快取命不命中')

  // 收尾：清掉暫存資料夾
  try { fs.rmSync(暫存, { recursive: true, force: true }) } catch (error) { /* 清不掉就算了 */ }
}

main()
```

---

## 這篇的每個說法各自從哪來

**一、官方文件與可查證的一手來源**

| 內容 | 出處 |
|---|---|
| Next.js 會把 `NEXT_PUBLIC_` 前綴的變數在 build 時內嵌進 bundle，且「可以被瀏覽器看到」 | Next.js 官方文件，Environment Variables：https://nextjs.org/docs/app/guides/environment-variables |
| Vite 只把 `VITE_` 前綴的變數暴露給客戶端程式碼，且是靜態替換 | Vite 官方文件，Env Variables and Modes：https://vite.dev/guide/env-and-mode |
| `define` 是「建置時的字面值替換」而不是執行時查詢 | esbuild 官方文件，Define：https://esbuild.github.io/api/#define |
| `docker run --env-file` 會**保留**值兩側的引號，維護者承認這跟 docker-compose 不一致而且沒有寫進文件 | moby/moby issue #46773：https://github.com/moby/moby/issues/46773 ／ 它被標記為重複的 docker/cli issue #3630：https://github.com/docker/cli/issues/3630 |
| Compose 的 `.env` 與 `env_file` 的引號處理與 `--env-file` 不同 | docker/compose issue #8388：https://github.com/docker/compose/issues/8388 |
| `npm ci` 以 lockfile 為準、會先刪掉 `node_modules`、兩邊不一致時直接失敗 | npm 官方文件，npm-ci：https://docs.npmjs.com/cli/v11/commands/npm-ci |
| `--ignore-scripts` 的定義（不執行任何套件的生命週期腳本） | npm 官方文件，config：https://docs.npmjs.com/cli/v11/using-npm/config#ignore-scripts |
| Docker 的快取規則：某一層失效之後，它後面的每一層都會失效 | Docker 官方文件，Build cache：https://docs.docker.com/build/cache/ |
| `??` 只在左邊是 `null` 或 `undefined` 時取右邊，`\|\|` 對所有假值都取右邊 | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing |

**二、我自己的血淚史（有原始對話紀錄可以對照）**

第三、四、五節的三個錯都是我真的踩過的，原始紀錄在我 vault 的 `系統維護-C槽清理/Cursor對話備份/`：

- `2025-09-28_LINE_Pay的環境變數到底要不要雙引號包住_94888342.md` —— 第三節那句要更正的「`process.env` 會自動去除引號」就出自這一份。裡面也記著我當時的專案狀態：`.env.development` 用雙引號、`.env.production` 沒用
- `2025-09-13_2025-09-13_035439.473_UTC_4579_FATAL_pas_d7992e55.md` —— 第五節那兩行 `FATAL` log 的原始紀錄，以及「`DB_USER` 應該要改回 `root`」那個結論
- `2025-09-27_我在zeabur部屬遇到問題請幫我仔細檢查_eb35e37c.md` ／ `2025-10-02_我zeabur的後端出現這個問題怎麼辦_278af726.md` —— 部署反覆出問題的過程

**三、我實際跑出來的部分**

Part A 到 Part F 的所有輸出，由 `day29-build-time-vs-runtime.js` 實測產生（Node.js v22.22.2、esbuild 0.28.2、dotenv 18.0.4，2026-09-30 執行），可以重跑驗證。其中：

- **Part A 用的是真實的 esbuild**，`define` 的替換結果與「改執行時環境變數不影響已建置檔案」都是實跑的
- **Part C、D 用的是真實的 dotenv 18.0.4 的 `parse()`**，不是我寫的模擬
- Part F 那段 `npm error EUSAGE` 是我真的把 lockfile 與 `package.json` 弄成不一致之後跑 `npm ci` 得到的輸出

**Part C 裡 `docker run --env-file` 那一欄是我照文件與 issue 描述寫的最小模擬，不是真的跑 docker 得到的**（原因在第五點）。

**四、我沒有驗證的部分**

- **`docker run --env-file` 的行為我沒有親手跑過。** 這個容器裡有 docker 的 CLI 但**沒有可用的 daemon**，所以我沒辦法實際執行。那一欄的結果是依據 moby/moby #46773 的回報內容與維護者回覆寫的模擬。**如果你要在自己專案裡依賴這個行為，請自己跑一次 `docker run --env-file x.env alpine env` 確認你那個版本的行為**
- **Part E 我算的是快取鍵，不是真實秒數。** 同樣是因為沒有 docker daemon。「哪些層會失效」這件事是 Docker 的規則決定的，跟機器快慢無關，但「省下幾分鐘」我量不到
- **Zeabur ／ Vercel 面板「你貼什麼就是什麼」這一列，我是從自己的經驗寫的**，沒有找到官方明文。不同平台可能不同，也可能之後改掉
- **`sharp` ／ `bcrypt` ／ Playwright 加上 `--ignore-scripts` 會壞掉**，這是我從它們需要 `postinstall` 下載平台二進位檔推論的，**我沒有逐一實測**
- **第九節檢查清單第 j 項「錯誤 log 有沒有送到你看得到的地方」** 這一項沒有對應的實測，它是我從「上面每個雷都是靠一行 log 才找到的」這個經驗寫的
- **`.dockerignore` 沒擋 `.env` 會讓祕密進 image、而 image 可以用 `docker history` 挖開**，機制上成立，但**我沒有實際挖過一個 image 來驗證**

**五、幾個要講清楚的量測限制**

- **Part A 的 esbuild 是在示範機制，不是在示範 Next.js。** 真實的 `next build` 還包含 SWC 編譯、tree shaking、程式碼分割、RSC 的 server／client 邊界處理，遠比一次 `define` 複雜。我要證明的是「`define` 這個替換真的發生在 build 階段」，不是「Next.js 內部就長這樣」
- **Part C 的測試檔只有八行，覆蓋不了所有情況。** 多行值、跳脫字元（`\n`）、變數展開（`${OTHER}`）我都沒測，而這三種在不同解析器之間的差異更大
- **Part B 的三個情境是我挑的，不是窮舉。** 例如「變數值是字串 `"undefined"`」「值前後有空白」這兩種也很常見，我沒列進去
- Part E 的快取鍵是我用 sha256 自己算的，**Docker 真實的 cache key 計算方式更複雜**（包含 build context 的 metadata、BuildKit 的 mount 等等）。我要證明的是「哪些層的輸入被綁在一起」這個結構，不是重現 Docker 的雜湊

（查閱日期：2026-09-30。程式碼實測於 Node.js v22.22.2、esbuild 0.28.2、dotenv 18.0.4）

---

## 相關筆記與關聯原因

- **Day 28｜props 就是參數**：**關聯原因**：Day 28 往下追到 CPU 與 Fiber，今天往外看到部署。兩篇其實是同一個問題的兩個方向——**「這個值是在哪一個時間點被決定的」**。Day 28 的答案是「呼叫的那一刻」，今天的答案是「build 或 run，你得先分清楚」
- **Day 27｜key 不是效能設定是身分證**：**關聯原因**：兩篇都出現同一種 bug 型態——**在本機永遠測不到**。Day 27 的錯位要 30ms 內做兩個操作才重現，今天的錯全部要「換一個環境」才重現。這類 bug 的共同對策都是「理解機制」而不是「多測幾次」
- **Day 18｜前端實戰 150+ commits 的三大編譯陷阱**：**關聯原因**：那篇講的三個陷阱之一就是環境變數，今天是它的完整機制版。那篇講「我遇到了什麼」，今天講「為什麼一定會遇到」
- **Day 17｜框架資安差異**：**關聯原因**：第二節那個「祕密不能放 `NEXT_PUBLIC_`」與 Day 17 的 XSS／CSRF 是同一條線上的——**都是「哪些東西會離開你的伺服器」這個問題**。我自己的專案被入侵那次，兩邊的教訓都用到了
- **`系統維護-C槽清理/Cursor對話備份/` 那六份部署紀錄**：**關聯原因**：這篇是把那六份散落的除錯過程整理成一條機制線。那些紀錄裡有現象與當時的猜測，這篇補上「為什麼」以及「我當時哪一步猜錯了」
- **`Vite環境變數與API-BaseURL連接前後端.md`** 與 **`GitHub-Actions-CICD-ghcr與Docker映像檔.md`**：**關聯原因**：那兩篇是操作步驟，今天是操作步驟背後的那條規則。步驟會過期，規則不會

---

## 明天

29 天走完了。從 Day 1 的資料型別，到 Day 24 的 `setState` 那 12 行，到今天的建置時與執行時。

Day 30 做最後一件事：**把這 29 天串成一張可以在面試裡講 20 分鐘的地圖**——哪幾篇是同一條線上的、哪幾篇可以互相當對照組、以及被問到「你這 30 天學到什麼」的時候，怎麼用三句話講完而不是背 29 個標題。

另外會把幾個**「直覺是錯的、量測之後才看清楚」的結論**收在一起：樂觀更新買到的不是「快十倍」而是 100 毫秒那條線、`index` 當 key 的代價不是效能而是正確性、去引號的不是 `process.env`。這些是整個系列裡最值得單獨帶走的部分，因為它們剛好都是「聽起來很合理、但拿去量就不成立」的那一類。
