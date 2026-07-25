---
title: shell 執行模板與 {0} placeholder（CI／make／VS Code 怎麼替換你的命令）
type: concept-note
tags: [cli, shell, github-actions, ci-cd, makefile, vscode, 面試]
updated: 2026-07-17
---

# shell 執行模板與 `{0}` placeholder

> 延伸自 [[GitHub-Actions-CICD-ghcr與Docker映像檔]]：「`{0}` 由父程式（CI/CD、make、VS Code）動態替換成實際要執行的命令或腳本路徑。」這句到底在講什麼？
>
> 🔖 **本篇重點索引：a–f，共 6 個。** 字母只表位置與數量。

## (a) 「執行模板」是什麼

`shell: /usr/bin/bash -e {0}` <mark style="background: #FFF3A3A6;">不是一條命令，而是一個「怎麼把命令交給 shell 去跑」的模板</mark>。格式是：

```
命令 [選項...] {0} [更多選項...]
```

<mark style="background: #ADCCFFA6;">第一個以空白分隔的字＝要用的直譯器</mark>（這裡是 `/usr/bin/bash`），`-e` 是給它的選項，`{0}` 是<mark style="background: #FFB8EBA6;">「你的腳本檔會被塞進來的位置」</mark>。

## (b) 「父程式」是誰

就是<mark style="background: #ADCCFFA6;">讀這個設定、負責幫你把命令跑起來的那個工具</mark>：

- <mark style="background: #FFF3A3A6;">GitHub Actions 的 runner</mark>（跑 workflow 的那台雲端機器上的程式）
- <mark style="background: #FFF3A3A6;">make</mark>（讀 Makefile）
- <mark style="background: #FFF3A3A6;">VS Code 的工作執行器</mark>（讀 `tasks.json`）

它們是「父」，因為是**它**去啟動 bash（子行程）來替你執行。

## (c) `{0}` 怎麼被替換：先寫成暫存腳本檔，再把路徑塞進 `{0}`

關鍵動作分三步（以 GitHub Actions 為例）：

1. 你在 `run:` 寫的那段指令，<mark style="background: #BBFABBA6;">runner 會先把它「寫成一個暫存的 `.sh` 腳本檔」</mark>（例如 `/home/runner/work/_temp/xxxx.sh`）。
2. 把模板裡的 <mark style="background: #FFB8EBA6;">`{0}` 換成那個暫存檔的完整路徑</mark>。
3. 實際執行變成：`/usr/bin/bash -e /home/runner/work/_temp/xxxx.sh`。

換句話說：<mark style="background: #FFF3A3A6;">`{0}` = 「你那段 run 內容被存成檔案後的路徑」</mark>。父程式負責產生這個檔、也負責做替換，你看不到中間過程。

## (d) 實例：GitHub Actions 的 `run` 步驟

```yaml
- name: Build
  run: |
    npm ci
    npm run build
```

背後發生：runner 把這兩行存成 `…_temp/abc.sh` → 用預設 shell 模板跑它。Linux 上 `shell: bash` 預設展開成：

```
/bin/bash --noprofile --norc -eo pipefail {0}
```

`{0}` 換成 `…_temp/abc.sh` → 所以你的兩行是「被當成一個腳本檔」整包跑，而不是一行行貼進終端機。這也解釋了<mark style="background: #FF5582A6;">為什麼 `-e`（fail-fast）會生效</mark>：任一行失敗，整個腳本就停。

## (e) 其他工具的同一套概念

- <mark style="background: #ADCCFFA6;">Makefile</mark>：`SHELL = /usr/bin/bash -e {0}`（或類似），make 把每條 recipe 交給這個 shell 跑。
- <mark style="background: #ADCCFFA6;">VS Code `tasks.json`</mark>：用 `"shell"` + `"args"` 定義怎麼叫 shell，任務內容被丟進去執行。
- 共通：<mark style="background: #FFF3A3A6;">設定檔只描述「怎麼把我的命令交給某個直譯器」，`{0}` 是命令被寫成檔後的插入點</mark>。

## (f) 為什麼要先存成檔、用 `{0}`，而不是直接內嵌？

- <mark style="background: #BBFABBA6;">支援多行腳本</mark>：一整段（含迴圈、if）當一個檔跑，比逐行拼字串可靠。
- <mark style="background: #BBFABBA6;">跳脫／引號單純</mark>：不用煩惱把整段塞進命令列會被引號、特殊字元弄壞。
- <mark style="background: #BBFABBA6;">正確的結束碼與 fail-fast</mark>：以檔案執行，`-e`/`pipefail` 能正常作用。
- 若某個「命令」本來就吃「一個檔當輸入」，甚至可以不用寫 `{0}`；需要時才用 `{0}` 明確指定那個暫存檔。

## 資料來源（含查證時間）

> 查證日期：2026-07-17

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| runner 如何處理 shell 與 `{0}`（設計文件） | [actions/runner ADR 0277 — run action shell options](https://github.com/actions/runner/blob/main/docs/adrs/0277-run-action-shell-options.md) | GitHub runner 官方 repo |
| 各種 shell 與 `{0}` 用法解說 | [DEV — GitHub Actions: All the Shells](https://dev.to/pwd9000/github-actions-all-the-shells-581h) | 社群文章 |

## 相關筆記

- 來源脈絡：[[GitHub-Actions-CICD-ghcr與Docker映像檔]]
- 系統路徑：[[usr-Unix系統資源]]
