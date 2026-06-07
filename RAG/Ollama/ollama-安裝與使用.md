# Ollama 安裝與使用（本機免費 LLM）

> 用途：在自己電腦跑開源 LLM（不連網、免費、隱私），給 RAG 的「生成 (G)」用。
> 對應程式碼：`abby-notes-rag/scripts/ask.py` 的 `--provider ollama`。
> 建立日期：2026-05-21

---

## 1. Ollama 是什麼

一個「在本機跑 LLM」的工具。下載模型到你電腦，之後問答都在本機算，**不連網、免費、筆記不外流**。
它會在背景開一個 server（`http://localhost:11434`），程式透過這個網址呼叫它生成答案。

| | Ollama（本機） | Gemini / Claude（雲端） |
|---|---|---|
| 費用 | 免費 | Gemini 有免費額度 / Claude 付費 |
| 隱私 | 筆記不出本機 | 筆記上傳雲端 |
| 品質 | 中（看模型大小） | 高 |
| 前置 | 要裝 + 下載模型(幾 GB) | 只要一把 API key |

---

## 2. 安裝

### 方法 A：winget（推薦，一行搞定）

```powershell
winget install --id Ollama.Ollama -e --accept-source-agreements --accept-package-agreements --silent
```

裝到 `C:\Users\<你>\AppData\Local\Programs\Ollama\`，裝完會自動啟動（系統匣有圖示）。

### 方法 B：官網下載安裝檔

到 <https://ollama.com> 下載 `OllamaSetup.exe`，**執行它安裝**。

> 重要觀念：**「下載」≠「安裝」**。只是把安裝檔載到 Downloads 資料夾，沒有點兩下執行它，等於沒裝。

---

## 3. 驗證有沒有裝好 / 在跑

最快：瀏覽器開 `http://localhost:11434`，顯示「Ollama is running」就代表 server 活著。

其他方法：

| 方法 | 指令 | 看到什麼代表 OK |
|-----|------|---------------|
| CLI 列模型 | `ollama list` | 列出已下載模型 |
| CLI 看執行中 | `ollama ps` | 列出記憶體裡的模型 |
| 工作管理員 | 找 `ollama.exe` 程序 | 程序在跑 |

PowerShell 一次檢查（不靠 PATH，直接查檔案/程序/server）：

```powershell
$exe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
"ollama.exe: " + $(if (Test-Path $exe) { "存在" } else { "不存在" })
$proc = Get-Process ollama -ErrorAction SilentlyContinue
"程序: " + $(if ($proc) { "在跑 (PID $($proc.Id))" } else { "沒在跑" })
try { Invoke-RestMethod "http://localhost:11434/api/tags" -TimeoutSec 5 -ErrorAction Stop | Out-Null; "server: 有回應" } catch { "server: 連不上" }
```

---

## 4. 下載模型（一定要做，否則不能生成）

裝好 Ollama **只是裝了引擎，還沒有模型**。沒模型就無法生成任何東西。

```powershell
ollama pull qwen2.5:7b
```

模型大小對照（中文場景）：

| 模型 | 大小 | 品質 | 適合 |
|-----|------|-----|-----|
| `qwen2.5:0.5b` | ~0.4GB | 低 | 只測試流程 |
| `qwen2.5:1.5b` | ~1GB | 中下 | 快速試 |
| `qwen2.5:3b` | ~1.9GB | 中（夠用） | 輕量備選（記憶體吃緊時） |
| `qwen2.5:7b` | ~4.7GB | 好 | **本專案預設**（品質優先，32GB RAM 撐得住） |

> Ollama 的下載**可斷點續傳**（分層下載），網路不穩比 pip 穩。多 GB 下載會跑很久。

---

## 5. 在 ask.py 怎麼用

模型下載好、server 在跑後：

```powershell
cd C:\coding\futuresign\abby-notes-rag
.\venv\Scripts\python.exe scripts\ask.py "我學過哪些程式語言？" --provider ollama --show-sources
```

- `--provider ollama` 用本機 Ollama 生成
- 預設模型是 `qwen2.5:7b`（在 `DEFAULT_MODELS`），記憶體吃緊可換 `--model qwen2.5:3b`
- ask.py 的 `call_ollama` 就是 POST 到 `http://localhost:11434/api/generate`

---

## 6. `.ollama` 資料夾是什麼

位於 `C:\Users\<你>\.ollama\`，是 Ollama 的**資料目錄**（不是程式本體）：

| 內容 | 是什麼 |
|-----|-------|
| `id_ed25519` / `.pub` | 一對金鑰，**app 首次啟動就會產生**（即使沒下載模型） |
| `models/` | 下載的模型存這裡（**沒這資料夾 = 從沒成功 pull 過模型**） |

**判斷有沒有真的能用**：看 `.ollama\models\` 在不在。只有金鑰、沒有 `models/` → 裝過但從沒下載模型 → 不能生成。

---

## 7. 重要觀念 / 踩過的雷

- **沒模型不能生成**：裝了 Ollama ≠ 能用，一定要 `ollama pull` 一個模型。
- **下載 ≠ 安裝**：載了 `OllamaSetup.exe` 要真的執行它。
- **R（檢索）≠ G（生成）**：RAG 的「找出相關片段」(search.py 印的清單) 是 R，不需要 LLM；「LLM 寫出答案」(ask.py) 才是 G，才需要 Ollama/Gemini/Claude。沒設好 LLM 時，你只會看到 R 的結果（片段+分數），那不是生成。
- **PATH 沒更新**：剛裝好，舊終端機可能 `ollama` 指令找不到（PATH 是開終端機那刻讀的）。開新終端機，或用完整路徑 `& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" ...`。

---

## 相關筆記
- [[RAG術語對照表]] — encode/embedding、retrieval/search、R vs G
- [[餘弦相似度與pgvector]]
