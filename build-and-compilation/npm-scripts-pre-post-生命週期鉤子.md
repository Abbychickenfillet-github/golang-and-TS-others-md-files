---
title: "npm scripts 的 pre / post 生命週期鉤子｜規則寫在哪、什麼時候不會觸發"
type: topic-note
source: Gemini
tags: [gemini, npm, package-json, scripts, lifecycle, prebuild, postbuild, 工具鏈]
sources:
  - https://gemini.google.com/app/2c2db4960c317082
updated: 2026-08-27
---

# npm scripts 的 pre / post 生命週期鉤子

> [!info] 本篇重點 a–l 共 12 個
> 起因是一個很單純的疑問：<mark style="background: #FFF3A3A6;">「`npm run build` 會自動先跑 `prebuild`、再跑 `postbuild`，這條規則到底寫在哪？」</mark>答案是 npm 官方文件的 Scripts 章節。

> [!info] 與其他筆記的關聯（附理由）
> **a.** 直接承接 [[npm-run-script-mechanism]]：那篇回答「`npm run dev` 的 `run` 是誰加的」以及 `start` / `test` / `stop` / `restart` 這幾個可省略 `run` 的保留字。本篇是它的下一層——<mark style="background: #ADCCFFA6;">`run` 找到 script 之後，npm 在它前後還偷偷做了什麼</mark>。兩篇合起來才是 npm script 的完整執行流程。
> **b.** 呼應 [[前端專案建立與打包選型-Vite與createVue與NextJS與npm鎖版本]]：那篇處理 `package.json` 的版本語意，本篇處理 `package.json` 的 `scripts` 欄位語意，是同一個檔案的兩個面向。
> **c.** 呼應 [[前端開發工具-打包編譯Lint與Parser]]：pre / post 鉤子最典型的用途就是「build 前先 lint、build 後先跑 type check」，那篇說明這些工具各自負責什麼。

---

## 重點整理

### 一、規則本身（d–f）

**d.** <mark style="background: #BBFABBA6;">規則寫在 npm 官方文件的 `using-npm/scripts` 章節</mark>，不是社群慣例、也不是某個套件的功能，是 npm CLI 本身的行為。

**e.** 規則一句話：<mark style="background: #FFF3A3A6;">對任意 script 名稱 `X`，執行 `npm run X` 時，npm 會依序尋找並執行 `preX` → `X` → `postX`</mark>。

```
npm run build   →   prebuild  →  build  →  postbuild
npm run test    →   pretest   →  test   →  posttest
npm run 隨便取   →   pre隨便取  →  隨便取  →  post隨便取
```

**f.** 這不限於保留字。<mark style="background: #ADCCFFA6;">你自己取的任何名字都吃這套規則</mark>：

```json
{
  "scripts": {
    "prebuild": "rimraf dist",
    "build": "vite build",
    "postbuild": "node scripts/report-size.js",

    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

| 片段 | 意思 |
|---|---|
| `"scripts"` | `package.json` 裡的欄位，值是一個物件。key 是你取的 script 名字，value 是要丟給系統 shell 執行的字串 |
| `"prebuild": "rimraf dist"` | 因為名字是 `pre` + `build`，npm 在跑 `build` 之前會自動先跑這行。`rimraf` 是跨平台的 `rm -rf` |
| `"postbuild"` | `build` 成功結束後自動跑。<mark style="background: #FF5582A6;">build 失敗（非 0 退出碼）的話 postbuild 不會執行</mark> |
| `"predeploy": "npm run build"` | 很常見的組合技：部署前自動打包，不用記得手動先 build |

---

### 二、幾個容易踩的細節（g–j）

**g.** <mark style="background: #FF5582A6;">參數不會傳給 pre / post</mark>。官方文件明講：`npm run` 後面接的參數只會傳給你指定的那支 script，不會傳給 pre 或 post。

```bash
npm run build -- --mode staging
# --mode staging 只會進到 build,prebuild 與 postbuild 收不到
```

（`--` 是 shell 慣例的「參數結束標記」，後面的東西原封不動往下傳。）

**h.** <mark style="background: #ADCCFFA6;">script 的工作目錄永遠是套件根目錄</mark>。不管你在哪個子資料夾打 `npm run`，script 執行時的 cwd 都是 `package.json` 所在的那一層。所以 script 裡可以放心用相對路徑。

**i.** <mark style="background: #FFB8EBA6;">環境變數 `npm_lifecycle_event` 會告訴你「現在跑到哪一階段」</mark>。這讓你可以只寫一支腳本、內部依階段分支：

```js
// scripts/hook.js
switch (process.env.npm_lifecycle_event) {
  case 'prebuild':  /* 清理 */ break;
  case 'postbuild': /* 產報表 */ break;
}
```

**j.** 除了你自己取的名字，npm 還有一組<mark style="background: #ADCCFFA6;">安裝期的生命週期腳本</mark>，是 `npm install` 時自動觸發的，跟 `npm run` 無關：

| 階段 | 觸發時機 |
|---|---|
| `preinstall` | 套件被安裝前 |
| `install` / `postinstall` | 套件安裝後（原生模組編譯常掛在這裡） |
| `prepare` | `npm install`（不帶參數）後、`npm publish` 前，以及安裝 git 依賴時。husky 就是掛在這裡 |

<mark style="background: #FF5582A6;">資安提醒：`postinstall` 是供應鏈攻擊最愛的落腳點——只要 `npm install` 一個被投毒的套件就會自動執行任意程式碼。</mark>新版 npm 已加入 `npm-approve-scripts` 這類機制讓你先審核再放行。

---

### 三、對話裡沒答完的那半題（k–l）

**k.** 對話最後問到「`npx es link` 嗎？」，Gemini 的回覆被截斷成「好的，這是 npm —」就沒了。<mark style="background: #D2B3FFA6;">推測原意是 `npm link` 與 `npx`</mark>，補充如下：

| 指令 | 做什麼 |
|---|---|
| `npm link` | 在本機建立套件的符號連結（symlink），讓你在 A 專案改的套件原始碼，B 專案立刻吃得到，不用每次發版重裝 |
| `npx <套件>` | 執行套件的 CLI。本機 `node_modules/.bin` 有就用本機的，沒有就臨時下載執行完丟掉 |

**l.** 兩者跟本篇的關係：<mark style="background: #FFF3A3A6;">`scripts` 裡的指令能直接打套件名（例如 `"build": "vite build"`）而不用寫完整路徑，是因為 npm 執行 script 前會把 `node_modules/.bin` 塞進 `PATH`</mark>。這也是 `npx` 的第一順位查找位置。

---

## 練習題（延伸）

npm 生命週期是工具鏈知識，LeetCode 與 NeetCode 沒有對應題目。想驗證有沒有懂，做這個小實驗比刷題有效：

1. 建一個空資料夾，`npm init -y`
2. 在 `scripts` 加三行：`"prehello": "echo A"`、`"hello": "echo B"`、`"posthello": "echo C"`
3. 打 `npm run hello`，確認輸出順序是 A B C
4. 把 `"hello"` 改成 `"exit 1"`，再跑一次——確認 `posthello` 這次不會執行

---

## 各對話來源（原文）

### 〈NPM 生命週期鉤子規則〉（2026 年）— <https://gemini.google.com/app/2c2db4960c317082>

**使用者：** 因為有一個 npm 啦，有一組生命週期鉤子的自動規則，比如我打 `npm run build`，npm 實際執行順序是 prebuild 到 build 到 postbuild，這個在哪裡有寫啊？是在 npm 嗎？然後 `npm run test`，實際執行的順序是 pretest test posttest。`npm run` 任何名字都有 pre 任何名字、任何名字到 post 任何名字⋯⋯然後 prebuild 的是 scripts 裡面的 prebuild build link。next。`npx es link` 嗎？

**Gemini：** 這項規則寫在 npm 的官方文件裡。當您執行 `npm run build` 時，npm 會自動依序尋找並執行 `prebuild`、`build` 和 `postbuild`。只要在 `package.json` 檔案的 `scripts` 裡設定這些腳本，它們就會自動觸發。需要我提供一個範例檔案嗎？

**使用者：** 給我網址。給我官網網址就好。

**Gemini：** 好的，這是 npm —

> ⚠️ Gemini 的回覆在這裡被截斷，網址沒給完。本篇已補上正確網址：<https://docs.npmjs.com/cli/v11/using-npm/scripts/>

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 原始對話（Gemini） | https://gemini.google.com/app/2c2db4960c317082 | 2026-08-27 讀取 |
| npm Docs — Scripts（pre/post 規則、參數不傳給 pre/post、cwd 在套件根目錄、npm_lifecycle_event） | https://docs.npmjs.com/cli/v11/using-npm/scripts/ | npm CLI v11，2026-08-27 查證 |
| npm Docs — npm-run-script | https://docs.npmjs.com/cli/v8/commands/npm-run-script/ | 2026-08-27 查證 |
| npm Docs — npm-approve-scripts（安裝期腳本的審核機制） | https://docs.npmjs.com/cli/v11/commands/npm-approve-scripts/ | npm CLI v11，2026-08-27 查證 |
| npm Docs — npm-install-scripts | https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/ | 2026-08-27 查證 |
