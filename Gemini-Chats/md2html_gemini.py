#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gemini 對話筆記 → 精美互動 HTML 轉換器

用法：
    python md2html_gemini.py <某篇.md> [<另一篇.md> ...]
    python md2html_gemini.py --all          # 掃描 quiz_bank 裡登記的所有筆記

輸出：與 .md 同名同層的 .html

設計重點（給 Abby）：
  - 單一檔案、inline CSS，離線可開
  - 螢光筆 <mark> 可點擊隱藏／顯示（自己考自己）
  - 頂部有「全部遮起來 / 全部顯示」總開關
  - 內建是非題、填空題、申論題三種互動測驗區
  - highlightr 配色與 .md 完全共用同一套
"""

import re
import sys
import json
import html as html_mod
from pathlib import Path

import markdown

VAULT = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------- 螢光筆配色
HL = {
    "#FFF3A3": ("核心重點", "core"),
    "#FF5582": ("警告陷阱", "warn"),
    "#BBFABB": ("正解建議", "ok"),
    "#ADCCFF": ("術語定義", "term"),
    "#FFB8EB": ("數據補充", "data"),
    "#D2B3FF": ("次要備註", "note"),
}


# ---------------------------------------------------------------- frontmatter
def split_front_matter(text):
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    raw = text[3:end].strip("\n")
    body = text[end + 4 :].lstrip("\n")

    meta, key = {}, None
    for line in raw.split("\n"):
        if not line.strip():
            continue
        if line.lstrip().startswith("- ") and key:
            meta.setdefault(key, [])
            if isinstance(meta[key], list):
                meta[key].append(line.lstrip()[2:].strip())
            continue
        if ":" in line:
            k, v = line.split(":", 1)
            key = k.strip()
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                meta[key] = [x.strip() for x in v[1:-1].split(",") if x.strip()]
            elif v == "":
                meta[key] = []
            else:
                # 去掉 YAML 純量外層的引號,否則 title 會被渲染成 &quot;標題&quot;
                if len(v) >= 2 and v[0] == v[-1] and v[0] in ('"', "'"):
                    v = v[1:-1]
                meta[key] = v
    return meta, body


# ---------------------------------------------------------------- md → html
def convert_body(body):
    # wikilink → 純文字藥丸（HTML 版無法跳 Obsidian，改標成視覺提示）
    def wl(m):
        inner = m.group(1)
        label = inner.split("|")[-1]
        return f'<span class="wikilink" title="Obsidian 連結：{html_mod.escape(inner)}">{html_mod.escape(label)}</span>'

    body = re.sub(r"\[\[([^\]]+)\]\]", wl, body)

    md = markdown.Markdown(
        extensions=["extra", "sane_lists", "toc", "nl2br"],
        extension_configs={"toc": {"permalink": False}},
    )
    out = md.convert(body)

    # 把 <mark style="background:#XXXXXXA6;"> 轉成帶 class 的可點擊 mark
    def mk(m):
        color = m.group(1).upper()
        cls = HL.get("#" + color, ("", "core"))[1]
        return f'<mark class="hl hl-{cls}" tabindex="0" role="button" aria-label="點擊可遮蔽或顯示重點">'

    out = re.sub(
        r'<mark style="background:\s*#([0-9A-Fa-f]{6})A6;">', mk, out
    )
    return out


# ---------------------------------------------------------------- 測驗區
def render_quiz(quiz):
    if not quiz:
        return ""
    parts = ['<section class="card quiz"><h2>🧠 自我測驗</h2>']

    tf = quiz.get("tf") or []
    if tf:
        parts.append('<h3>是非題</h3><ol class="qlist">')
        for i, q in enumerate(tf):
            ans = "○ 對" if q["a"] else "✕ 錯"
            parts.append(
                f'<li><p class="qq">{html_mod.escape(q["q"])}</p>'
                f'<div class="btns"><button class="tf" data-ok="{str(q["a"]).lower()}" data-v="true">○ 對</button>'
                f'<button class="tf" data-ok="{str(q["a"]).lower()}" data-v="false">✕ 錯</button></div>'
                f'<div class="fb" data-ans="{ans}">{html_mod.escape(q.get("why", ""))}</div></li>'
            )
        parts.append("</ol>")

    cloze = quiz.get("cloze") or []
    if cloze:
        parts.append('<h3>填空題</h3><ol class="qlist">')
        for q in cloze:
            before, after = q["q"].split("____", 1)
            parts.append(
                f'<li><p class="qq">{html_mod.escape(before)}'
                f'<input class="blank" data-a="{html_mod.escape(q["a"])}" '
                f'placeholder="填答案" autocomplete="off">'
                f'{html_mod.escape(after)}</p>'
                f'<div class="btns"><button class="chk">核對</button>'
                f'<button class="rev">看答案</button></div>'
                f'<div class="fb">{html_mod.escape(q.get("why", ""))}</div></li>'
            )
        parts.append("</ol>")

    essay = quiz.get("essay") or []
    if essay:
        parts.append('<h3>申論題</h3><ol class="qlist">')
        for q in essay:
            parts.append(
                f'<li><p class="qq">{html_mod.escape(q["q"])}</p>'
                f'<textarea class="essay" rows="4" placeholder="先自己寫，寫完再看參考答案"></textarea>'
                f'<div class="btns"><button class="rev2">顯示參考答案</button></div>'
                f'<div class="fb ref">{html_mod.escape(q["a"])}</div></li>'
            )
        parts.append("</ol>")

    parts.append("</section>")
    return "".join(parts)


# ---------------------------------------------------------------- 模板
CSS = """
:root{
  --bg:#fbfaf7; --card:#ffffff; --ink:#23303b; --muted:#6b7b88;
  --line:#e4e8ec; --accent:#3f6f8f; --accent-soft:#eaf2f7;
  --user:#4a7c59; --ai:#5b6bb5;
  --hl-core:#FFF3A3; --hl-warn:#FF5582; --hl-ok:#BBFABB;
  --hl-term:#ADCCFF; --hl-data:#FFB8EB; --hl-note:#D2B3FF;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);line-height:1.75;
  font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  font-size:16.5px;-webkit-font-smoothing:antialiased}
.wrap{max-width:820px;margin:0 auto;padding:32px 20px 80px}
header.hero{background:linear-gradient(135deg,#eef4f8,#f8f4ee);border:1px solid var(--line);
  border-radius:16px;padding:26px 28px;margin-bottom:22px}
header.hero h1{margin:0 0 12px;font-size:1.75rem;line-height:1.4;letter-spacing:.01em;
  font-family:"Noto Serif TC",Georgia,"Songti TC",serif;color:#1d2b36}
.pills{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px}
.pill{background:var(--accent-soft);color:var(--accent);border:1px solid #d5e3ec;
  border-radius:999px;padding:3px 11px;font-size:.78rem;letter-spacing:.02em}
.meta{font-size:.85rem;color:var(--muted);display:flex;flex-wrap:wrap;gap:14px;align-items:center}
.meta a{color:var(--accent);text-decoration:none;border-bottom:1px dotted var(--accent)}
.toolbar{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 24px}
.toolbar button{background:#fff;border:1px solid var(--line);border-radius:10px;
  padding:8px 14px;font-size:.85rem;cursor:pointer;color:var(--ink);transition:.15s;
  font-family:inherit}
.toolbar button:hover{background:var(--accent-soft);border-color:#cfe0ea}
.toolbar button.on{background:var(--accent);color:#fff;border-color:var(--accent)}
.legend{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 24px;font-size:.74rem;color:var(--muted)}
.legend span{padding:2px 9px;border-radius:6px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;
  padding:24px 28px;margin-bottom:20px}
h2{font-size:1.3rem;margin:34px 0 14px;padding-bottom:9px;border-bottom:2px solid var(--accent-soft);
  font-family:"Noto Serif TC",Georgia,serif;color:#1d2b36}
.card>h2:first-child{margin-top:0}
h3{font-size:1.08rem;margin:26px 0 10px;color:#2c4a5e}
h4{font-size:.98rem;margin:20px 0 8px;color:#3d5567}
p{margin:11px 0}
blockquote{margin:16px 0;padding:12px 18px;background:#f6f8fa;border-left:4px solid var(--accent);
  border-radius:0 8px 8px 0;color:#41525f}
blockquote p{margin:6px 0}
ul,ol{padding-left:1.5em}
li{margin:6px 0}
code{background:#eef1f4;padding:2px 6px;border-radius:5px;font-size:.88em;
  font-family:"JetBrains Mono",Consolas,"Courier New",monospace}
pre{background:#1f2933;color:#e6edf3;padding:16px 18px;border-radius:11px;
  overflow-x:auto;font-size:.86rem;line-height:1.6;margin:14px 0}
pre code{background:none;color:inherit;padding:0;font-size:inherit}
table{border-collapse:collapse;width:100%;margin:16px 0;font-size:.93rem;display:block;overflow-x:auto}
th,td{border:1px solid var(--line);padding:9px 12px;text-align:left;vertical-align:top}
th{background:var(--accent-soft);color:#2c4a5e;font-weight:600;white-space:nowrap}
tbody tr:nth-child(even){background:#fafbfc}
hr{border:none;border-top:1px solid var(--line);margin:30px 0}
.wikilink{background:#f0ece4;border-bottom:1px solid #d8cfbe;padding:1px 6px;
  border-radius:5px;font-size:.93em;color:#6b5c42;cursor:help}
/* ---- 螢光筆：點一下遮起來，再點一下顯示 ---- */
mark.hl{padding:1px 3px;border-radius:4px;cursor:pointer;transition:.18s;
  outline:none;color:inherit}
mark.hl-core{background:var(--hl-core)}
mark.hl-warn{background:var(--hl-warn);color:#4a0a1c}
mark.hl-ok{background:var(--hl-ok)}
mark.hl-term{background:var(--hl-term)}
mark.hl-data{background:var(--hl-data)}
mark.hl-note{background:var(--hl-note)}
mark.hl.masked{color:transparent!important;background:#c9d2d8!important;
  border-radius:4px;user-select:none;text-shadow:none}
mark.hl.masked::after{content:"？";color:#5c6b76;font-weight:700;
  position:absolute;margin-left:-.8em;pointer-events:none}
mark.hl:focus-visible{box-shadow:0 0 0 2px var(--accent)}
/* ---- 對話原文 ---- */
.turn{border-left:4px solid #ddd;padding:2px 0 2px 14px;margin:14px 0;border-radius:0 8px 8px 0}
/* ---- 測驗 ---- */
.quiz{background:linear-gradient(180deg,#fdfcfa,#f9fbfc)}
.qlist{counter-reset:none;padding-left:1.4em}
.qlist>li{margin:18px 0;padding-bottom:14px;border-bottom:1px dashed var(--line)}
.qlist>li:last-child{border-bottom:none}
.qq{font-weight:500;margin:0 0 10px}
.btns{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
.btns button{background:#fff;border:1px solid var(--line);border-radius:9px;
  padding:6px 15px;cursor:pointer;font-size:.85rem;font-family:inherit;transition:.15s}
.btns button:hover{background:var(--accent-soft)}
.btns button.good{background:#d8f5dd;border-color:#9fd8ab}
.btns button.bad{background:#ffdde4;border-color:#f3a8b9}
input.blank{border:none;border-bottom:2px solid var(--accent);background:#fbfdfe;
  padding:2px 8px;font-size:1rem;font-family:inherit;min-width:9em;outline:none;color:var(--ink)}
input.blank.good{border-color:#4a9b5e;background:#f0fbf3}
input.blank.bad{border-color:#d1476a;background:#fdf1f4}
textarea.essay{width:100%;border:1px solid var(--line);border-radius:9px;padding:10px 12px;
  font-family:inherit;font-size:.95rem;line-height:1.6;resize:vertical;background:#fdfdfd;color:var(--ink)}
.fb{display:none;margin-top:9px;padding:10px 14px;background:#eef4f8;border-left:3px solid var(--accent);
  border-radius:0 7px 7px 0;font-size:.9rem;color:#3d5567}
.fb.show{display:block}
.fb.ref{background:#f3f0f8;border-left-color:#8a6db5}
footer{text-align:center;color:var(--muted);font-size:.8rem;margin-top:44px;
  padding-top:20px;border-top:1px solid var(--line)}
@media(max-width:640px){
  .wrap{padding:18px 14px 60px}
  .card{padding:18px 16px}
  header.hero{padding:20px 18px}
  header.hero h1{font-size:1.4rem}
}
@media print{.toolbar,.quiz{display:none}mark.hl.masked{color:inherit!important;background:var(--hl-core)!important}}
"""

JS = """
(function(){
  // 螢光筆：點擊遮蔽／顯示
  document.querySelectorAll('mark.hl').forEach(function(m){
    var toggle=function(){ m.classList.toggle('masked'); };
    m.addEventListener('click',toggle);
    m.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}
    });
  });
  var maskAll=document.getElementById('maskAll');
  var showAll=document.getElementById('showAll');
  if(maskAll)maskAll.addEventListener('click',function(){
    document.querySelectorAll('mark.hl').forEach(function(m){m.classList.add('masked');});
  });
  if(showAll)showAll.addEventListener('click',function(){
    document.querySelectorAll('mark.hl').forEach(function(m){m.classList.remove('masked');});
  });

  // 是非題
  document.querySelectorAll('button.tf').forEach(function(b){
    b.addEventListener('click',function(){
      var ok=b.dataset.ok==='true', picked=b.dataset.v==='true';
      var li=b.closest('li');
      li.querySelectorAll('button.tf').forEach(function(x){x.classList.remove('good','bad');});
      b.classList.add(ok===picked?'good':'bad');
      var fb=li.querySelector('.fb');
      fb.classList.add('show');
      if(!fb.dataset.done){ fb.textContent='正解 '+fb.dataset.ans+'　'+fb.textContent; fb.dataset.done='1'; }
    });
  });

  // 填空題
  var norm=function(s){return (s||'').trim().toLowerCase().replace(/\\s+/g,'');};
  document.querySelectorAll('button.chk').forEach(function(b){
    b.addEventListener('click',function(){
      var li=b.closest('li'), inp=li.querySelector('input.blank');
      var ok=norm(inp.value)===norm(inp.dataset.a);
      inp.classList.remove('good','bad');
      inp.classList.add(ok?'good':'bad');
      if(ok){ li.querySelector('.fb').classList.add('show'); }
    });
  });
  document.querySelectorAll('button.rev').forEach(function(b){
    b.addEventListener('click',function(){
      var li=b.closest('li'), inp=li.querySelector('input.blank');
      inp.value=inp.dataset.a; inp.classList.remove('bad'); inp.classList.add('good');
      li.querySelector('.fb').classList.add('show');
    });
  });
  document.querySelectorAll('input.blank').forEach(function(inp){
    inp.addEventListener('keydown',function(e){
      if(e.key==='Enter'){ e.preventDefault(); inp.closest('li').querySelector('button.chk').click(); }
    });
  });

  // 申論題
  document.querySelectorAll('button.rev2').forEach(function(b){
    b.addEventListener('click',function(){
      var fb=b.closest('li').querySelector('.fb');
      fb.classList.toggle('show');
      b.textContent=fb.classList.contains('show')?'收起參考答案':'顯示參考答案';
    });
  });
})();
"""

TPL = """<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<style>{css}</style>
</head>
<body>
<div class="wrap">
<header class="hero">
  <h1>{title}</h1>
  <div class="pills">{pills}</div>
  <div class="meta">
    <span>更新於 {updated}</span>
    <span>來源：{source}</span>
    {srclinks}
  </div>
</header>

<div class="toolbar">
  <button id="maskAll">🙈 全部遮起來（自己考自己）</button>
  <button id="showAll">👀 全部顯示</button>
</div>

<div class="legend">
  <span style="background:#FFF3A3">核心重點</span>
  <span style="background:#FF5582;color:#4a0a1c">警告陷阱</span>
  <span style="background:#BBFABB">正解建議</span>
  <span style="background:#ADCCFF">術語定義</span>
  <span style="background:#FFB8EB">數據補充</span>
  <span style="background:#D2B3FF">次要備註</span>
  <span>　←　點任一個螢光筆可以把它遮起來</span>
</div>

{quiz}

<article class="card">
{body}
</article>

<footer>由 Gemini 對話自動整理 · 更新於 {updated}</footer>
</div>
<script>{js}</script>
</body>
</html>
"""


def build(md_path: Path, quiz=None):
    text = md_path.read_text(encoding="utf-8")
    meta, body = split_front_matter(text)

    title = meta.get("title") or md_path.stem
    tags = meta.get("tags") or []
    if isinstance(tags, str):
        tags = [tags]
    srcs = meta.get("sources") or []
    if isinstance(srcs, str):
        srcs = [srcs]

    pills = "".join(f'<span class="pill">#{html_mod.escape(t)}</span>' for t in tags)
    srclinks = "".join(
        f'<a href="{html_mod.escape(u)}" target="_blank" rel="noopener">原始對話 {i+1}</a>'
        for i, u in enumerate(srcs)
    )

    out = TPL.format(
        title=html_mod.escape(title),
        css=CSS,
        js=JS,
        pills=pills,
        updated=html_mod.escape(str(meta.get("updated", ""))),
        source=html_mod.escape(str(meta.get("source", ""))),
        srclinks=srclinks,
        quiz=render_quiz(quiz),
        body=convert_body(body),
    )
    html_path = md_path.with_suffix(".html")
    html_path.write_text(out, encoding="utf-8")
    return html_path


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return
    bank_path = Path(__file__).parent / "quiz_bank.json"
    bank = json.loads(bank_path.read_text(encoding="utf-8")) if bank_path.exists() else {}

    targets = []
    if args[0] == "--all":
        targets = [VAULT / p for p in bank]
    else:
        targets = [Path(a) for a in args]

    for p in targets:
        if not p.exists():
            print("跳過（找不到）：", p)
            continue
        key = str(p.relative_to(VAULT)).replace("\\\\", "/")
        out = build(p, bank.get(key))
        print("已產生：", out.relative_to(VAULT))


if __name__ == "__main__":
    main()
