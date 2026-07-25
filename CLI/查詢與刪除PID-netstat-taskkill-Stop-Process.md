---
title: 查詢佔用 port 的 PID、以及怎麼刪除該行程（Git Bash / PowerShell / CMD 三種寫法）
type: concept-note
tags: [pid, netstat, taskkill, stop-process, process, port, cli]
updated: 2026-07-24
---

# 查詢佔用 port 的行程（PID）並結束它

## 第一步：查是哪個 PID 佔用了這個 port

```bash
# Git Bash
netstat -ano | grep -i ":5500"
```

```powershell
# PowerShell
netstat -ano | Select-String ":5500"
```

```cmd
:: CMD
netstat -ano | findstr ":5500"
```

三邊看到的欄位一樣：

```
TCP    0.0.0.0:5500    0.0.0.0:0    LISTENING    12345
                                                    ↑
                                                   PID
```

最後一欄數字就是 PID。詳細語法差異見 [[netstat-ano-grep-是哪種shell語法]]。

## 第二步：查這個 PID 是「誰」

光有 PID 還不知道是哪個程式，先查名字再決定要不要殺：

```bash
# Git Bash / CMD 都通
tasklist //FI "PID eq 12345"
```

```powershell
# PowerShell
Get-Process -Id 12345
```

> ⚠️ Git Bash 裡呼叫 `tasklist`（跟其他 Windows 原生指令一樣）的 `/FI` 篩選旗標**要打成 `//FI`（雙斜線）**，因為 MSYS2 的 bash 會把單一 `/FI` 誤解成 Unix 風格的路徑而自動轉譯，導致篩選失效或報錯。這是 Git Bash 呼叫 Windows 原生指令常見的坑。

## 第三步：結束該行程

```bash
# Git Bash：呼叫 Windows 原生 taskkill
taskkill //PID 12345 //F
```

```powershell
# PowerShell 原生寫法（推薦，語意最清楚）
Stop-Process -Id 12345 -Force
```

```cmd
:: CMD
taskkill /PID 12345 /F
```

- `//F` / `/F`（force）：強制結束，不等程式自己收尾。
- 同樣地，Git Bash 裡 `taskkill` 的旗標也要雙斜線 `//PID`、`//F`。

## 危險提醒

殺之前務必先用第二步確認這個 PID 是你認得、確定可以關掉的程式（例如自己開的 dev server），**不要看到 port 被占用就直接殺**——有些 PID 是系統服務（例如 Apache `httpd.exe`、資料庫），殺錯可能影響其他正在跑的東西。

## 相關筆記
- [[netstat-ano-grep-是哪種shell語法]]
- [[vscode-live-server-打不開-擴充套件衝突]] —— 實際用這套流程排查過 5500/3000/8080 三個 port 各是誰佔用
