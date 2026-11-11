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
"""
import fnmatch
import html
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(ROOT, "index.html")
ALWAYS_SKIP_DIRS = {"assets", "obsidian-attachment", "node_modules", "vendor"}
ALT_SUFFIX = "-互動版"

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
TAIL_FALLBACK = '<script src="assets/notes.js" defer></script>\n</body>\n</html>\n'


def read_jekyll_excludes():
    """從 _config.yml 的 exclude: 區塊讀出排除清單（只支援簡單的 `- 項目` 寫法）。"""
    path = os.path.join(ROOT, "_config.yml")
    if not os.path.exists(path):
        return []
    out, inside = [], False
    for line in open(path, encoding="utf-8"):
        if re.match(r"^exclude:\s*$", line):
            inside = True
            continue
        if inside:
            m = re.match(r"^\s*-\s*(.+?)\s*$", line)
            if m:
                item = re.sub(r"\s+#.*$", "", m.group(1)).strip().strip("\"'")
                if item:
                    out.append(item)
            elif line.strip() and not line.lstrip().startswith("#"):
                break  # 下一個頂層設定
    return out


def is_excluded(rel, patterns):
    name = rel.rsplit("/", 1)[-1]
    for p in patterns:
        if p.endswith("/"):
            d = p.rstrip("/")
            if rel == d or rel.startswith(d + "/") or name == d:
                return True
        elif fnmatch.fnmatch(name, p) or fnmatch.fnmatch(rel, p):
            return True
    return False


def href_quote(path):
    """保留中文與空白（跟舊索引一致），只處理會破壞 URL 的字元，再做 HTML 轉義。"""
    p = path.replace("%", "%25").replace("#", "%23").replace("?", "%3F")
    return html.escape(p, quote=True)


def natural_key(s):
    """自然排序：2-xxx 排在 10-xxx 前面（re.split 結果固定 str, int, str… 交錯，型別一定對得上）。"""
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", s)]


class Node:
    def __init__(self):
        self.files = []  # (stem, href, alt_href | None)
        self.dirs = {}

    def total(self):
        return len(self.files) + sum(d.total() for d in self.dirs.values())


def collect(excludes):
    root_node = Node()
    skipped_excluded = 0
    pair_count = 0
    for cur, dirs, files in os.walk(ROOT):
        rel_dir = os.path.relpath(cur, ROOT).replace("\\", "/")
        rel_dir = "" if rel_dir == "." else rel_dir
        keep = []
        for d in sorted(dirs):
            rel = f"{rel_dir}/{d}" if rel_dir else d
            if d[0] in "._#" or d in ALWAYS_SKIP_DIRS:
                continue
            if is_excluded(rel, excludes):
                skipped_excluded += sum(
                    1 for _, _, fs in os.walk(os.path.join(ROOT, rel))
                    for f in fs if f.endswith((".md", ".html"))
                )
                continue
            keep.append(d)
        dirs[:] = keep

        stems = {}  # stem -> set(ext)
        for f in files:
            if f[0] in "._#" or not f.endswith((".md", ".html")):
                continue
            rel = f"{rel_dir}/{f}" if rel_dir else f
            if rel == "index.html":
                continue
            if is_excluded(rel, excludes):
                skipped_excluded += 1
                continue
            stem, ext = os.path.splitext(f)
            stems.setdefault(stem, set()).add(ext)
        if not stems:
            continue

        pair_count += sum(1 for e in stems.values() if len(e) == 2)
        node = root_node
        if rel_dir:
            for part in rel_dir.split("/"):
                node = node.dirs.setdefault(part, Node())
        prefix = f"{rel_dir}/" if rel_dir else ""
        alts = {}
        for stem in list(stems):
            if stem.endswith(ALT_SUFFIX) and stem[: -len(ALT_SUFFIX)] in stems:
                alts[stem[: -len(ALT_SUFFIX)]] = stem
                del stems[stem]
        for stem in sorted(stems, key=natural_key):
            alt = alts.get(stem)
            node.files.append(
                (stem, f"{prefix}{stem}.html", f"{prefix}{alt}.html" if alt else None)
            )
    return root_node, skipped_excluded, pair_count


def render_files(node, out):
    out.append("<ul>")
    for stem, href, alt in node.files:
        li = f'<li><a href="{href_quote(href)}">{html.escape(stem)}</a>'
        if alt:
            li += f'<a class="alt-link" href="{href_quote(alt)}">[互動版]</a>'
        out.append(li + "</li>")
    out.append("</ul>")


def render_dir(name, node, out, top):
    if node.total() == 0:
        return
    out.append("<details open>" if top else "<details>")
    out.append(f'<summary>{html.escape(name)} <span class="count">({node.total()})</span></summary>')
    out.append('<div class="nested">')
    if node.files:
        render_files(node, out)
    for sub in sorted(node.dirs, key=natural_key):
        render_dir(sub, node.dirs[sub], out, False)
    out.append("</div>")
    out.append("</details>")


def build_body(root_node):
    out = [f'<h1>Abby Notes 索引 <span class="count">共 {root_node.total()} 篇</span></h1>']
    if root_node.files:
        render_files(root_node, out)
    for name in sorted(root_node.dirs, key=natural_key):
        render_dir(name, root_node.dirs[name], out, True)
    return "\n".join(out) + "\n"


def split_template():
    """沿用現有 index.html 的 <h1> 之前（head/CSS）與 <script> 之後。"""
    if not os.path.exists(INDEX):
        return HEAD_FALLBACK, TAIL_FALLBACK
    src = open(INDEX, encoding="utf-8", newline="").read().replace("\r\n", "\n")
    i = src.find("<h1>")
    j = src.rfind('<script src="assets/notes.js"')
    if i < 0 or j < 0:
        return HEAD_FALLBACK, TAIL_FALLBACK
    return src[:i], src[j:]


def main():
    check = "--check" in sys.argv
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    excludes = read_jekyll_excludes()
    tree, skipped, pairs = collect(excludes)
    head, tail = split_template()
    new = head + build_body(tree) + tail

    old = ""
    if os.path.exists(INDEX):
        old = open(INDEX, encoding="utf-8", newline="").read().replace("\r\n", "\n")
    changed = new != old

    print(f"收錄 {tree.total()} 篇；因 _config.yml exclude 略過 {skipped} 個檔案；"
          f"同名 md+html 成對 {pairs} 組（只列一次）")
    if check:
        print("index.html 已是最新" if not changed else "index.html 已過期，請執行 python build-index.py")
        sys.exit(1 if changed else 0)
    if changed:
        with open(INDEX, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(new)
        print("已更新 index.html")
    else:
        print("index.html 無變動")


if __name__ == "__main__":
    main()
