---
title: Node path 模組與 Windows 路徑：UNC、磁碟機相對路徑、為什麼 C:\\coding 會報「找不到網路路徑」
type: topic-note
source: Claude
tags: [nodejs, path, windows, unc, cmd, 路徑]
updated: 2026-11-07
---

# Node path 模組與 Windows 路徑：UNC 與雙反斜線

> [!info] 關聯
> Node 執行環境見 [[Node-js底層架構-V8-libuv-Bindings與CSR澄清]]、全域物件見 [[Node-global與process物件屬性逐行解釋]]。Python 對照見 [[os與sys模組差異]]。

## 一、起因

(a) 在 cmd 打：

```
dir /s /b C:\\coding\next-one-main\node_modules\PostCSS
找不到網路路徑。
```

(b) 本機重現（2026-11-07，PowerShell 呼叫 `cmd /c`）：

| 指令寫法 | 結果 |
|---|---|
| `dir /b C:\\coding\next-one-main\node_modules\postcss`（你打的，`C:` 後兩個反斜線） | 「找不到網路路徑」，**重現** |
| `dir /b \\coding\next-one-main\node_modules\postcss`（開頭兩個反斜線） | 同樣「找不到網路路徑」 |
| `dir /b C:\coding\next-one-main\node_modules\postcss`（單一反斜線） | 正常列出 `lib`、`LICENSE`、`package.json` |

(c) 原因的說法：Windows 規定兩個反斜線開頭是網路共用路徑（UNC），格式 `\\伺服器\共用名稱\目錄`，`\\coding\next-one-main\...` 會被當成「伺服器 coding 上的共用 next-one-main」，所以報錯。**重現了錯誤，也確認單一反斜線可用；但 `C:\\coding` 這種「磁碟機代號後面接雙反斜線」為什麼也被當成網路路徑，我沒找到文件說明**，上面微軟文件的正規化說明是「前兩個之後的連續斜線會被合併」，與這個結果不完全吻合，成因未查證。

(d) 另一個坑：我先前在 Git Bash 用同樣的字串測，`C:\\coding` 是**可以**跑的。那是因為 Git Bash 會自己改寫路徑參數，不代表 cmd 可以。測 Windows 路徑問題要用 cmd 或 PowerShell，別用 Git Bash。

(e) 正確寫法：只有一個反斜線，`C:\coding\next-one-main\node_modules\postcss`。

## 二、Windows 路徑的幾種格式

來源：[Microsoft Learn：File path formats on Windows systems](https://learn.microsoft.com/en-us/dotnet/standard/io/file-path-formats)（頁面 ms.date 2025-10-22，查證 2026-11-07）。

| 格式 | 例子 | 意思 |
|---|---|---|
| 磁碟機絕對路徑 | `C:\Documents\a.pdf` | 從磁碟機 C 的根開始 |
| 目前磁碟機的根 | `\Program Files\x.exe` | 單一 `\` 開頭，從「目前磁碟機」的根開始 |
| 相對目前目錄 | `2018\January.xlsx`、`..\Publications\a.pdf` | 從目前所在資料夾開始 |
| **磁碟機相對路徑** | `C:Projects\x.sln`（冒號後沒有 `\`） | 相對於「C 槽的目前目錄」，不是 C 槽根。微軟標為常見 bug 來源 |
| **UNC** | `\\Server2\Share\Test\Foo.txt` | `\\` 加伺服器名，再接共用名稱，用來存取網路資源；一定要是完整路徑 |
| DOS 裝置路徑 | `\\?\C:\Test\Foo.txt`、`\\?\UNC\Server\Share\...` | `\\?\` 或 `\\.\` 開頭，略過一般正規化 |

- 辨識路徑種類時，微軟寫：UNC 是「兩個分隔符開頭、後面不是 `?` 或 `.`」。所以 `\\coding\...` 一定先被當 UNC。
- 正規化時（微軟文件）：前兩個斜線之後的連續斜線會被合併成一個；開頭的兩個反斜線是 UNC 的標記。但本機 cmd 對 `C:\\coding` 仍報網路路徑，見一、(c)。
- Windows 路徑不分大小寫，所以 `PostCSS` 與 `postcss` 等價。

## 三、Node.js 的 path 模組怎麼看這些路徑（本機實測）

環境：Node v24.14.0，`require('path').win32`，2026-11-07。

| 輸入 | `isAbsolute` | `parse().root` |
|---|---|---|
| `C:\coding\x` | true | `C:\` |
| `\\coding\next-one-main\node_modules\postcss` | true | `\\coding\next-one-main\`（伺服器 coding、共用 next-one-main） |
| `\\server\share\dir\f.txt` | true | `\\server\share\` |
| `//server/share/dir/f.txt` | true | `//server/share/` |
| `\coding\x` | true | `\` |
| `C:coding\x` | **false** | `C:`（磁碟機相對） |
| `coding\x` | false | 空字串 |

- 看第二列：Node 也把開頭 `\\` 的路徑解析成 UNC，伺服器是 `coding`。跟 cmd 的判斷一致，這就是那個錯誤的原因。
- 官方文件（[Node.js path](https://nodejs.org/api/path.html)）：`path.isAbsolute('//server')` 與 `path.isAbsolute('\\\\server')` 都是 `true`；Windows 上正反斜線都能當分隔符，但 `path` 的方法輸出只用反斜線（以 `path.sep` 為準）。

## 四、常用方法速查

來源：[Node.js path 文件](https://nodejs.org/api/path.html)，查證 2026-11-07。

| 方法 | 做什麼 | 例子 |
|---|---|---|
| `path.sep` | 平台的分隔符：Windows `\`，POSIX `/` | 實測 `path.win32.sep` 是 `\`，`path.posix.sep` 是 `/` |
| `path.join(...)` | 用平台分隔符接起來並正規化，長度 0 的片段被忽略 | `path.win32.join('C:\\', 'coding', '..', 'x')` 得 `C:\x`（實測） |
| `path.resolve(...)` | 由右往左處理，直到組成絕對路徑；還不是絕對就補上目前工作目錄 | `path.resolve('/foo/bar', '/tmp/file/')` 得 `/tmp/file` |
| `path.win32`、`path.posix` | 不管在哪個作業系統，都強制用 Windows 或 POSIX 規則 | 在 Mac 上也能處理 `C:\temp\a.html` |

- 不要手動用字串拼 `'C:\\' + '\\' + name`，容易多一個反斜線，變成上面那個 UNC 錯誤；改用 `path.join`。

## 五、Google Drive 裡找到的相關舊筆記

用 Drive 連接器搜尋（2026-11-07）。**沒有一份專講 Node `path` 模組的筆記**，最接近的是：

| 檔名 | 內容 | 連結 |
|---|---|---|
| `path` | 相對路徑 `./`、`../`、`/`、無前綴的差別，絕對路徑不一定從 `C:` 開始（另有一份「「path」的翻譯版本」內容相同） | https://docs.google.com/document/d/1ZrvreyCbYrBb9k6maZMprixgnieqYvnOrD8tcmYt9BE/edit |
| `node.js` | Node runtime 組成（node.exe、V8、libuv、內建模組 fs、http、crypto、os） | https://docs.google.com/document/d/15rFx6BLh477IV_BGYUaS7_q2shinR_dMaFb1G49i14s/edit |
| `nodeJS_hw04.mjs` | 作業程式，`import { join } from 'path'` 組出 `work01.html` 這類檔案路徑 | https://drive.google.com/file/d/1EqEVJGBx6_QKT3y0C7VZdgA9WEwKHGfM/view |
| `claude-path-setup.md` | 這是環境變數 PATH，不是 path 模組，別混 | https://docs.google.com/document/d/1jt-teCwtOC9uAwjyEFT4RJlFN5gukCHrYonXeYzOtsA/edit |

- 我只讀到搜尋回傳的片段，沒有逐份開完整份。
- 搜尋用的是 Drive 連接器的全文搜尋，不是本機資料夾；本機沒有掛載 Google Drive。

## 六、查找 node_modules 裡的資料夾（修正後的指令）

```
dir /b C:\coding\next-one-main\node_modules\postcss
dir /s /b /ad C:\coding\next-one-main\node_modules\postcss
npm ls postcss
```

- 第二行會遞迴找，連別的套件裡面的 `postcss` 副本一起列。
- 這三行我沒有在你的終端機執行；`npm ls postcss` 在前一輪我查過，結果是 `postcss@8.4.31`，由 `next@15.5.28` 帶進來。
