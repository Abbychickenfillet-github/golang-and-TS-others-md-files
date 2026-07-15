---
title: SSH／RSA 金鑰與 ssh-agent（Git push 免密碼設定）
type: topic-note
source: Gemini
tags: [gemini, git, ssh, rsa, ssh-agent, 安全]
sources:
  - https://gemini.google.com/app/8f5d11c933e56751
updated: 2026-06-30
---

# SSH／RSA 金鑰與 ssh-agent（Git push 免密碼設定）

## 重點整理

定義：

- <mark style="background: #ADCCFFA6;">SSH (Secure Shell)</mark>：加密的網路傳輸協定，是電腦與遠端伺服器（GitHub/GitLab）之間的「私密通道」。Git SSH 網址長得像 `git@github.com:user/repo.git`。
- <mark style="background: #ADCCFFA6;">RSA</mark>：非對稱加密演算法，產生一對金鑰：<mark style="background: #FF5582A6;">私鑰（Private Key）留在自己電腦、絕不外流</mark>；<mark style="background: #BBFABBA6;">公鑰（Public Key）上傳 GitHub、公開沒關係</mark>。
- 驗證原理：連線時公私鑰自動數學匹配，匹配成功就放行，<mark style="background: #FFF3A3A6;">預設目的就是「免打密碼」</mark>。

### 想要「每次 push 都要密碼」（安全考量）

- 方法 A（推薦）：給 SSH key 設<mark style="background: #FFF3A3A6;">密碼短語 Passphrase</mark>。建立時 `ssh-keygen -t rsa -b 4096` 會問 `Enter passphrase`，輸入即可；已存在的免密金鑰可用 <mark style="background: #BBFABBA6;">`ssh-keygen -p -f ~/.ssh/id_rsa`</mark> 補加密碼。
- 方法 B：改用 HTTPS 網址 `git remote set-url origin https://github.com/user/repo.git`，並清掉系統憑證管理器紀錄，每次 push 就會要求輸入 <mark style="background: #ADCCFFA6;">PAT（Personal Access Token）</mark>。

### 為何要有 ssh-agent？

核心：<mark style="background: #FFF3A3A6;">平衡「高安全性」與「便利性」</mark>。設了 Passphrase 後若一天 push 50 次就要打 50 次密碼，很痛苦。ssh-agent 是背景執行的「私鑰管理員」：

- 用 `ssh-add` 把私鑰放進去，<mark style="background: #BBFABBA6;">只需輸入一次密碼</mark>，之後解密後的私鑰暫存在記憶體，Git 連線時直接找它拿憑證。
- 安全：硬碟上的私鑰檔<mark style="background: #FF5582A6;">依然是加密狀態</mark>，就算檔案被偷、沒密碼也解不開。
- 進階 <mark style="background: #ADCCFFA6;">Agent Forwarding</mark>：多跳連線（本機→伺服器 A→GitHub）時，私鑰<mark style="background: #BBFABBA6;">從頭到尾不離開本機</mark>，由本機 agent 回應驗證。

| 情境 | 安全性 | 便利性 |
|------|--------|--------|
| 私鑰不設密碼 | <mark style="background: #FF5582A6;">極低（檔案被偷就完蛋）</mark> | 最高 |
| 有密碼、不用 agent | 最高 | 極低（每次都要打） |
| <mark style="background: #BBFABBA6;">有密碼 + ssh-agent</mark> | 最高 | 高（開機打一次） |

### 重開機也免密碼（託管給作業系統）

- <mark style="background: #ADCCFFA6;">Mac → Keychain</mark>：編輯 `~/.ssh/config` 加入 `Host *` ＋ `AddKeysToAgent yes`、`UseKeychain yes`、`IdentityFile ~/.ssh/id_rsa`，再執行 `ssh-add --apple-use-keychain ~/.ssh/id_rsa`。（ED25519 金鑰把 `id_rsa` 換成 `id_ed25519`）
- <mark style="background: #ADCCFFA6;">Windows → 內建 OpenSSH Agent</mark>（系統管理員 PowerShell）：

```powershell
Set-Service -Name ssh-agent -StartupType Automatic
Start-Service ssh-agent
ssh-add $env:USERPROFILE\.ssh\id_rsa
```

設為 Automatic 後，每次重開機系統自動載入金鑰，push 免再打密碼，私鑰在硬碟仍加密。

## 各對話來源

### Git Diff 基準點與符號判讀（2026-06-30）— https://gemini.google.com/app/8f5d11c933e56751

（同一對話後段延伸到 SSH／RSA／ssh-agent）

使用者：git rsa ssh 定義？用途？可以每一次 push 都需要輸入密碼？／為何要有 ssh agent？／所以我重開機就要又打一次密碼喔？也很麻煩

Gemini：（節錄）SSH 是加密傳輸協定，RSA 產生公私鑰對（私鑰留本機、公鑰上傳 GitHub），預設用來免密碼登入。想每次 push 要密碼可給 key 設 Passphrase（`ssh-keygen -p -f` 補加）或改 HTTPS 用 PAT。ssh-agent 是背景私鑰管理員，`ssh-add` 一次解密後暫存記憶體，兼顧安全與便利；Agent Forwarding 讓私鑰多跳連線也不離開本機。重開機免密碼：Mac 託管 Keychain（`~/.ssh/config` + `ssh-add --apple-use-keychain`）、Windows 把 ssh-agent 服務設 Automatic 並 `ssh-add`。
