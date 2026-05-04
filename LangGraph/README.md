# LangChain / LangGraph 學習環境範本

從零開始建立一個可跑的 LangChain + Anthropic Claude 環境，用來學習 model 與 tool 的基礎，為後續 LangGraph 鋪路。

---

## 環境需求

- Python 3.10 以上（我目前用 3.13）
- Anthropic API key：到 <https://console.anthropic.com/settings/keys> 申請
- 終端機：bash / PowerShell 都可以（指令範例用 bash）

---

## 步驟一：建立資料夾與虛擬環境

```bash
mkdir -p /c/coding/futuresign/Abby-notes/LangGraph
cd /c/coding/futuresign/Abby-notes/LangGraph
python -m venv .venv
```

`venv` 會在當前資料夾建一個 `.venv/`，把 Python 套件隔離在這個專案裡，不會污染全域。

---

## 步驟二：啟動虛擬環境

每次開新終端機都要重新 activate：

```bash
# bash on Windows
source .venv/Scripts/activate

# PowerShell
.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate
```

啟動成功後，命令列前面會出現 `(.venv)` 前綴。

### `source` 是什麼？為什麼一定要用？

`source` 是 bash 內建指令，意思是「**在目前的 shell 裡執行這個檔案**」（不開子 shell）。
縮寫寫法：`. .venv/Scripts/activate`（一個點，跟 source 等效）。

如果直接執行 `.venv/Scripts/activate`，bash 會開子 shell 執行，子 shell 結束後環境就還原了，等於白做。

### activate 到底做了什麼？

它是一個 shell script，執行後會：
1. **改 `PATH`**：把 `.venv/Scripts/` 插到最前，所以打 `python` 會用 venv 的 Python
2. **設 `VIRTUAL_ENV` 環境變數**：讓 pip 知道在 venv 裡
3. **改 prompt**：前面加 `(.venv)` 提示你

驗證：
```bash
which python
# 啟動前：/c/Python313/python
# 啟動後：/c/coding/.../LangGraph/.venv/Scripts/python
```

反向操作：
```bash
deactivate   # 退出 venv，回到系統環境
```

---

## 步驟三：安裝套件

```bash
pip install langchain langchain-google-genai python-dotenv
```

各套件用途：
- `langchain` + `langchain-core` — 核心抽象（Message、Tool、Model 介面）
- `langchain-google-genai` — Gemini 整合（內含 `google-genai` SDK）
- `python-dotenv` — 從 `.env` 檔讀環境變數
- `langgraph` — 編排框架（被 langchain 自動帶入）

如果之後要換 model 再加裝：
```bash
pip install langchain-anthropic       # Claude
pip install langchain-openai          # GPT
pip install langchain-groq            # Groq (Llama 3 / Mixtral)
```

---

## 步驟四：設定 API Key（用 .env 檔）

**安全規則：API key 永遠不要寫在 .py 程式碼裡，也不要貼到任何聊天訊息裡（包括跟 AI 助理）。**

### 為什麼用 .env 而不是 export？

| 方式 | 優點 | 缺點 |
|------|------|------|
| `export VAR=...` | 立即生效 | 關終端就消失，每次要重打 |
| `.env` 檔 + `python-dotenv` | 永久、跟著專案、不污染系統 | 要寫一行 `load_dotenv()` |

### 建立 .env 檔

```bash
# 從範本複製
cp .env.example .env

# 用編輯器打開 .env（VSCode、Notepad 都行）
code .env
```

填入你的 key（Gemini 從 <https://aistudio.google.com/apikey> 拿）：

```
GOOGLE_API_KEY=AIza你的key貼這邊
```

### 標準環境變數名稱

LangChain 各個整合套件預設讀的名稱：

| 服務 | 環境變數名稱 |
|------|------------|
| Google Gemini | `GOOGLE_API_KEY` |
| Anthropic Claude | `ANTHROPIC_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Groq | `GROQ_API_KEY` |

**用標準名稱**，這樣 `ChatGoogleGenerativeAI()` 不用傳參數會自動找到。

### .env 安全檢查

確認 `.env` 在 `.gitignore` 裡（這專案已經有了）：

```bash
cat .gitignore | grep .env
# 應該看到 .env
```

絕對不要 commit `.env` 進 git。`.env.example` 可以 commit（只是範本，沒真實值）。

---

## 步驟五：寫第一支 script — 純 model 對話

`01_model_only.py`：

```python
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()  # 自動讀同資料夾的 .env

model = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)

response = model.invoke("用一句話解釋什麼是 LangGraph")
print(response.content)
```

執行：
```bash
python 01_model_only.py
```

**重點**：
- `load_dotenv()` 會自動把 `.env` 裡的變數塞進 `os.environ`
- `ChatGoogleGenerativeAI()` 自動讀 `GOOGLE_API_KEY` 環境變數
- `model.invoke(...)` 是同步呼叫 LLM，回傳 `AIMessage`，內容在 `.content`

---

## 步驟六：寫第二支 script — model + tool

`02_model_with_tool.py`：

```python
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool

load_dotenv()

# 1. 定義工具
@tool
def get_weather(city: str) -> str:
    """查詢指定城市的天氣（假資料）。"""
    fake_data = {
        "台北": "25 度，多雲",
        "東京": "18 度，晴天",
        "紐約": "10 度，下雨",
    }
    return fake_data.get(city, f"{city} 沒有資料")

@tool
def add(a: int, b: int) -> int:
    """加法。"""
    return a + b

# 2. 綁工具到 model
tools = [get_weather, add]
model = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)
model_with_tools = model.bind_tools(tools)

# 3. 問問題
response = model_with_tools.invoke("台北現在幾度？另外幫我算 17 + 25")

# 4. 看 LLM 想呼叫什麼工具
print("=== LLM 文字回覆 ===")
print(response.content)
print("\n=== LLM 要求呼叫的工具 ===")
for call in response.tool_calls:
    print(f"  tool: {call['name']}, args: {call['args']}")

# 5. 手動執行工具（orchestration 的工作！）
print("\n=== 手動執行工具結果 ===")
tool_map = {t.name: t for t in tools}
for call in response.tool_calls:
    result = tool_map[call["name"]].invoke(call["args"])
    print(f"  {call['name']}({call['args']}) -> {result}")
```

執行：
```bash
python 02_model_with_tool.py
```

---

## 預期輸出

**01：** 一句話介紹 LangGraph。

**02：**
```
=== LLM 文字回覆 ===
（可能是空字串，因為它選擇用工具回答）

=== LLM 要求呼叫的工具 ===
  tool: get_weather, args: {'city': '台北'}
  tool: add, args: {'a': 17, 'b': 25}

=== 手動執行工具結果 ===
  get_weather({'city': '台北'}) -> 25 度，多雲
  add({'a': 17, 'b': 25}) -> 42
```

---

## 關鍵觀念

### Orchestration 在哪裡？
**LLM 不會自己執行工具。** 它只回傳「我想呼叫什麼、傳什麼參數」（`response.tool_calls`），實際執行是程式碼做的。

「拿 LLM 的 tool_call → 執行 → 把結果丟回 LLM → 讓它決定下一步」這個迴圈手寫很煩，**LangGraph 就是來自動化這個迴圈的**。

### `@tool` 做了什麼？
- 把普通 Python 函式包成 LLM 看得懂的格式
- function 的 docstring 會變成 tool 的 description（LLM 用這個判斷何時呼叫）
- type hints 變成參數 schema

### `temperature=0` 是什麼？
- 0 = 最穩定、最一致的輸出（同樣問題基本上會給同樣答案）
- 1 = 比較有創意、隨機
- 學習階段建議用 0，行為可預測

---

## 常見問題

| 錯誤 | 原因 | 解法 |
|------|------|------|
| `ModuleNotFoundError: No module named 'langchain_google_genai'` | 沒 activate venv 或沒裝套件 | `source .venv/Scripts/activate` 然後重裝 |
| `google.api_core.exceptions.Unauthenticated` | API key 沒設或錯誤 | 檢查 `.env` 裡 `GOOGLE_API_KEY` 有沒有正確值 |
| `load_dotenv` 沒效 | 工作目錄不對 | 確認 `.env` 跟 `.py` 在**同一個資料夾**，且 `cd` 到那 |
| 不知道有哪些 model 可用 | — | Gemini: `gemini-2.0-flash`、`gemini-2.5-flash`、`gemini-2.5-pro` |

---

## 下一步

- [ ] 跑通 `01_model_only.py`
- [ ] 跑通 `02_model_with_tool.py`
- [ ] 觀察 `response.tool_calls` 的結構
- [ ] 用 LangGraph 把「LLM ↔ tool」迴圈自動化（下一個範本）

---

## 資料夾結構

```
LangGraph/
├── .venv/                   # 虛擬環境（不要 commit）
├── README.md                # 這份範本
├── 01_model_only.py         # 純 model 對話
└── 02_model_with_tool.py    # model + tool
```

建議建 `.gitignore`：
```
.venv/
__pycache__/
*.pyc
.env
```
