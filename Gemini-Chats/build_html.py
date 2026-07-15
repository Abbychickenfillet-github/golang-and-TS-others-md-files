#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gemini 筆記 .md -> 精美互動 HTML 轉換器
用法: python build_html.py <note.md> [note2.md ...]
產出: 同層同名 .html
特色: highlightr 配色、callout、程式碼高亮(highlight.js CDN,離線也可讀)、
      ||答案|| 點擊填空、全域顯示/隱藏答案、是非/申論題自我測驗。
"""
import sys, re, html, io
try:
    import yaml
except Exception:
    yaml = None
import markdown

CALLOUT_ICONS = {'info':'ℹ️','tip':'💡','warning':'⚠️','danger':'🚫','note':'📝',
                 'question':'❓','check':'✅','important':'⭐','quote':'❝','example':'🧪','bug':'🐞'}
CALLOUT_COLORS = {'info':'#ADCCFF','tip':'#BBFABB','warning':'#FFB02E','danger':'#FF5582',
                  'note':'#D2B3FF','question':'#FFB8EB','check':'#BBFABB','important':'#FFF3A3',
                  'quote':'#9aa','example':'#D2B3FF','bug':'#FF5582'}

def md2html(text):
    return markdown.markdown(text, extensions=['fenced_code','tables','sane_lists'])

def preprocess_callouts(text):
    lines = text.split('\n')
    out = []
    i = 0
    while i < len(lines):
        m = re.match(r'^>\s*\[!(\w+)\][+-]?\s*(.*)$', lines[i])
        if m:
            ctype = m.group(1).lower(); title = m.group(2).strip()
            body = []
            i += 1
            while i < len(lines) and lines[i].lstrip().startswith('>'):
                body.append(re.sub(r'^\s*>\s?', '', lines[i])); i += 1
            inner = md2html('\n'.join(body))
            icon = CALLOUT_ICONS.get(ctype, '💬'); color = CALLOUT_COLORS.get(ctype, '#888')
            t = f'<div class="callout-title">{icon} {html.escape(title)}</div>' if title else f'<div class="callout-title">{icon}</div>'
            out.append(f'<div class="callout" style="border-left-color:{color}">{t}<div class="callout-body">{inner}</div></div>')
        else:
            out.append(lines[i]); i += 1
    return '\n'.join(out)

def split_frontmatter(text):
    if text.startswith('---'):
        end = text.find('\n---', 3)
        if end != -1:
            fm = text[3:end].strip()
            body = text[end+4:].lstrip('\n')
            meta = {}
            if yaml:
                try: meta = yaml.safe_load(fm) or {}
                except Exception: meta = {}
            if not meta:
                for ln in fm.split('\n'):
                    if ':' in ln and not ln.strip().startswith('-'):
                        k, v = ln.split(':', 1); meta[k.strip()] = v.strip()
            return meta, body
    return {}, text

CSS = """
:root{--bg:#fbfaf7;--card:#ffffff;--ink:#2b2b2b;--muted:#6b6b6b;--line:#e7e3da;--accent:#7c6f9b;}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
 font-family:-apple-system,"Segoe UI","PingFang TC","Microsoft JhengHei",sans-serif;line-height:1.75;}
.wrap{max-width:820px;margin:0 auto;padding:32px 22px 64px;}
header.note-head{border-bottom:2px solid var(--line);padding-bottom:18px;margin-bottom:26px;}
h1.title{font-family:Georgia,"Songti TC",serif;font-size:30px;margin:0 0 12px;line-height:1.3;}
.pills{display:flex;flex-wrap:wrap;gap:7px;margin:8px 0;}
.pill{background:#efeaf7;color:#5b4f7a;border:1px solid #ded3f0;border-radius:999px;
 padding:3px 11px;font-size:12.5px;}
.meta{color:var(--muted);font-size:13px;margin-top:6px;}
.meta a{color:var(--accent);}
.toolbar{display:flex;gap:10px;margin:18px 0 8px;flex-wrap:wrap;}
.btn{cursor:pointer;border:1px solid var(--line);background:#fff;border-radius:9px;
 padding:7px 14px;font-size:13.5px;color:#4a4458;box-shadow:0 1px 0 rgba(0,0,0,.02);}
.btn:hover{background:#f4f1fb;}
h2{font-size:21px;margin:34px 0 12px;padding-left:11px;border-left:5px solid var(--accent);}
h3{font-size:17px;margin:22px 0 8px;color:#3b3550;}
h4{font-size:15px;margin:16px 0 6px;color:#574f6b;}
section.card{background:var(--card);border:1px solid var(--line);border-radius:14px;
 padding:20px 22px;margin:16px 0;box-shadow:0 2px 10px rgba(60,50,90,.04);}
p{margin:10px 0;}
ul,ol{margin:8px 0 8px 4px;padding-left:22px;}
li{margin:5px 0;}
code{background:#f1eef8;border-radius:5px;padding:1px 6px;font-size:.92em;
 font-family:"SFMono-Regular",Consolas,"Cascadia Code",monospace;}
pre{background:#1f1b2e;color:#eee;border-radius:11px;padding:15px 16px;overflow-x:auto;
 font-size:13.5px;line-height:1.6;}
pre code{background:none;padding:0;color:inherit;}
table{border-collapse:collapse;width:100%;margin:14px 0;font-size:14px;}
th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top;}
th{background:#f1ecf8;}
tbody tr:nth-child(even){background:#faf8fd;}
mark{padding:.5px 3px;border-radius:3px;}
blockquote{margin:12px 0;padding:6px 14px;border-left:4px solid var(--line);color:var(--muted);background:#faf9f6;border-radius:6px;}
.callout{margin:14px 0;padding:12px 16px;border-left:6px solid #888;background:#faf9fc;
 border-radius:10px;}
.callout-title{font-weight:700;margin-bottom:4px;}
.callout-body>:first-child{margin-top:0;}
.callout-body>:last-child{margin-bottom:0;}
.src-turn{margin:14px 0;}
.src-user{background:#eef4ff;border-left:4px solid #ADCCFF;border-radius:8px;padding:9px 13px;margin:8px 0;}
.src-gem{background:#f4f1ec;border-left:4px solid #cdbfa6;border-radius:8px;padding:9px 13px;margin:8px 0;}
.role{font-weight:700;font-size:12.5px;letter-spacing:.04em;color:#7a6f55;display:block;margin-bottom:3px;}
.src-user .role{color:#3f63a8;}
.spoiler{background:#3b3550;color:transparent;border-radius:5px;padding:1px 8px;cursor:pointer;
 transition:.15s;user-select:none;box-shadow:inset 0 0 0 1px #ccc;}
.spoiler::after{content:"　點此看答案　";color:#cdbfe8;font-size:.85em;}
.spoiler.on{background:#e7ffe7;color:#1c5e1c;box-shadow:inset 0 0 0 1px #BBFABB;user-select:text;}
.spoiler.on::after{content:"";}
footer{margin-top:46px;padding-top:16px;border-top:1px solid var(--line);
 color:var(--muted);font-size:12.5px;text-align:center;}
"""

JS = """
function toggleAll(show){document.querySelectorAll('.spoiler').forEach(function(s){
 if(show){s.classList.add('on');}else{s.classList.remove('on');}});}
document.addEventListener('click',function(e){
 if(e.target.classList&&e.target.classList.contains('spoiler')){e.target.classList.toggle('on');}});
(function(){var l=document.createElement('link');l.rel='stylesheet';
 l.href='https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css';
 document.head.appendChild(l);var s=document.createElement('script');
 s.src='https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
 s.onload=function(){try{hljs.highlightAll();}catch(e){}};document.head.appendChild(s);})();
"""

def render(meta, body):
    body = re.sub(r'\|\|(.+?)\|\|', lambda m: f'<span class="spoiler">{m.group(1)}</span>', body, flags=re.S)
    body = preprocess_callouts(body)
    # wrap "## 各對話來源" user/gemini lines
    htmlbody = md2html(body)
    # style 使用者:/Gemini: paragraphs in source section
    htmlbody = re.sub(r'<p>(使用者[:：])\s*(.*?)</p>', r'<div class="src-user"><span class="role">使用者</span>\2</div>', htmlbody, flags=re.S)
    htmlbody = re.sub(r'<p>(Gemini[:：])\s*(.*?)</p>', r'<div class="src-gem"><span class="role">Gemini</span>\2</div>', htmlbody, flags=re.S)

    title = meta.get('title', '筆記')
    tags = meta.get('tags', []) or []
    if isinstance(tags, str): tags = [t.strip() for t in tags.strip('[]').split(',') if t.strip()]
    updated = meta.get('updated', '')
    sources = meta.get('sources', []) or []
    if isinstance(sources, str): sources = [sources]
    pills = ''.join(f'<span class="pill">#{html.escape(str(t))}</span>' for t in tags)
    srclinks = ' · '.join(f'<a href="{html.escape(str(u))}" target="_blank">來源{i+1}</a>' for i, u in enumerate(sources))
    metaline = f'<div class="meta">更新：{html.escape(str(updated))}　{("· 來源：" + srclinks) if srclinks else ""}</div>'

    return f"""<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(str(title))}</title>
<style>{CSS}</style></head><body><div class="wrap">
<header class="note-head"><h1 class="title">{html.escape(str(title))}</h1>
<div class="pills">{pills}</div>{metaline}
<div class="toolbar"><span class="btn" onclick="toggleAll(false)">🙈 隱藏所有答案</span>
<span class="btn" onclick="toggleAll(true)">👀 顯示所有答案</span></div>
</header>
{htmlbody}
<footer>由 Gemini 對話自動整理 · 更新於 {html.escape(str(updated))}</footer>
</div><script>{JS}</script></body></html>"""

def main():
    for path in sys.argv[1:]:
        with io.open(path, encoding='utf-8') as f:
            text = f.read()
        meta, body = split_frontmatter(text)
        out = render(meta, body)
        opath = re.sub(r'\.md$', '.html', path)
        with io.open(opath, 'w', encoding='utf-8') as f:
            f.write(out)
        print('wrote', opath)

if __name__ == '__main__':
    main()
