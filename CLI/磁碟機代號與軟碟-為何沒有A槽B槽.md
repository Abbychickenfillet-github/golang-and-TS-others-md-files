---
title: 磁碟機代號與軟碟：為什麼現在沒有 A: 槽、B: 槽？
type: concept-note
tags: [windows, 硬體, 磁碟, 軟碟, floppy, cli]
updated: 2026-07-17
---

# 磁碟機代號與軟碟：為什麼現在沒有 A: 槽、B: 槽？

> 🔖 **本篇重點索引：a–c，共 3 個。** 字母只表位置與數量。
> 延伸自 [[usr-Unix系統資源]]（磁碟命名：C:/D: 是 Windows 專屬概念）。

## (a) 為什麼從 C: 開始，沒有 A:、B:？

<mark style="background: #FFF3A3A6;">A: 和 B: 被「保留」給軟碟機（floppy drive）</mark>——這是 DOS 時代留下的慣例：

- <mark style="background: #ADCCFFA6;">A:</mark> = 第一台軟碟機，<mark style="background: #ADCCFFA6;">B:</mark> = 第二台軟碟機。
- <mark style="background: #ADCCFFA6;">C:</mark> = 第一顆硬碟。所以硬碟一律從 C: 起跳。

<mark style="background: #FF5582A6;">現在的電腦幾乎都沒有軟碟機了</mark>，所以 A:、B: 空著沒東西用 → 你只看得到 C: 以後（D:、E:…）。這不是壞掉，是<mark style="background: #BBFABBA6;">歷史保留</mark>。（真要的話，A:／B: 可以手動指派給別的磁碟。）

## (b) 「軟碟（floppy disk）」是什麼？

<mark style="background: #ADCCFFA6;">軟碟＝一種早期的可攜式磁性儲存媒體</mark>，因為裡面的磁片是「軟」的塑膠磁片而得名（對比硬碟裡「硬」的金屬碟盤）。

- 常見的 3.5 吋磁片容量只有 <mark style="background: #FFB8EBA6;">1.44 MB</mark>（對，是 MB，不是 GB）。
- 要配「軟碟機」讀寫；早年拿來裝系統、傳檔案、開機。
- 後來被 <mark style="background: #FF5582A6;">USB 隨身碟、光碟、網路</mark>取代而淘汰。
- 冷知識：很多軟體的「儲存」圖示 💾 就是一片 3.5 吋軟碟的樣子。

## (c) 磁碟機代號（drive letter）怎麼來的

Windows（承襲 DOS）用<mark style="background: #FFF3A3A6;">「單一字母 + 冒號」</mark>代表一個磁碟區（volume/partition）：`A:`～`Z:`。

- 代號是指派給<mark style="background: #ADCCFFA6;">「磁碟區／分割區」</mark>，不是「一顆實體硬碟＝一個字母」：一顆硬碟切兩區，可能是 C: 和 D:。
- D: 不保證是「第二顆硬碟」，可能是同顆的另一分割區、光碟機、USB。
- 對比 <mark style="background: #FF5582A6;">Linux 沒有磁碟機代號</mark>：改用掛載到路徑（`/`、`/mnt/c`…），見 [[usr-Unix系統資源]]。

## 資料來源（含查證時間）

> 查證日期：2026-07-17（drive letter / floppy 屬電腦一般常識，下列為延伸閱讀）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 磁碟機代號分配（A:/B: 保留給軟碟） | [Wikipedia — Drive letter assignment](https://en.wikipedia.org/wiki/Drive_letter_assignment) | 條目持續更新 |
| 軟碟 | [Wikipedia — Floppy disk](https://en.wikipedia.org/wiki/Floppy_disk) | 條目持續更新 |

## 相關筆記

- 系統路徑與磁碟命名：[[usr-Unix系統資源]]
