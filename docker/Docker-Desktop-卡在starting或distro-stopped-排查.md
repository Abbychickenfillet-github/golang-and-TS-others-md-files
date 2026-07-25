---
title: Docker Desktop 卡在 starting／docker-desktop distro Stopped 排查
type: troubleshooting-note
tags: [docker, wsl, windows, 排錯, starting, stopped]
updated: 2026-07-17
---

# Docker Desktop 卡在 starting／`docker-desktop` distro Stopped 排查

> 現象（2026-07-17）：Docker Desktop 一直顯示「starting」；`wsl -l -v` 只看到 `docker-desktop  Stopped  2`，點 Restart 後仍 Stopped。磁碟有 60GB（**空間不是原因**）。
> 🔖 **本篇重點索引：a–f，共 6 個。** 字母只表位置與數量。

## (a) 病根：WSL2 後端起不來

`docker-desktop` 是 Docker 自己的 WSL distro。它<mark style="background: #FF5582A6;">啟動後立刻回到 Stopped</mark>＝WSL2 後端有問題，Docker 引擎就跑不起來 → GUI 永遠 starting。<mark style="background: #FFF3A3A6;">多半是 WSL 需要更新／修復</mark>，不是 Docker 本體壞。

## (b) 首要解法：更新 WSL（最高機率修好）

系統管理員開 PowerShell，依序：

```powershell
wsl --update          # ← 最重要，別跳過
wsl --version         # 看 WSL/核心版本有沒有正常
wsl --shutdown        # 全部關掉
```

然後**以系統管理員重開 Docker Desktop**，等 2–3 分鐘。
<mark style="background: #FFB8EBA6;">若 `wsl --update` 卡在 0%</mark>：去微軟手動下載 WSL 更新安裝檔（`wsl_update_x64.msi`）裝好再試。

## (c) 確認虛擬化有開

工作管理員 → 效能 → CPU → 看 <mark style="background: #ADCCFFA6;">「虛擬化：已啟用」</mark>。若是「已停用」，要進 BIOS 開 VT-x/AMD-V（沒開 WSL2 無法跑）。

## (d) 確認 Windows 功能有裝

「開啟或關閉 Windows 功能」裡，<mark style="background: #BBFABBA6;">「Windows 子系統 Linux 版」＋「虛擬機器平台」</mark>兩個都要打勾。缺了就勾起來、重開機。

## (e) 還是 Stopped：重建 docker-desktop distro

```powershell
wsl --unregister docker-desktop
```

<mark style="background: #FF5582A6;">⚠️ 注意：這會刪掉 docker-desktop distro（含裡面的映像／容器）。</mark>掛在專案 `./data`（bind mount）或具名 volume 的資料視情況；重要資料先確認。unregister 後，重開 Docker Desktop 會自動重建這個 distro。

## (f) 最後手段

- Docker Desktop → Troubleshoot（🐞）→ **Restart**；看 log 有無明確錯誤（`%LOCALAPPDATA%\Docker\log.txt`）。
- Troubleshoot → **Reset to factory defaults**（⚠️ 清掉容器/映像）。
- 單純 **重開機** 也常有效（釋放卡住的 `com.docker.backend`、`vpnkit`、`wslservice`）。

> 旁註：移除防毒／VPN（ExpressVPN）是對的方向——它們有時會卡 WSL 網路。移除 Python 3.12 與此無關；記得 `python --version` 確認 3.13 還在、`pip` 指向正確。

## 資料來源（含查證時間）

> 查證日期：2026-07-17

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Docker 卡 starting 綜合排查 | [codegenes — Docker Desktop Starting Forever on Windows](https://www.codegenes.net/blog/docker-desktop-starting-forever-on-windows/) | 2025／持續更新 |
| wsl --update 修復（含 update 卡 0%） | [GitHub — Wsl-docker-troubleshoot](https://github.com/Simplekost/Wsl-docker-troubleshoot) | 社群修復筆記 |
| WSL2 + kernel 更新指南 | [codestudy — Docker Desktop stopped after installation (WSL2 guide)](https://www.codestudy.net/blog/docker-desktop-stopped-message-after-installation/) | 2025 |

## 相關筆記

- Docker 引擎與 WSL 關係：[[docker-引擎-context-image-container-觀念]]
- C 槽/vhdx 清理：[[系統維護-C槽清理]]
- 系統路徑：[[usr-Unix系統資源]]
