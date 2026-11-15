---
title: 用筆電鏡頭做行為記錄：YOLO 本地實作與下一步
type: topic-note
source: Gemini（新對話，網址待補）＋ Claude 實作
category: 專案調研
tags: [TimeLog, YOLO, edge-ai, webcam, VLM, 行為記錄]
related:
  - "[[影像行為分析系統成本估算-邊緣過濾加雲端VLM混合架構]]"
  - "[[AIoT-概念與實習角色]]"
  - "[[llm-caching-layers]]"
updated: 2026-11-15
---

# 用筆電鏡頭做行為記錄：YOLO 本地實作與下一步

本篇重點 a–h，共 8 個。調研前篇：[[影像行為分析系統成本估算-邊緣過濾加雲端VLM混合架構]]；程式：[yolo_webcam_log.py](yolo_webcam_log.py)

## a. 結論與出處

你在新的 Gemini 對話裡看到的說法是：筆電本身的 CPU／GPU 跑輕量 YOLO 綽綽有餘，不必再買樹莓派或 Hailo-8 邊緣加速卡。方向正確：舊篇的硬體成本表（樹莓派約 NT$3,000–4,500、Hailo-8 約 NT$3,000–6,000）那一塊，在你已經有筆電鏡頭的前提下可以整塊省掉，剩下要花錢的只有「偶爾呼叫雲端 VLM」。

⚠️ 存疑／待補：這句話我在 vault 裡找不到，那篇新 Gemini 對話還沒同步進來，所以網址與原文待補；「綽綽有餘」也沒有附實測數字，下面的程式會直接印出你這台的實際速度，用你自己的數字驗證。

## b. YOLO 能做與不能做的事

| 你想知道的 | YOLO 能不能 | 怎麼做 |
| --- | --- | --- |
| 有沒有人在鏡頭前 | 能 | 偵測 COCO 類別 0（person） |
| 人在滑手機、看書、喝水 | 粗略能 | 同一幀裡人旁邊有 67（手機）、73（書）、41（杯子） |
| 坐著、站著、趴著 | 能，要換姿勢模型 | `yolo11n-pose.pt` 取得關節點，用肩、髖、膝的相對位置判斷 |
| 「在寫報告」「在回 Slack」這種語意 | 不能 | 要靠 VLM 看畫面說明 |

所以分工和舊篇一樣：YOLO 回答「有沒有、是哪一類」，便宜又在本機；VLM 回答「是在做什麼」，貴但只在狀態改變時才叫一次。

## c. 三階段路線

| 階段 | 做什麼 | 成本 | 什麼時候做 |
| --- | --- | --- | --- |
| 1 本地 YOLO | 鏡頭 → YOLO → 狀態機 → 狀態改變時存 SQLite 與影格 | 0 元 | 今天 |
| 2 狀態改變送 VLM | 只把「狀態確認改變」那一張影格送 Gemini 2.5 Flash，換回一句行為描述 | 每次幾分之一元，量由階段 1 控制 | 階段 1 跑穩、確認每天事件數之後 |
| 3 接進 TimeLog | 把事件（時間、活動、描述）POST 到 TimeLog 後端，和你原本的時間紀錄合併分析 | 依 TimeLog 現有架構 | 階段 2 之後 |

## d. 今天怎麼跑

```bash
pip install ultralytics opencv-python
python yolo_webcam_log.py --show
```

第一次執行會自動下載 `yolo11n.pt`（約幾 MB）。畫面上會畫出偵測框，終端機只在「活動確認改變」時印一行，例如 `[2026-11-15 21:03:12] at_desk (184s) → phone`。想看累計時間：

```bash
python yolo_webcam_log.py --summary
```

驗證「筆電夠不夠」：開著 `--show` 時看 CPU／GPU 使用率（工作管理員），把 `--fps` 從 3 調到 10 看會不會跟不上；桌前行為通常 3 fps 就夠，不需要逐幀推論。

## e. 程式怎麼運作

| 部分 | 職責 |
| --- | --- |
| `classify` | 把這一幀偵測到的類別集合換成標籤：沒有人是 `away`，有人加手機是 `phone`，有人加書是 `reading`，有人加杯子是 `drinking`，其餘 `at_desk` |
| `ActivityTracker` | 去抖動：新標籤要連續維持 `--stable-sec`（預設 5 秒）才確認，離開要維持 `--away-sec`（預設 10 秒），避免偵測閃一下就寫一筆 |
| 主迴圈 | 依 `--fps` 控制推論頻率；確認改變時存影格、寫入 SQLite 的 `events` 表（時間、前一個活動、前一個活動持續秒數、新活動、影格路徑） |
| `--summary` | 把每種活動的累計分鐘數統計出來 |

`classify` 和 `ActivityTracker` 我用合成資料測過（閃一下不算、回到原狀取消候選、離開要 10 秒）；鏡頭與 YOLO 推論部分需要你實際開鏡頭驗證，我這邊沒有裝 ultralytics，也沒有開過你的鏡頭。

## f. 可以調的參數

| 參數 | 預設 | 調整時機 |
| --- | --- | --- |
| `--conf` | 0.5 | 手機、書常漏抓就降到 0.35；亂抓就升到 0.6 |
| `--fps` | 3 | 動作快的情境升高；想省電降低 |
| `--stable-sec` | 5 | 活動切換太頻繁就加長 |
| `--away-sec` | 10 | 常因為低頭或偏出鏡頭被當成離開就加長 |
| `--model` | `yolo11n.pt` | 要判姿勢換 `yolo11n-pose.pt`（需要改程式取 keypoints）；要更準換 `yolo11s.pt` |
| `--cam` | 0 | 外接鏡頭用 1 或 2 |

## g. 階段 2：狀態改變時才叫 VLM（草稿，尚未實測）

在程式「寫入 SQLite」之前加一步。`google-genai` 是 Google 新版 SDK，介面請以官方文件為準：

```python
from google import genai
from google.genai import types

client = genai.Client()  # 從環境變數 GEMINI_API_KEY 讀取金鑰，不要寫進程式碼

def describe(frame_jpeg_bytes):
    part = types.Part.from_bytes(data=frame_jpeg_bytes, mime_type="image/jpeg")
    prompt = "用一句繁體中文描述畫面中的人正在做什麼，不要猜測身分。"
    return client.models.generate_content(model="gemini-2.5-flash", contents=[part, prompt]).text
```

一天只有幾十次狀態改變，費用就是舊篇方案 B 的量級；金鑰放環境變數，不要寫進程式或筆記（vault 會公開）。

## h. 隱私與常見的坑

| 項目 | 說明 |
| --- | --- |
| 影格與資料庫會公開 | 這個 repo 會發布到 GitHub Pages。我已在 `.gitignore` 加入 `TimeLog專案/snapshots/` 與 `TimeLog專案/*.db`；程式預設把這兩個放在你執行指令的資料夾，**建議在 vault 以外的資料夾執行**，例如 `C:\coding\timelog-camera` |
| 鏡頭打不開 | 通常被 Teams、Zoom、瀏覽器占用，程式會提示；Windows 上用 `CAP_DSHOW` 開得最穩 |
| 光線與角度 | 逆光或鏡頭太低時人偵測會掉，手機、書這種小物件更明顯 |
| 影格含臉 | 影格只存本機；階段 2 送 VLM 前，想一下要不要先裁掉臉或遮蔽背景 |
| 你自己的作息資料 | 若之後接進 TimeLog 後端，確認傳輸有加密、存取有權限 |

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| Ultralytics YOLO 預測用法（`model(frame, classes=…, conf=…)`、`result.boxes`、`result.plot()`） | [docs.ultralytics.com/modes/predict](https://docs.ultralytics.com/modes/predict/) | 2026-11-15 未重新抓取，依既有知識；請以官方為準 |
| COCO 類別編號（0 person、41 cup、63 laptop、66 keyboard、67 cell phone、73 book） | [COCO 資料集設定](https://docs.ultralytics.com/datasets/detect/coco/) | 同上 |
| Gemini API 圖片輸入 | [ai.google.dev/gemini-api/docs/vision](https://ai.google.dev/gemini-api/docs/vision) | 同上；階段 2 程式碼尚未實測 |
| 新 Gemini 對話（筆電跑 YOLO 綽綽有餘） | 待補 | 尚未同步進 vault |
