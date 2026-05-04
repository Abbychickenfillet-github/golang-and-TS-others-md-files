# 環境變數 (Environment Variables) 基礎

> **這份筆記回答**：
> 1. 環境變數是什麼？跟 shell 指令差在哪？
> 2. 為什麼都是全大寫？
> 3. 怎麼讀（`$VAR`）/ 怎麼寫（`VAR=value`）？
> 4. PowerShell / bash / CMD 的寫法差異？
> 5. 在 Docker / Node / Python 中怎麼用？

---

## 0. 是什麼？

**環境變數 = 給程式 / 容器看的「設定值」**——存一個名字 + 一個值，讓**其他程式能讀**。

```
名字       值
 ↓          ↓
PATH = /usr/bin:/usr/local/bin
HOME = /Users/abby
USER = abby
POSTGRES_DB = test_rag
DATABASE_URL = postgresql://user:pass@host:5432/db
```

**核心特性**：
- ✅ 全域可讀（同一個 shell session 中所有程式都看得到）
- ✅ 通常用全大寫名字
- ✅ 子程序會繼承父程序的環境變數
- ❌ 自己不能執行（不是指令）

---

## 1. 環境變數 vs Shell 指令的差異

| | 環境變數 | Shell 指令 |
|---|---------|-----------|
| **是什麼** | 儲存值的「容器」 | 能執行動作的「動詞」 |
| **能執行嗎** | ❌ 不能 | ✅ 能 |
| **例子** | `PATH`、`HOME`、`POSTGRES_DB` | `ls`、`grep`、`docker` |
| **動作** | 「**讀**它的值」或「**寫**值給它」 | 「**跑**它」 |
| **怎麼用** | `$VAR` 取值、`VAR=value` 設值 | 直接打名字 |

### 具體對比

```bash
# 環境變數（儲存資料，自己不會動）
POSTGRES_DB=test_rag       # ← 設定變數
echo $POSTGRES_DB          # ← 讀變數（要加 $），用 echo 印出
                           #   輸出：test_rag

# Shell 指令（執行動作）
ls                         # ← 執行「列出檔案」
docker run                 # ← 執行「起容器」
```

### 怎麼判斷某個東西是哪一種？

| 看到的位置 | 通常是 |
|----------|--------|
| `$XXX` 或 `${XXX}` | 環境變數 |
| 全大寫 + 底線 | 環境變數 |
| 在 `-e XXX=YYY` 的 XXX | 環境變數 |
| 行首、空格隔開的單字 | 指令 |
| 跟在 `|` 後面 | 指令 |
| 在 `man XXX` 後 | 指令（man 是查指令文件） |

---

## 2. 為什麼都是全大寫？

**慣例**——讓「環境變數」一眼就能跟「一般變數 / 指令」區分開：

```bash
# 環境變數（全大寫慣例）
DATABASE_URL=postgresql://...
NODE_ENV=production
API_KEY=sk-xxxxx

# 一般變數 / 區域變數（小寫慣例）
my_name="abby"
count=10
```

⚠️ **這只是慣例，技術上小寫也可以**——但所有 framework / library 都假設環境變數是全大寫，**不要違反**。

---

## 3. 讀寫環境變數（三種 shell 對照）

### 3.1 設定（寫入）

| Shell | 語法 | 範例 |
|-------|------|------|
| **bash / zsh** | `VAR=value` 或 `export VAR=value` | `export DATABASE_URL=postgresql://...` |
| **PowerShell** | `$env:VAR = "value"` | `$env:DATABASE_URL = "postgresql://..."` |
| **CMD** | `set VAR=value` | `set DATABASE_URL=postgresql://...` |

### 3.2 讀取（取值）

| Shell | 語法 | 範例 |
|-------|------|------|
| **bash / zsh** | `$VAR` 或 `${VAR}` | `echo $DATABASE_URL` |
| **PowerShell** | `$env:VAR` | `echo $env:DATABASE_URL` |
| **CMD** | `%VAR%` | `echo %DATABASE_URL%` |

### 3.3 列出全部

| Shell | 指令 |
|-------|------|
| **bash / zsh** | `env` 或 `printenv` |
| **PowerShell** | `Get-ChildItem env:` 或 `dir env:` |
| **CMD** | `set` |

### 3.4 ⚠️ bash 的 `=` 兩邊**不能有空格**

```bash
# ✅ 對
VAR=hello

# ❌ 錯（會被當指令）
VAR = hello
   ▲ 空格 → bash 以為 VAR 是個指令，後面是參數
```

PowerShell 反而**必須有空格**（因為是賦值運算子）：

```powershell
# ✅ 對
$env:VAR = "hello"

# ❌ 錯
$env:VAR="hello"     # 某些情況可運作但不推薦
```

### 3.5 `export` vs 不加 export（bash）

```bash
VAR=hello              # 只在「當前 shell」可見，子程序看不到
export VAR=hello       # 設成「環境變數」，子程序也看得到
```

→ **要讓 docker / node / python 看到**，**一定要 `export`**。

---

## 4. 常見內建環境變數

| 變數 | 內容 | 平台 |
|------|------|------|
| `PATH` | 哪些路徑有可執行檔（用冒號 `:` 分隔，Windows 用分號 `;`） | 全部 |
| `HOME` | 使用者家目錄（`/Users/abby` 或 `/home/abby`） | Unix |
| `USERPROFILE` | 使用者家目錄 | Windows |
| `USER` | 當前使用者名稱 | Unix |
| `USERNAME` | 當前使用者名稱 | Windows |
| `PWD` | 當前工作目錄（`pwd` 指令印的就是這個） | Unix |
| `SHELL` | 預設使用的 shell | Unix |
| `LANG` | 系統語系（如 `en_US.UTF-8`） | Unix |
| `EDITOR` | 預設文字編輯器（如 `vim`） | Unix |
| `TMPDIR` / `TMP` / `TEMP` | 暫存檔目錄 | 全部 |

### `PATH` 的特殊重要性

**為什麼打 `ls` 就能執行？** 因為 `ls` 的可執行檔在 `/usr/bin/`，而 `/usr/bin/` 在 `PATH` 裡。

```bash
# 看 PATH
echo $PATH
# /usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin

# 確認 ls 在哪
which ls
# /usr/bin/ls
```

→ **要讓某個指令全域可執行**，把它的目錄加進 `PATH`。

---

## 5. 環境變數的「範圍」(scope)

```
作業系統（永久）
    │
    ├── /etc/profile, /etc/environment        ← 所有使用者、所有 shell
    │
    └── 使用者層級
        │
        ├── ~/.bashrc, ~/.zshrc, ~/.profile   ← 你的 shell 開啟時自動載入
        │
        └── 當前 shell session
            │
            ├── export VAR=value              ← 只在這個 session
            │
            └── 子程序（docker、node、python）  ← 繼承父程序的環境變數
```

| 設定方式 | 範圍 | 重啟後還在嗎 |
|---------|------|------------|
| `export VAR=...` 直接打 | 當前 shell + 子程序 | ❌ 關掉 shell 就消失 |
| 寫進 `~/.bashrc` / `~/.zshrc` | 該使用者所有新開的 shell | ✅ 永久 |
| 寫進 `/etc/environment` | 系統全域 | ✅ 永久 |
| 寫進 `.env` 檔（搭配 framework） | 該專案 | ✅ 但只有支援 .env 的工具會讀 |

---

## 6. `.env` 檔案

很多 framework 支援用 `.env` 檔來定義環境變數（更方便管理）：

```bash
# .env
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
API_KEY=sk-xxxxx
NODE_ENV=development
```

支援 `.env` 的工具：
- **Node.js**：用 `dotenv` 套件 (`require('dotenv').config()`)
- **Python**：用 `python-dotenv` 套件
- **Docker Compose**：自動讀同目錄的 `.env`
- **Vite / Next.js**：原生支援

⚠️ **`.env` 一定要加進 `.gitignore`**——通常含密碼 / API key。

```bash
# .gitignore
.env
.env.local
.env.*.local
```

通常另外建一個 `.env.example` 提交到 git，當範本：

```bash
# .env.example （提交到 git）
DATABASE_URL=
API_KEY=
NODE_ENV=
```

---

## 7. 在不同工具中怎麼用

### 7.1 Docker

#### Docker run 的 `-e` flag

```bash
docker run -e POSTGRES_DB=test_rag postgres
        # ↑ 把環境變數傳進容器內
```

#### docker-compose.yml

```yaml
services:
  db:
    image: postgres
    environment:
      POSTGRES_PASSWORD: mysecret
      POSTGRES_DB: test_rag
    # 或從 .env 檔載入
    env_file:
      - .env
```

### 7.2 Node.js

#### 讀環境變數

```javascript
// 直接從 process.env 讀
const dbUrl = process.env.DATABASE_URL;
console.log(dbUrl);

// 沒設的話會是 undefined
const apiKey = process.env.API_KEY || 'default-key';
```

#### 用 dotenv 載入 `.env`

```javascript
require('dotenv').config();   // 讀 .env 檔，設定到 process.env
console.log(process.env.DATABASE_URL);
```

#### TypeScript

```typescript
const dbUrl: string = process.env.DATABASE_URL ?? '';
```

### 7.3 Python

#### 讀環境變數

```python
import os

db_url = os.environ['DATABASE_URL']           # 沒設會 KeyError
db_url = os.environ.get('DATABASE_URL')       # 沒設回傳 None
db_url = os.environ.get('DATABASE_URL', 'default')  # 沒設回傳 default
```

#### 用 python-dotenv 載入 `.env`

```python
from dotenv import load_dotenv
import os

load_dotenv()
db_url = os.environ['DATABASE_URL']
```

### 7.4 Go

```go
import "os"

dbURL := os.Getenv("DATABASE_URL")            // 沒設回傳空字串
```

---

## 8. 常見場景

| 場景 | 例子變數 | 為什麼用環境變數 |
|------|---------|----------------|
| **資料庫連線** | `DATABASE_URL` | 不寫死在 code，dev / prod 用不同值 |
| **API key / token** | `OPENAI_API_KEY`, `STRIPE_SECRET` | 機密不能 commit 到 git |
| **環境切換** | `NODE_ENV=production` | 同份 code 在不同環境跑 |
| **Feature flag** | `ENABLE_NEW_UI=true` | 不改 code 就能開關功能 |
| **資源限制** | `WORKERS=4`, `MAX_CONNECTIONS=100` | 部署時調參數 |

---

## 9. 安全注意事項

### 9.1 機密不寫在 code 裡

```javascript
// ❌ 千萬別這樣寫
const apiKey = "sk-abc123xyz";
fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });

// ✅ 從環境變數讀
const apiKey = process.env.OPENAI_API_KEY;
```

### 9.2 `.env` 加進 `.gitignore`

```bash
# .gitignore
.env
.env.local
.env.*.local
```

### 9.3 不要 `echo $API_KEY` 在公開場合

```bash
echo $OPENAI_API_KEY        # ⚠️ 直接印出來會被旁邊的人看到
```

### 9.4 雲端服務用「Secrets」管理

- **GitHub Actions**：Repository Secrets
- **AWS**：Secrets Manager / Parameter Store
- **Zeabur / Vercel / Heroku**：平台內建環境變數 UI
- **Kubernetes**：Secret 物件

→ **生產環境不要用 `.env`**——用平台的 secrets 管理。

---

## 10. 速記

| 動作 | bash | PowerShell |
|------|------|-----------|
| **設定** | `export VAR=value` | `$env:VAR = "value"` |
| **讀取** | `echo $VAR` | `echo $env:VAR` |
| **列出全部** | `env` | `Get-ChildItem env:` |
| **取消** | `unset VAR` | `Remove-Item env:VAR` |

---

## 11. 一句話收斂

> **環境變數 = 給程式看的「全域設定值」，全大寫慣例，自己不能執行**。
>
> Docker `-e`、Node `process.env`、Python `os.environ`、PowerShell `$env:` 全部都在讀同一個東西——**作業系統的環境變數表**。

---

## 相關筆記

- [grep-options.md](grep-options.md) — grep 旗標對照
- [ls-options.md](ls-options.md) — ls 旗標對照
- [cli-flag-meaning-conflicts.md](cli-flag-meaning-conflicts.md) — 同字母不同指令意義不同
- [powershell-vs-bash.md](powershell-vs-bash.md) — PowerShell 與 bash 對照
- [../RAG/pgvector-setup-guide.md](../RAG/pgvector-setup-guide.md) — pgvector setup（用到 `-e POSTGRES_PASSWORD` 等環境變數）
