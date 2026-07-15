---
title: Unix 與類 Unix 系統介紹
type: topic-note
source: Gemini
tags: [gemini, 作業系統, unix, linux, macos, bsd]
sources:
  - https://gemini.google.com/app/99bcb912540d69c8
updated: 2026-06-19
---

# Unix 與類 Unix 系統介紹

## 重點整理

Unix 家族可分成兩大類：經官方認證的<mark style="background: #ADCCFFA6;">「正統 Unix」</mark>，以及行為高度相似但法理上不能叫 Unix 的<mark style="background: #ADCCFFA6;">「類 Unix（Unix-like）」</mark>。個人電腦最常見的是 Windows，但伺服器、工程工作站與蘋果生態系都是 Unix 家族的天下。

### 1. 蘋果 Apple（macOS / iOS）該看鳥哥網站
鮮為人知：<mark style="background: #FFF3A3A6;">Mac 是目前世上發行量最大的官方認證 Unix 系統</mark>。

- 核心叫 <mark style="background: #ADCCFFA6;">Darwin</mark>，以 <mark style="background: #ADCCFFA6;">BSD</mark>（著名 Unix 分支）＋ Mach 微核心為基礎。
- 通過 The Open Group 的 UNIX 認證（UNIX 03 合規），所以 MacBook、iMac、Mac mini／Studio 本質上都是 Unix 電腦。

### 2. 傳統企業級 Unix 工作站／伺服器
由科技巨頭為高效能運算或企業伺服器開發，多採非 x86 的專屬處理器：

- **IBM AIX**：跑在 IBM Power 系統上，廣用於銀行、金融、大型企業核心系統。
- **Oracle Solaris**（原 Sun Microsystems）：學術界與大型網路伺服器名系統，跑在 SPARC 或 x86。
- **HP-UX**：HP 為其專有伺服器開發的 Unix。

### 3. 類 Unix：Linux 家族
Linux 因商標與授權原因不能直接叫 Unix，但<mark style="background: #FFF3A3A6;">完全模仿 Unix 的架構與哲學</mark>，現今絕大多數伺服器都跑 Linux。

- 常見發行版：Ubuntu、Debian、CentOS、RHEL（Red Hat）、Alpine Linux 等。
- 載體：雲端與企業伺服器、容器（Docker 映像常用 Alpine／Debian）、嵌入式裝置等。

> [!info] 一句話
> macOS＝有認證的正統 Unix；Linux＝沒掛 Unix 商標但骨子裡是 Unix 的類 Unix；兩者都遵循 Unix 哲學，所以指令與操作手感相通。

## 各對話來源

### Unix 與類 Unix 電腦介紹（2026-06）— https://gemini.google.com/app/99bcb912540d69c8

使用者：Unix 系統的電腦有哪些

Gemini：分兩大類——正統 Unix（Commercial Unix）與類 Unix（Unix-like）。①蘋果 macOS/iOS：核心 Darwin（BSD＋Mach），通過 The Open Group UNIX 認證，是發行量最大的正統 Unix，Mac 全系列皆屬之。②企業級：IBM AIX（Power）、Oracle Solaris（SPARC/x86）、HP-UX。③類 Unix Linux 家族：Ubuntu/Debian/CentOS/RHEL/Alpine，因商標授權不能叫 Unix 但完全模仿其架構與哲學，絕大多數伺服器都跑 Linux。

去看完
https://linux.vbird.org/linux_basic/centos7/
