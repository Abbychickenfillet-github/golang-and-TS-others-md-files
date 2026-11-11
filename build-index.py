#!/usr/bin/env python3
"""
build-index.py — 掃描 Abby-notes，自動重新產生 index.html

為什麼需要它：
  index.html 以前是手動（或請 Claude 一次性）維護的快照，
  之後新增、搬移、改名的筆記都不會自動進去，造成漏列與 404 死連結。
  這支腳本讓「檔案系統」成為唯一真相，索引每次都從它重建。

用法：
  python build-index.py            # 重新產生 index.html
  python build-index.py --check    # 只看報告，不寫檔（索引過期時 exit code = 1）

規則（沿用原本索引的樣式，不改 CSS）：
  - 收錄 .md 與 .html；.md 會被 Jekyll 轉成同名 .html，所以連結一律指向 .html
  - 同資料夾若有「X.md」與「X-互動版.html」，互動版會變成 X 後面的 [互動版] 連結
  - 同名 md+html 只列一次
  - 略過：以 . _ # 開頭的檔案/資料夾（Jekyll 本來就不發布）、_config.yml 的 exclude、
          assets / obsidian-attachment / node_modules / vendor、index.html 自己
    （_config.yml 排除的內容在線上本來就是 404，列進索引只會變成死連結）
  - 排序：同層「檔案在前、資料夾在後」，依檔名「自然排序」（2 排在 10 前面）；(n) 為該資料夾遞迴篇數
  - <head>、CSS、<script> 沿用現有 index.html，你改過的樣式不會被覆蓋

整體流程（main 函式依序做）：
  1. read_jekyll_excludes()  讀 _config.yml，知道哪些路徑 Jekyll 不會發布
  2. collect()               走訪整個 repo，把收錄的筆記整理成一棵「資料夾樹」(Node)
  3. split_template()        從現有 index.html 取出 <head> 與結尾的 <script>（樣式原樣保留）
  4. build_body()            把資料夾樹轉成 <ul>/<details> 的 HTML 清單
  5. 比對新舊內容，有變才寫檔
"""
# ---- 標準函式庫（不需要 pip 安裝任何東西）----
import fnmatch  # 用「萬用字元」比對檔名，例如 "*.sh" 代表所有 .sh 檔
import html     # html.escape：把 & < > " 轉成 HTML 安全寫法，避免破壞標籤
import os       # 走訪資料夾、組路徑、判斷檔案是否存在
import re       # 正規表示式，用來解析 _config.yml 與做自然排序
import sys      # 讀命令列參數（sys.argv）、結束程式碼（sys.exit）

# ==================== 設定區（想改規則先看這裡）====================

# 這支腳本所在的資料夾 = Abby-notes 根目錄。
# __file__ 是這個檔案自己的路徑；abspath 轉成絕對路徑；dirname 取出資料夾部分。
ROOT = os.path.dirname(os.path.abspath(__file__))

# 要產生的索引檔：Abby-notes/index.html
INDEX = os.path.join(ROOT, "index.html")

# 不管 _config.yml 有沒有寫，這些資料夾一律不掃（圖片、套件、共用資源，裡面沒有筆記）。
# 用 set（集合）是因為「某個名字在不在裡面」查起來最快。
ALWAYS_SKIP_DIRS = {"assets", "obsidian-attachment", "node_modules", "vendor"}

# 互動版的檔名約定：「X-互動版.html」會被視為「X」的互動版，併在 X 後面當 [互動版] 連結。
ALT_SUFFIX = "-互動版"

# 找不到現有 index.html（或格式不對）時，才會用到的備用 <head>。
# 平常不會用到：因為正常情況是沿用現有檔案的 <head>，保留你改過的 CSS。
# 三個引號 """ 包起來的是「多行字串」。
HEAD_FALLBACK = """<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Abby Notes 索引</title>
<link rel="stylesheet" href="assets/notes.css">
</head>
<body>
"""
# 備用的結尾：載入共用腳本 notes.js，再關閉 body 與 html。字串裡的 \n 代表換行。
TAIL_FALLBACK = '<script src="assets/notes.js" defer></script>\n</body>\n</html>\n'


# ==================== 第 1 步：讀 Jekyll 的排除清單 ====================

def read_jekyll_excludes():
    """從 _config.yml 的 exclude: 區塊讀出排除清單（只支援簡單的 `- 項目` 寫法）。"""
    path = os.path.join(ROOT, "_config.yml")
    if not os.path.exists(path):
        return []  # 沒有 _config.yml 就當作沒有排除任何東西

    # out：收集到的排除項目；inside：目前是否讀到「exclude:」底下
    out, inside = [], False
    for line in open(path, encoding="utf-8"):  # 一行一行讀
        # 遇到單獨一行的「exclude:」→ 開始進入排除區塊
        if re.match(r"^exclude:\s*$", line):
            inside = True
            continue  # 這一行本身不用處理，直接看下一行
        if inside:
            # 比對「  - 項目」這種清單行；(.+?) 抓出項目文字
            m = re.match(r"^\s*-\s*(.+?)\s*$", line)
            if m:
                # 去掉行尾註解（空白 + # 之後的文字），再去掉前後空白與引號
                item = re.sub(r"\s+#.*$", "", m.group(1)).strip().strip("\"'")
                if item:
                    out.append(item)
            elif line.strip() and not line.lstrip().startswith("#"):
                # 遇到「不是清單、也不是註解、也不是空行」→ 代表進入下一個頂層設定，排除區塊結束
                break
    return out


def is_excluded(rel, patterns):
    """判斷某個相對路徑 rel 是否被排除。

    patterns 的兩種寫法（跟 Jekyll 的 exclude 一致）：
      - 結尾是 "/"：整個資料夾，例如 "Git/"
      - 其他：萬用字元或檔名，例如 "*.bak"、"build-index.py"
    """
    name = rel.rsplit("/", 1)[-1]  # 路徑最後一段（檔名或資料夾名）
    for p in patterns:
        if p.endswith("/"):
            d = p.rstrip("/")  # 去掉結尾斜線，得到資料夾名
            # 路徑本身就是它、或在它底下、或任何一層的資料夾名剛好等於它
            if rel == d or rel.startswith(d + "/") or name == d:
                return True
        # fnmatch：支援 * ? 這類萬用字元；同時比對「只有檔名」和「完整相對路徑」
        elif fnmatch.fnmatch(name, p) or fnmatch.fnmatch(rel, p):
            return True
    return False


# ==================== 小工具 ====================

def href_quote(path):
    """產生可放進 href="..." 的連結文字。

    保留中文與空白（跟舊索引一致，瀏覽器會自己處理），
    只把會破壞 URL 的 % # ? 轉成 %25 %23 %3F，再用 html.escape 處理 & " < >。
    """
    p = path.replace("%", "%25").replace("#", "%23").replace("?", "%3F")
    return html.escape(p, quote=True)


def natural_key(s):
    """自然排序用的「排序鍵」：讓 2-xxx 排在 10-xxx 前面（一般字串排序會變成 10 在 2 前）。

    做法：用 re.split(r"(\\d+)") 把字串切成「文字、數字、文字、數字…」交錯的片段，
    數字片段轉成 int 比大小，文字片段照字元比。
    （切出來的結果一定是「文字、數字、文字…」交錯，所以比較時型別永遠對得上，不會出錯。）
    """
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", s)]


class Node:
    """資料夾樹的一個節點 = 一個資料夾。根目錄也是一個 Node。"""

    def __init__(self):
        # 這個資料夾「直接放」的筆記；每筆是 (檔名不含副檔名, 主連結, 互動版連結或 None)
        self.files = []
        # 子資料夾：{資料夾名: Node}
        self.dirs = {}

    def total(self):
        """這個資料夾（含所有子資料夾）一共有幾篇筆記，用來顯示 (n)。"""
        return len(self.files) + sum(d.total() for d in self.dirs.values())


# ==================== 第 2 步：走訪 repo，建出資料夾樹 ====================

def collect(excludes):
    """走訪整個 repo，回傳 (資料夾樹的根, 被排除的檔案數, 同名 md+html 成對數)。"""
    root_node = Node()
    skipped_excluded = 0  # 因為 _config.yml 排除而略過的檔案數（只用來印報告）
    pair_count = 0        # 同名 md 與 html 成對的組數（只用來印報告）

    # os.walk 會一層一層往下走：cur=目前資料夾、dirs=其中的子資料夾名、files=其中的檔名
    for cur, dirs, files in os.walk(ROOT):
        # 目前資料夾相對於根目錄的路徑，統一用 "/"（Windows 預設是 "\"）；根目錄本身記成空字串
        rel_dir = os.path.relpath(cur, ROOT).replace("\\", "/")
        rel_dir = "" if rel_dir == "." else rel_dir

        # ---- 決定哪些「子資料夾」要繼續往下走 ----
        keep = []
        for d in sorted(dirs):
            rel = f"{rel_dir}/{d}" if rel_dir else d
            # 以 . _ # 開頭（Jekyll 本來就不發布）或在固定略過名單 → 直接不進去
            if d[0] in "._#" or d in ALWAYS_SKIP_DIRS:
                continue
            # 被 _config.yml 排除 → 不進去，但先數一下裡面有多少筆記，報告才算得出「略過幾個」
            if is_excluded(rel, excludes):
                skipped_excluded += sum(
                    1 for _, _, fs in os.walk(os.path.join(ROOT, rel))
                    for f in fs if f.endswith((".md", ".html"))
                )
                continue
            keep.append(d)
        # 重點：用 dirs[:] = ... 「就地修改」這個 list，os.walk 才會照新的名單走；
        # 如果寫成 dirs = keep（重新指定變數），os.walk 看不到，修剪就無效。
        dirs[:] = keep

        # ---- 整理這個資料夾「直接放」的筆記 ----
        # stems：{檔名不含副檔名: {".md", ".html"} 其中有的副檔名}
        stems = {}
        for f in files:
            # 隱藏檔、底線開頭檔、或不是 .md/.html 的檔案（圖片、.js、.py…）都不收錄
            if f[0] in "._#" or not f.endswith((".md", ".html")):
                continue
            rel = f"{rel_dir}/{f}" if rel_dir else f
            if rel == "index.html":  # 索引不要收錄自己
                continue
            if is_excluded(rel, excludes):
                skipped_excluded += 1
                continue
            stem, ext = os.path.splitext(f)  # "abc.md" → ("abc", ".md")
            # setdefault：這個 stem 還沒出現過就先建一個空 set，再把副檔名加進去
            stems.setdefault(stem, set()).add(ext)
        if not stems:
            continue  # 這個資料夾沒有筆記就跳過

        # 同一個 stem 同時有 .md 與 .html → 算一組「成對」（索引只列一次）
        pair_count += sum(1 for e in stems.values() if len(e) == 2)

        # ---- 找到（或建立）這個資料夾在樹上對應的 Node ----
        node = root_node
        if rel_dir:
            # 例如 "backend/database" → 依序走 backend、database，沒有就新建
            for part in rel_dir.split("/"):
                node = node.dirs.setdefault(part, Node())
        prefix = f"{rel_dir}/" if rel_dir else ""  # 連結的資料夾前綴

        # ---- 互動版配對 ----
        # alts：{主筆記的 stem: 互動版的 stem}
        alts = {}
        for stem in list(stems):  # list(...) 複製一份，因為迴圈裡會刪除 stems 的項目
            # 條件：名稱以「-互動版」結尾，而且去掉後綴後的主筆記在同一個資料夾真的存在
            if stem.endswith(ALT_SUFFIX) and stem[: -len(ALT_SUFFIX)] in stems:
                alts[stem[: -len(ALT_SUFFIX)]] = stem
                del stems[stem]  # 互動版不單獨成為一筆，併進主筆記的後面

        # ---- 依自然排序把筆記加進這個 Node ----
        for stem in sorted(stems, key=natural_key):
            alt = alts.get(stem)  # 有互動版就拿到它的 stem，沒有就是 None
            node.files.append(
                # 連結一律用 .html：.md 會被 Jekyll 轉成同名 .html
                (stem, f"{prefix}{stem}.html", f"{prefix}{alt}.html" if alt else None)
            )
    return root_node, skipped_excluded, pair_count


# ==================== 第 4 步：把資料夾樹轉成 HTML ====================

def render_files(node, out):
    """輸出一個資料夾「直接放」的筆記清單：<ul> 裡每篇一個 <li>。out 是收集輸出行的 list。"""
    out.append("<ul>")
    for stem, href, alt in node.files:
        # 主連結：連結文字用 html.escape 處理，避免檔名裡的 & < > 破壞 HTML
        li = f'<li><a href="{href_quote(href)}">{html.escape(stem)}</a>'
        if alt:
            # 有互動版就在後面加一個灰色小字的 [互動版] 連結（樣式 .alt-link 定義在 <head>）
            li += f'<a class="alt-link" href="{href_quote(alt)}">[互動版]</a>'
        out.append(li + "</li>")
    out.append("</ul>")


def render_dir(name, node, out, top):
    """輸出一個資料夾：<details>（可摺疊）+ 標題列 + 內容。

    top=True 表示頂層資料夾，預設展開（<details open>）；子資料夾預設收合。
    """
    if node.total() == 0:
        return  # 裡面一篇都沒有就不顯示
    out.append("<details open>" if top else "<details>")
    # 標題列：資料夾名 + 遞迴篇數 (n)
    out.append(f'<summary>{html.escape(name)} <span class="count">({node.total()})</span></summary>')
    out.append('<div class="nested">')  # 內容縮排區（樣式 .nested）
    if node.files:
        render_files(node, out)  # 先列這個資料夾本層的筆記
    for sub in sorted(node.dirs, key=natural_key):
        render_dir(sub, node.dirs[sub], out, False)  # 再遞迴列子資料夾
    out.append("</div>")
    out.append("</details>")


def build_body(root_node):
    """產生 <h1> 標題 + 根目錄筆記 + 所有頂層資料夾，回傳整段 HTML 字串。"""
    out = [f'<h1>Abby Notes 索引 <span class="count">共 {root_node.total()} 篇</span></h1>']
    if root_node.files:
        render_files(root_node, out)  # 根目錄（不在任何資料夾內）的筆記
    for name in sorted(root_node.dirs, key=natural_key):
        render_dir(name, root_node.dirs[name], out, True)  # 頂層資料夾
    return "\n".join(out) + "\n"  # 每個元素一行，最後補一個換行


# ==================== 第 3 步：沿用現有 index.html 的 head 與結尾 ====================

def split_template():
    """沿用現有 index.html 的 <h1> 之前（head/CSS）與 <script> 之後，原樣保留。

    這樣你直接改 index.html 裡的 CSS 或 <head>，重建時不會被覆蓋。
    回傳 (開頭部分, 結尾部分)。
    """
    if not os.path.exists(INDEX):
        return HEAD_FALLBACK, TAIL_FALLBACK
    # newline="" 讀進來保留原本換行，再統一把 Windows 的 \r\n 換成 \n，避免新舊比對誤判
    src = open(INDEX, encoding="utf-8", newline="").read().replace("\r\n", "\n")
    i = src.find("<h1>")                              # 標題開始位置 = head 結束位置
    j = src.rfind('<script src="assets/notes.js"')   # 最後一個 notes.js 的位置 = 結尾開始位置
    if i < 0 or j < 0:
        return HEAD_FALLBACK, TAIL_FALLBACK  # 找不到標記（格式被改壞）就用備用的
    return src[:i], src[j:]  # 字串切片：[:i] 取到 i 之前、[j:] 取 j 之後


# ==================== 主程式 ====================

def main():
    # 命令列有帶 --check 就只檢查、不寫檔
    check = "--check" in sys.argv
    # 讓 Windows 終端機也能正確印出中文（避免亂碼）
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    excludes = read_jekyll_excludes()          # 1. 讀排除清單
    tree, skipped, pairs = collect(excludes)   # 2. 走訪 repo、建樹
    head, tail = split_template()              # 3. 取現有的 head / tail
    new = head + build_body(tree) + tail       # 4. 組出新的完整 index.html 內容

    # 讀出目前的 index.html，等一下跟新內容比對
    old = ""
    if os.path.exists(INDEX):
        old = open(INDEX, encoding="utf-8", newline="").read().replace("\r\n", "\n")
    changed = new != old

    # 印出報告（f-string：大括號裡的變數會被代入）
    print(f"收錄 {tree.total()} 篇；因 _config.yml exclude 略過 {skipped} 個檔案；"
          f"同名 md+html 成對 {pairs} 組（只列一次）")

    if check:
        # --check 模式：只回報，並用結束碼告訴呼叫者（0=最新、1=過期），不寫檔
        print("index.html 已是最新" if not changed else "index.html 已過期，請執行 python build-index.py")
        sys.exit(1 if changed else 0)

    if changed:
        # newline="\n"：強制用 LF 換行寫檔，不要被 Windows 轉成 CRLF
        with open(INDEX, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(new)
        print("已更新 index.html")
    else:
        print("index.html 無變動")


# 只有「直接執行這個檔案」才會跑 main()；被別的程式 import 時不會自動執行
if __name__ == "__main__":
    main()
