---
title: "編輯器與執行環境｜VS Code 是 Electron、Toolchain 才是發動機、Docker 把發動機藏在貨櫃裡"
type: topic-note
source: Gemini
tags: [gemini, vscode, electron, runtime, toolchain, sdk, docker, nodejs, golang, dotnet, 開發環境]
sources:
  - https://gemini.google.com/app/f00083e09ec02fa5
updated: 2026-08-27
---

# 編輯器與執行環境｜VS Code 是 Electron、Toolchain 才是發動機、Docker 把發動機藏在貨櫃裡

> [!info] 本篇重點 a–m 共 13 個
> 一句話總結：<mark style="background: #FFF3A3A6;">「寫程式的地方」和「跑程式的地方」是兩件事</mark>。搞混這兩件事，就會問出「為什麼寫 C# 要裝 .NET，寫 JS 卻不用」這種問題。

> [!info] 與其他筆記的關聯（附理由）
> **a.** 承接 [[前端開發工具-打包編譯Lint與Parser]]：那篇分工講的是「同一個 runtime 裡不同工具的角色」，本篇往下挖一層，講「runtime 本身從哪來、誰裝的」。
> **b.** 呼應 [[機器碼與bytecode的差異]] 與 [[機器碼、位元組碼與機器指令是一樣的嗎]]：本篇講 toolchain 把原始碼變成什麼，那兩篇講「變出來的東西」到底是哪一層。
> **c.** 呼應 [[docker/docker-引擎-context-image-container-觀念]]：本篇第三節說 Docker Image 裡預裝了 toolchain，那篇解釋 Image 與 Container 的關係，是本篇的機制底層。
> **d.** 呼應 [[docker/windows-用-linux-的方式]]：本篇提到「本機是 Windows、容器裡是 Linux」，那篇處理兩邊怎麼接。
> **e.** 承接 [[TS/TypeScript-any與unknown-型別逃生艙口與斷言時機]]：同一場 Gemini 對話的前半段。從「TS 的型別怎麼寫」自然滑到「TS 誰來編譯、誰來執行」。

---

## 重點整理

### 一、名詞先講清楚（f–h）

先把三個常被混用的字釘死，後面才不會亂：

| 名詞 | 全名 | 白話 |
|---|---|---|
| Editor / IDE | Integrated Development Environment（整合開發環境） | 你打字的地方。負責上色、自動補全、跳轉定義 |
| Runtime | Runtime Environment（執行環境） | 真正把你的程式跑起來的引擎。例如 Node.js、JVM、CPython |
| Toolchain / SDK | Software Development Kit（軟體開發套件） | 一整組工具：編譯器、連結器、標準函式庫、套件管理器。例如 Go toolchain、.NET SDK、JDK |

**f.** <mark style="background: #ADCCFFA6;">VS Code 是用 Electron 做的</mark>。Electron 是把 Chromium（瀏覽器核心）加上 Node.js 打包成桌面 App 的框架。所以 VS Code 骨子裡確實是「一個去掉網址列、專門用來改程式碼的 Chrome」。

**g.** 因為 Electron 內含 Node.js，<mark style="background: #FFF3A3A6;">VS Code 自帶了一份 Node 與 V8 引擎，用來跑它自己的擴充功能與語言服務（Language Server）</mark>。TypeScript 的型別檢查、JS 的 IntelliSense，就是靠這份內建的 Node 在背後跑 `tsserver`。

**h.** 但 <mark style="background: #FF5582A6;">「VS Code 自帶 V8」不等於「你可以不裝 Node.js 就跑 JS」</mark>——這是 Gemini 在對話裡講得不夠精確的地方，見下方「⚠️ 存疑／更正」。

---

### 二、為什麼寫 C# 要下載 .NET SDK（i–j）

**i.** VS Code 對 C#、Java、Go、Python 這些語言而言，<mark style="background: #FFF3A3A6;">只是一台高級打字機</mark>。它沒有能力執行這些語言，它做的事是：把你的原始碼丟給後台真正的 SDK，SDK 編譯並執行完，再把結果接回來顯示在整合終端機裡。

```
[ 你在 VS Code 寫 C# ] ──(把程式碼丟過去)──> [ 後台的 .NET SDK ]
                                                     │ (編譯並執行)
[   看到輸出結果      ] <──(把結果傳回來)──────── [ 電腦 CPU (x64) ]
```

**j.** 跨語言對照表：

| 你想寫的語言 | VS Code 本身能做什麼 | 你必須另外下載的「發動機」 |
|---|---|---|
| JavaScript / TypeScript | 語法上色、IntelliSense、型別檢查（靠內建 Node 跑 tsserver） | 要在終端機 `node app.js` 執行，仍需自行安裝 Node.js |
| C# | 只提供文字打字與擴充功能 | .NET SDK |
| Python | 只提供文字打字與擴充功能 | CPython Interpreter |
| Java | 只提供文字打字與擴充功能 | JDK（Java Development Kit） |
| Go | 只提供文字打字與擴充功能 | Go toolchain |

<mark style="background: #D2B3FFA6;">補充：所有語言都還需要對應的 VS Code Extension（C# Dev Kit、Python、Go、Extension Pack for Java）才會有智慧提示。Extension 只是「翻譯機的操作面板」，SDK 才是翻譯機本體。</mark>

---

### 三、那我寫 Go 沒裝 toolchain 也能跑，是怎麼回事（k–m）

這是這場對話裡最好的一次質疑。答案是：<mark style="background: #BBFABBA6;">Docker 把 Go toolchain 藏在容器裡幫你裝好了</mark>。

**k.** Dockerfile 的第一行就洩漏了答案：

```dockerfile
FROM golang:1.23-alpine
```

| 片段 | 意思 |
|---|---|
| `FROM` | Dockerfile 指令，宣告「這個 Image 要以哪個既有 Image 為基底」 |
| `golang` | Docker Hub 上的官方 Image 名稱。由 Docker Official Images 團隊維護 |
| `1.23` | Go 的版本 tag |
| `alpine` | 基底作業系統是 Alpine Linux（極小、約 5 MB 的 Linux 發行版） |

<mark style="background: #FFB8EBA6;">這個 Image 裡面已經預先裝好完整的 Go toolchain（`go build`、`go run`、`gofmt`、標準函式庫）</mark>，所以容器裡打 `go build` 當然跑得動。

**l.** 兩種模式的路徑對照：

| | 傳統本機開發 | Docker 容器開發 |
|---|---|---|
| toolchain 在哪 | 裝在你的 Windows 上 | 裝在 Image 裡的 Linux 環境 |
| 編譯發生在哪 | Windows 本機 | 容器內部的 Linux |
| 沒裝會怎樣 | `go: command not found`，完全動不了 | 不影響，因為根本不需要本機有 |
| 對本機環境的污染 | 有：PATH、GOPATH、版本衝突 | 幾乎沒有，刪掉容器就乾淨了 |

```
[ 你的 Windows 本機 ] ── (完全沒裝 Go)
          │
          ▼ (啟動容器)
[ Docker 容器 (Linux) ] ── (內部預裝 Go toolchain，在這裡完成編譯)
          │
          ▼ (執行)
[   你的 x64 CPU     ]
```

**m.** <mark style="background: #FF5582A6;">後遺症：如果你完全不用 Dev Containers、只是 `docker build` 而已，VS Code 的 Go 擴充功能會一直跳 "Go command is not available"</mark>，而且沒辦法「Go to Definition」跳轉函式定義——因為 VS Code 在 Windows 這一側找不到 toolchain，無法建立語言服務。

解法是用 **Dev Containers** 擴充功能，讓 VS Code 直接「連進容器裡面」執行語言服務，這樣它就讀得到容器內的 Go toolchain，提示與跳轉就會恢復正常。

---

## ⚠️ 存疑／更正

| Gemini 說法 | 查證後 | 說明 |
|---|---|---|
| 「VS Code 自帶 V8 引擎，所以寫 JS 不需要另外下載」 | ⚠️ 講得太滿 | 正確的是：VS Code 內建的 Node 是給**它自己**（擴充功能、tsserver、Language Server）用的，並沒有對外開放給你的專案。你在整合終端機打 `node app.js`，用的是**你自己安裝在系統 PATH 上的 Node.js**。沒裝 Node 的機器打 `node` 一樣會 command not found。所以「JS 完全不用裝發動機」是錯的，只是「型別檢查與語法提示不用裝」而已 |
| 「微軟或 Go 官方已經把 Go Toolchain 安裝在這個毛胚屋裡面」 | ⚠️ 主體弄錯 | `golang` 這個 Image 是 **Docker Official Images** 專案維護的，跟微軟無關 |
| 「瀏覽器天生看不懂 C# / Java」 | 基本正確但有例外 | 透過 **WebAssembly（Wasm）**，Blazor WebAssembly 確實可以在瀏覽器裡跑 C#。這不影響本篇結論（你還是得先有 .NET SDK 才編得出 Wasm），但講「絕對看不懂」不夠精確 |

---

## 各對話來源（原文重點）

### 〈Laptop Architecture Detection Guide〉（2026 年，後半段）— <https://gemini.google.com/app/f00083e09ec02fa5>

**使用者：** 那為什麼我用 VSCODE 就不用下載 .net？
**Gemini：** 因為 VS Code 骨子裡其實就是一個網頁瀏覽器，它早就偷偷內建好 JS/TS 的執行引擎了⋯⋯VS Code 是用 Electron 開發的，本質上就是一個去掉了網址列、專門用來改程式碼的 Google Chrome 瀏覽器。（後接「文字編輯器 vs 執行環境」與跨語言對照表）

**使用者：** 你說的話有根據嗎，我在用 Go 就沒有下載 toolchain 吧，還是說用 docker 沒差？
**Gemini：** 你的 Go 程式之所以能跑，正是因為 Docker 幫你把 Go Toolchain 偷偷藏在裡面了⋯⋯你雖然沒有在 Windows 主機下載 Go，但你下載的 Docker Image 裡面有。（後接 Dockerfile `FROM golang:1.23-alpine` 拆解、兩種開發模式對比、Dev Containers 提示）

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 原始對話（Gemini） | https://gemini.google.com/app/f00083e09ec02fa5 | 2026-08-27 讀取 |
| Docker Official Images — golang | https://hub.docker.com/_/golang | 2026-08-27 查證 |
| Electron 官方說明（Chromium + Node.js） | https://www.electronjs.org/docs/latest | 2026-08-27 查證 |
| VS Code Dev Containers 文件 | https://code.visualstudio.com/docs/devcontainers/containers | 2026-08-27 查證 |
