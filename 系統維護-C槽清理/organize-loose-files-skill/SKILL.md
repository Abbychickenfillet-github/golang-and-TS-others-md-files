---
name: organize-loose-files
description: >
  把散落在某個資料夾(常見是 C:\Users\<你> 或 Downloads)的安裝檔、壓縮工具包、
  資料庫備份、雜項檔案,自動分類搬進一個整理資料夾(預設 abby\)底下的
  installers / toolkits / db-backups / misc 子夾。會避開 dot 設定資料夾、
  NTUSER.DAT、docker-compose.yml 等不該動的檔案。適用情境:家目錄很亂、
  下載檔堆積、想把 .exe/.msi/.zip/.sql 分門別類。觸發詞:「整理我的下載/家目錄」
  「把安裝檔分類」「這堆檔案幫我歸類」「整理 User 資料夾」。
---

# 整理散落檔案 SOP

目標:把一個資料夾裡雜亂的檔案,依類型搬進整理夾的子資料夾,清爽又可回溯。

## 分類規則

| 子資料夾 | 收哪些副檔名 | 例 |
| --- | --- | --- |
| `installers` | `.exe` `.msi` | 各種安裝程式 |
| `toolkits` | `.zip` `.7z` `.tar.gz`(解壓即用的工具包) | go、nginx、ngrok |
| `db-backups` | `.sql` `.dump` | 資料庫備份 |
| `misc` | `.apk` `.txt` `.md` 等雜項 | 其他 |

## ⚠️ 絕對不要動(白名單保護)

- **dot 開頭資料夾**(`.docker` `.conda` `.claude` …)= 各工具設定,搬走會壞。
- `NTUSER.DAT` = 使用者登錄檔(系統檔)。
- `docker-compose.yml`、`.env` 等專案設定檔(可能有程式依賴其路徑)。
- 任何正在被使用/執行中的檔案。

## 執行方式(擇一)

### A. 產生 .bat 讓使用者自己跑(最安全,推薦)
產一個 `.bat`,用 `md` 建子夾、`if exist ... move` 逐檔搬,每檔印 `[OK]/[skip]`。
注意:
- 檔案存 **ANSI 或 UTF-8(不含 BOM)**,否則 `.bat` 第一行會亂碼閃退。
- 指令與 echo 盡量用英文,降低編碼問題。
- 建議使用者「開一個 CMD 視窗,把 .bat 拖進去跑」,而非雙擊(出錯訊息才看得到)。

### B. 若已取得資料夾存取權,直接用 shell 搬
`mkdir -p` 建子夾 → `mv` 逐檔;先 `ls` 確認清單、搬前跟使用者確認。

## 收尾
- 回報搬了哪些、跳過哪些(找不到的檔顯示 skip)。
- 提醒使用者:整理夾(如 `abby\installers`)裝完的安裝檔可再刪、工具包 zip 通常留著。
- 相關筆記:[[本機應用程式用途清單]]
