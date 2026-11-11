---
title: Abby-notes 改成 Next.js 靜態部落格：設計文件
type: design-doc
tags: [nextjs, static-blog, github-pages, components, design]
status: approved
updated: 2026-11-11
---

# Abby-notes 改成 Next.js 靜態部落格：設計文件

本篇重點 a–i，共 9 個。
這份文件寫給「要來規劃並施工的人」，讀完不必再回頭問 Abby 就能開始規劃；真的需要 Abby 回答的事，集中寫在 (i)。

## (a) 為什麼要做

Abby 的 392 份互動 `.html` 筆記，幾乎每一份都帶著自己的一整段 `<style>` 與同一套版型。
後果有兩個：改一處樣式要改上百份檔案；每做一篇新筆記，都得重新檢查畫面是不是自己要的。
所以目標是「公版」：樣式與區塊寫成元件，改一處全站生效，單篇真的需要才覆寫。
順便把網站改成 Next.js 靜態輸出，繼續放在 GitHub Pages。

## (b) 現況盤點（2026-11-11 在 repo 實測）

| 項目 | 事實 |
|---|---|
| `.md` 筆記 | 1310 份，其中 1284 份有 frontmatter |
| `.html` 互動筆記 | 392 份，其中 172 份有同名 `.md` 配對 |
| html 的樣式來源 | 387 份帶 inline `<style>`；325 份有連結 `assets/notes.css`；372 份含 `<script>` |
| 既有共用檔 | `assets/` 底下有 `notes.css`、`notes.js`、`note-interactive.css`、`note-quiz.js`、`toc.js`、`wikilink.js`、`wikilink-index.json` |
| 現行發布 | Jekyll 加 beautiful-jekyll 遠端主題，發布到 GitHub Pages；repo 內沒有 `.github/workflows` |
| 容量 | repo 約 907 MB，其中 `obsidian-attachment` 約 355 MB |
| 換行設定 | `git config core.autocrlf` 為 `true` |
| 樣板頁 | `backend/Session-Token-Cookie-認證系列/1-Cookie-與-Session.html`（Abby 貼來的範例，目前尚未 commit） |

重複最多的區塊，也就是要做成元件的清單：

| 區塊 | 各自寫了一份的 html 數 | 元件名稱（暫定） |
|---|---|---|
| `.card` | 297 | Card |
| `.pill` | 276 | Pills |
| `.toolbar` | 242 | Toolbar |
| `.pills` | 222 | Pills |
| `.legend` | 179 | Legend |
| `.quiz` | 157 | Quiz |
| `mark.hl` | 140 | Highlight |
| `header.hero` | 129 | Hero |
| `input.blank` | 121 | Blank（Quiz 的一部分） |
| `.wikilink` | 120 | WikiLink |
| `letter-spacing` 各自設定 | 188 | 改成全站單一來源 |

`.md` 裡的 Obsidian 專屬語法，Next.js 預設看不懂，建置時要補轉換：

| 語法 | 用到的 md 數 |
|---|---|
| `[[wikilink]]` | 468 |
| `> [!callout]` | 199 |
| `==螢光筆==` | 91 |
| `![[圖片]]` 嵌入 | 72 |
| 行內 `<mark style="background: ...">` | 未盤點（範例筆記有使用） |

## (c) 目標、非目標、反目標

| 類型 | 內容 |
|---|---|
| 目標 | 公版：改一處全站生效，單篇才覆寫 |
| 目標 | 字距寫在全站單一來源：pills 與 hashtag 用 `0.25rem`，內文用 `0.2rem` |
| 目標 | 共用區塊做成元件，清單見 (b) |
| 目標 | 「自我測驗」標題與 🙈 👀 兩顆按鈕在同一行 |
| 目標 | scroll-snap（滾一下一整塊）做成元件，預設關閉 |
| 目標 | 以 Next.js 靜態輸出（`output: 'export'`）部署到 GitHub Pages |
| 目標 | 392 份 html 分批替換成公版 |
| 非目標 | 不改 `.md` 與 `.html` 的文字內容與圖片；被抽換的只有重複的樣式與共用區塊 |
| 非目標 | 不搬、不改名、不修改 repo 內任何圖片；建置時如何把被引用的圖放進輸出資料夾，見 (h) |
| 非目標 | 不做伺服器端功能（登入、資料庫、API） |
| 非目標 | 不導入 Tailwind，Abby 的樣式是自己的一套 CSS |
| 反目標 | 把 `private/`、`Git/` 等不該公開的資料夾發布出去 |
| 反目標 | 整頁預設開啟 scroll-snap，表格與程式碼區塊會捲不順 |
| 反目標 | 等寬區塊（`code`、`pre`、`.align-demo`）套用內文的 `0.2rem`，導致 Set-Cookie 對齊互動跑掉；它們固定用 `0.1rem` |
| 反目標 | 卡片硬寫白底 `#fff`，深色主題會很刺眼 |
| 反目標 | 為了換行規則，整批改既有檔案的換行符號 |

## (d) Abby 已決定的事

| 項目 | 決定 |
|---|---|
| 部署位置 | 仍然是 GitHub Pages |
| 施工順序 | 先拆共用元件，再批次替換那 392 份 `.html` |
| 字距 | pills 與 hashtag `0.25rem`；內文 `0.2rem`；`.legend span` 的 `1.18em` 是故意的，要保留；`code`、`pre`、`.align-demo` 等等寬區塊用 `0.1rem` |
| 自我測驗列 | 標題與按鈕同一行；按鈕只留 icon，不要長文字；按鈕仍控制整頁的螢光筆遮罩 |
| scroll-snap | 先寫成元件；預設關閉；單篇需要時才開 |
| 公版外觀 | 以 `assets/note-interactive.css` 為主（淺色加 `prefers-color-scheme` 深色）；頁面背景與卡片要有明顯的高對比，否則用卡片就沒有意義 |
| Obsidian | 替換後的 `.html` 必須仍能在 Obsidian（HTML Reader）直接打開；不能開就等於不能用，所以原檔不能依賴 Next.js 建置 |
| html 原檔與共用檔 | 已同意合併做法：原檔仍是純 html，刪掉各自重複的 `<style>`，改用相對路徑連到同一份共用 CSS 與共用 JS，所以在 Obsidian 能獨立打開；網站建置時再讀這些原檔，把 body 放進 React 公版 layout，樣式也用同一份共用 CSS |
| 是否改用 Next.js | 確定要改；Abby 的要求是「確保會改好」 |
| 同名的 md 與 html | 兩份都有各自的網址；同名時 html 的檔名尾巴加上 `-互動版`，也就是 `<原檔名>-互動版.html`，md 維持原檔名 |
| 圖片與 md | 維持原樣，不搬、不改 |
| 中文文件寫法 | 全形逗號「，」；句號與分號後換行；換行符號 CRLF（這是 Claude 對她那句「CRLF」的解讀，尚未逐字確認） |

## (e) 限制

| 限制 | 原因與做法 |
|---|---|
| 私人內容不可公開 | GitHub Pages 站點是公開的，即使 repo 是 private；`_config.yml` 的 `exclude` 清單（`private/`、`_to_delete/`、`系統維護-C槽清理/`、`Git/`、`*.sh`、`fix-index-links.py`、`build-index.py`、`*.bak`、`node_modules/`、`vendor/`）在新版建置輸出中必須同樣被擋掉 |
| 站點大小 | GitHub Pages 發布的網站約有 1 GB 上限，而 repo 已有約 907 MB；部署階段要量測輸出資料夾的實際大小 |
| 名詞 hover | 一律用筆記庫的 `.term`（`assets/notes.css` 與 `assets/notes.js`），不用瀏覽器原生 `title`；詞在 `overflow:hidden` 容器或由 JS 動態產生時，要加 `data-float` |
| 卡片底色 | 用頁面自己的 CSS 變數（例如 `--panel`、`--panel2`），不硬寫 `#fff`；新增的顏色用 `oklch()` |
| 連結相容 | 要兼顧 Obsidian、ithome、github.io 三邊的連結都能用 |
| 術語 | 指「原始碼轉原始碼」的地方統一寫 transpile（轉譯），不混用 transform |
| 程式碼註解 | 我寫的每一行程式碼都要逐行註解它做什麼，並說明用到的語法；修改前先解釋使用什麼語法 |
| 無障礙 | 純 icon 按鈕要有 `aria-label`，畫面上不放字 |

## (f) 施工順序（有先後，所以用數字）

| 順序 | 做什麼 | 產物 |
|---|---|---|
| 1 | 在 repo 底下建 Next.js 專案骨架：TypeScript、App Router、不用 Tailwind，`next.config` 設 `output: 'export'` | `site/` 資料夾（暫定位置，見 (h)） |
| 2 | 建立全站色票、字距、版面的單一來源 | 全站樣式檔 |
| 3 | 寫共用元件：Card、Pills、Toolbar、Legend、Hero、Toc、Highlight、Quiz（含填空、是非、申論）、WikiLink、SnapDeck | 元件庫 |
| 4 | 以樣板頁（Cookie 與 Session）做出新版，與原檔並排比對，Abby 看過才往下 | 一頁驗證用的新版 |
| 5 | 分批把 392 份 `.html` 裡重複的樣式與共用區塊抽換成公版（文字內容不動），每批 Abby 看過；172 對同名配對的 html 同時改名為 `<原檔名>-互動版.html`，並同步更新所有指向它們的連結 | 替換腳本與每批的比對結果 |
| 6 | 建 Markdown 管線，處理 wikilink、callout、`==螢光筆==`、`![[圖片]]`、行內 `<mark style>` | `.md` 渲染成頁面 |
| 7 | 建 GitHub Actions 建置與部署，套用 `exclude` 清單，加 `.nojekyll`，量輸出大小 | 部署 workflow |
| 8 | Jekyll 與 `build-index.py` 何時退場 | 交給施工者決定，見 (g) |

## (g) 交給施工者決定的事

| 項目 | 說明 |
|---|---|
| 元件的 API 與檔案結構 | 只要符合 (c) 與 (e) 即可 |
| 樣式技術 | CSS Modules、全域 CSS、CSS 變數都可以，前提是字距與色票只有單一來源 |
| remark／rehype 外掛 | 挑哪些外掛處理 (b) 那張語法表 |
| 批次替換的自動化與比對方式 | 怎麼跑、怎麼讓 Abby 一批批檢視 |
| `basePath` 與網址設定 | 取決於 github.io 的網址型態 |
| 站內索引頁 | 現在由 `build-index.py` 產生 `index.html`，新版要不要由 Next.js 自動產生 |

## (h) Claude 替 Abby 做的暫定決定（不是她同意過的，請她檢查）

| 項目 | 暫定內容 | 原因 |
|---|---|---|
| 專案位置 | 放 repo 底下的 `site/` | 根目錄已有 `README.md` 與上千份筆記，`create-next-app` 會衝突 |
| scroll-snap 開關 | frontmatter 欄位暫名 `deck: true` | 單篇才開，符合「單獨改再改」 |
| 分批 | 替換 html 時分批，每批由 Abby 看過 | 392 份一次全換，錯了很難回頭 |
| 網址 | 維持現有路徑一對一（含 `.html` 副檔名與中文檔名），不改既有網址 | ithome、github.io 與筆記之間互相的連結才不會斷 |
| 發布範圍 | 與現在 Jekyll 相同：全部 md 與 html 減去 `exclude` 清單；repo 內目前沒有任何 md 使用 `published: false` 或 `permalink:`（2026-11-11 實測），所以不需要特別處理 | 不改變公開範圍；改成允許清單是之後的選項，不在這次範圍 |
| 圖片進輸出資料夾 | repo 內圖片原地不動；建置時只把「被內容引用到的圖」複製進輸出資料夾，這是建置產物，不是改 repo；超過 Pages 上限時的退路（壓縮或外部託管）再請 Abby 決定 | 靜態輸出必須帶著圖片才看得到；只帶被引用的圖可以避開 355 MB 全包 |
| 「單篇才覆寫」的判準 | 一頁自己的樣式，如果選擇器不在公版元件的範圍內，就保留成該頁自己的樣式；與公版重複的規則一律移除 | 387 份帶 inline `<style>`，需要一個機械可執行的標準 |
| 品質把關 | 每批替換後，自動產出與原檔的前後畫面比對與連結檢查；建置零錯誤才交給 Abby 看 | Abby 要求「確保會改好」 |
| 改名細節 | 已經以 `-互動版` 結尾的檔名不重複加；Obsidian 的 `[[wikilink]]` 與一般連結都要跟著更新 | 改名會讓舊連結失效，必須一併處理 |
| wikilink 解析 | Next.js 建置時解析（remark 外掛），輸出成真正的 `<a href>`，不靠瀏覽器端 JS；索引由建置時掃描檔案自動產生，不再手動維護 `assets/wikilink-index.json` | `wikilink.js` 是給 GitHub Pages 用的瀏覽器端轉換器，Obsidian 本身就看得懂 `[[ ]]`；靜態輸出可以在建置時就把連結算好 |
| 成功標準 | 改一個色票或字距值，全站頁面一起變；`.md` 與圖片檔案零變動；私人資料夾不出現在輸出；輸出大小在 Pages 上限內 | 從她的目標推出來，她沒逐條說過 |

## (i) 尚未決定，需要 Abby 回答

目前沒有待回答的問題；(h) 的暫定決定請 Abby 檢查。

相關筆記：[[useSlideDeck-逐題解析-ref-closest-forEach-scroll-snap]]（scroll-snap 的原理）、[[nextjs-ssg-and-headless-cms]]（Next.js 靜態輸出）。

## 資料來源（含查證時間）

| 主題 | 來源 | 版本／時間 |
|---|---|---|
| 筆記與 html 數量、重複區塊、語法使用量 | 在 repo 內以 `find` 與 `grep` 統計 | 2026-11-11 |
| 共用檔清單與用途 | `assets/notes.css`、`assets/notes.js`、`assets/note-interactive.css` 檔頭註解 | 2026-11-11 |
| 現行發布設定與 exclude 清單 | repo 根目錄 `_config.yml` | 2026-11-11 |
| repo 容量 | `du -sm`（整個 repo 與 `obsidian-attachment`） | 2026-11-11 |
| GitHub Pages 約 1 GB 站點上限 | 憑記憶，未重新查證 | ⚠️ 待查證 |
| Abby 的決定與偏好 | 本次對話與 `CLAUDE.md` | 2026-11-11 |
