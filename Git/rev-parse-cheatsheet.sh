#!/usr/bin/env bash
# git rev-parse 各旗標一次看懂 —— 在任何 git repo 裡直接跑
# 對應筆記：git-rev-parse與git-filter-repo-唯讀查詢vs破壞性歷史改寫.md
#
# 全部都是唯讀操作，跑一百次也不會動到你的 repo

set -u

echo "=== 1. 我在哪個 commit ==="
echo "完整 SHA        : $(git rev-parse HEAD)"
echo "短 SHA          : $(git rev-parse --short HEAD)"
echo "上一個 commit   : $(git rev-parse HEAD~1)"

echo
echo "=== 2. 我在哪個分支 ==="
echo "分支名          : $(git rev-parse --abbrev-ref HEAD)"
echo "上游分支        : $(git rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || echo '（沒設定上游）')"

echo
echo "=== 3. 路徑相關（寫腳本最常用）==="
echo "repo 根目錄     : $(git rev-parse --show-toplevel)"
echo ".git 目錄       : $(git rev-parse --git-dir)"
echo "相對根的前綴    : $(git rev-parse --show-prefix)"

echo
echo "=== 4. 護欄：先確認自己真的在 repo 裡再往下做事 ==="
if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "OK，這裡是 git 工作目錄"
else
  echo "這裡不是 git repo，中止" >&2
  exit 1
fi

echo
echo "=== 5. 名字翻譯成 SHA：rev-parse 的本業 ==="
echo "main 的 SHA     : $(git rev-parse main 2>/dev/null || echo '（沒有 main 分支）')"
echo "HEAD 往上三代   : $(git rev-parse HEAD~3 2>/dev/null || echo '（歷史不夠長）')"

echo
echo "--- 對照組：下面這些是會改東西的指令，這支腳本一個都沒用到 ---"
echo "  git filter-repo   破壞性歷史改寫，做之前先備份整個 clone"
echo "  git push --force  覆蓋遠端，做之前先通知協作者"
