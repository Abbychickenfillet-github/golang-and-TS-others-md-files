# 如何啟動 docker-desktop 與 WSL

> 日期 2026-07-12。相關:[[Docker問題prune+壓縮vhdx(虛擬磁碟)解決硬碟爆掉]]

## 我的問題

執行 `wsl -l -v` 看到:

```
  NAME              STATE           VERSION
* docker-desktop    Stopped         2
```

`docker-desktop` 是 `Stopped`,要怎麼開啟 docker-desktop?怎麼打開 WSL?

## 解答

### Stopped 是正常的
之前跑過 `wsl --shutdown`,所以 docker-desktop 這個 WSL distro 停著,正常。

### 要用 Docker → 直接開 Docker Desktop App
不用手動啟動那個 WSL distro。**打開 Docker Desktop 應用程式**(開始選單搜尋 "Docker Desktop",或點右下角工作列圖示),它會自動把 `docker-desktop` 後端叫起來,`STATE` 就變 `Running`。

- `docker-desktop` 是 Docker **內部專用** distro,不是給你當一般 Linux 終端機用的,不需要 `wsl -d docker-desktop` 進去。

### 想要一般的 Linux 終端機(Ubuntu)
目前只有 docker-desktop 一個 distro,沒有可互動的 Linux。要裝一個:

```
wsl --install -d Ubuntu
```

裝完打 `wsl` 或從開始選單開 Ubuntu 即可。

## 附記:誤會澄清
輸入終端機那行時,app 曾回「Unknown skill: C:\Windows\System32>wsl.」——那是開頭被誤判成斜線指令去找技能,並非建立了新 skill。今天實際建立的 skill 只有:docker-vhdx-cleanup、explain-file-extension、organize-loose-files。
