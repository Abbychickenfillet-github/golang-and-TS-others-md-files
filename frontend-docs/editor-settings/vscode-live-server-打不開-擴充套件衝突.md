---
title: VS Code Live Server 打不開 — 兩個 Live Server 類型擴充套件互相衝突
type: debug-note
tags: [vscode, live-server, extension, 衝突, port, 開發環境]
updated: 2026-07-24
---

# Live Server 打不開的排查紀錄

## 症狀

在 VS Code 裡點右鍵「Open with Live Server」或狀態列「Go Live」按鈕沒反應，網頁打不開。

## 排查過程

1. 檢查 5500 port（Live Server 預設 port）有沒有被佔用 → **沒有**，排除 port 衝突。
2. 用 `code --list-extensions | grep -i live` 列出所有含 live 關鍵字的擴充套件 → 發現同時裝了：
   - `ritwickdey.liveserver`（經典版，大家常用的那個）
   - `ms-vscode.live-server`（微軟官方版）
3. 檢查 VS Code 的 exthost log（`%APPDATA%\Code\logs\<最新時間戳>\window1\exthost\exthost.log`）→ 兩個套件都正常啟動，**沒有報錯**，代表不是套件崩潰，而是**兩個套件互相搶指令 / 搶右鍵選單**。
4. 另外在 renderer.log 裡發現 `ritwickdey.liveserver` 一直卡在「Auto update consent required」，代表這套件很久沒真的更新成功。

## 根本原因

**同時安裝兩個功能重疊的 Live Server 擴充套件**，導致右鍵選單或狀態列按鈕的指令被覆蓋 / 衝突，點了沒反應。這是這類問題最常見的成因，屬於「多個擴充套件搶同一個功能」的典型案例，跟 [[vscode-擴充套件唯一識別碼-publisher-extension|VS Code 擴充套件唯一識別碼]] 這篇提到的「同一種檔案可能有多個套件都能處理，需要明確指定」是同一類問題（只是 Live Server 沒有像 formatter 那樣跳出選擇提示，而是直接互相蓋掉，更難察覺）。

## 解法

1. 打開擴充套件面板（Ctrl+Shift+X），**停用（Disable）其中一個**：
   - 建議留下 `ritwickdey.liveserver`（功能完整、右鍵選單體驗較成熟）
   - 停用 `ms-vscode.live-server`
2. Ctrl+Shift+P → `Reload Window`
3. 再試一次右鍵「Open with Live Server」

## 重要更新：VS Code 和 Cursor 的擴充套件是「兩份獨立安裝」

後續排查發現這台機器**同時裝了 VS Code 和 Cursor**，而且它們的擴充套件**各自獨立安裝、互不共用**：

| 編輯器 | 擴充套件資料夾 | 這次相關套件 |
|---|---|---|
| VS Code | `%USERPROFILE%\.vscode\extensions` | `ritwickdey.liveserver`、`ms-vscode.live-server`（Live Preview）、`yuichinukiyama.vscode-preview-server` |
| Cursor | `%USERPROFILE%\.cursor\extensions` | `ritwickdey.liveserver`（版本不同，5.7.10）、`yuichinukiyama.vscode-preview-server`、**`yandeu.five-server`（顯示名稱「Live Server (Five Server)」，Cursor 這邊獨有，VS Code 沒裝）** |

也就是說：**在 Cursor 裡實際會衝突的其實是三個套件**，而且其中一個（Five Server）根本不在 VS Code 那份清單裡——如果你只檢查/停用 VS Code 那邊的擴充套件，Cursor 裡的右鍵選單狀況不會變，因為兩邊的啟用/停用狀態是分開存的。用哪個編輯器排查，就要去該編輯器的擴充套件面板操作。

`netstat` 抓到 port 3000 被 `Cursor.exe` 這個行程佔用，很可能就是 **Five Server**（`fiveServer.port` 設定說明寫「usually between 3000 and 9999」，範圍吻合），不是 VS Code 專屬的 `ms-vscode.live-server`（因為 Cursor 根本沒裝這個套件）。

## 之後怎麼避免

裝新擴充套件前，先用 `code --list-extensions | grep -i <關鍵字>` 檢查是不是已經有功能重疊的套件，尤其是 formatter、linter、live-server 這類「搶右鍵選單 / 搶狀態列按鈕」的類型。

## 有用的排查指令

```bash
# 檢查 port 是否被佔用
netstat -ano | grep -i ":5500"

# 列出所有含關鍵字的擴充套件
code --list-extensions | grep -i live

# 找最新的 VS Code log 資料夾
ls -t "$APPDATA/Code/logs" | head -3

# 在 log 裡搜尋關鍵字錯誤
grep -i "live.server\|error" "$APPDATA/Code/logs/<時間戳>/window1/exthost/exthost.log"
```
