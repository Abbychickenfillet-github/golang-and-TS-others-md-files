---
title: Epoch 時間起點 — 閏秒、UTC 與 GMT 的差別
type: topic-note
source: Gemini
tags: [gemini, 計算機基礎, epoch, unix-time, utc, gmt, 閏秒, timestamp]
sources:
  - https://gemini.google.com/app/e26eeade9e115133
updated: 2026-08-27
---

# Epoch 時間起點 — 閏秒、UTC 與 GMT 的差別

本篇重點 a–n，共 14 個

## 重點整理

### 一、Epoch 是什麼

a. <mark style="background: #ADCCFF;">Epoch（紀元／時間起點）</mark>在計算機科學裡指的是「時間計算的基準起點（Reference Point）」。

b. <mark style="background: #FFF3A3;">電腦不是用「年/月/日 時:分:秒」來存時間</mark>，而是挑一個固定的歷史時刻當作第 0 秒，然後用「距離那個起點過了多少秒（或毫秒）」來記錄現在幾點。被選為起點的那個時刻就叫 Epoch。

c. <mark style="background: #ADCCFF;">Unix Epoch</mark> 是目前資訊領域最標準的起點：

| 項目 | 說明 |
| --- | --- |
| 定義時刻 | 1970 年 1 月 1 日 00:00:00 UTC |
| 計算方式 | 從該時刻起累積的秒數，<mark style="background: #FF5582;">忽略閏秒</mark> |
| 表示範例 | `0` 代表 1970-01-01 00:00:00 UTC；`1700000000` 代表 2023-11-14 22:13:20 UTC |

d. <mark style="background: #BBFABB;">為什麼要這樣設計</mark>：
   - 跨平台運算簡單：比較與相減兩個整數（`1700000000 - 1600000000`）極快，不必處理月份天數、閏年、時區換算。
   - 統一儲存格式：跨國傳資料只要送一個整數，接收端再依當地時區轉成易讀格式。

e. <mark style="background: #FFB8EB;">不是所有系統都用 1970 年</mark>：
   - Windows FILETIME：1601-01-01 00:00:00 UTC 起算，單位是 100 奈秒。
   - GPS 時間：1980-01-06 00:00:00 UTC 起算。
   - Apple Cocoa / Core Foundation：部分 API 用 2001-01-01 00:00:00 UTC 起算。
   <mark style="background: #FF5582;">跨系統搬資料時看到時間差了幾十年，通常就是 Epoch 起點不同</mark>。

### 二、閏秒（Leap Second）

f. <mark style="background: #ADCCFF;">閏秒</mark>是為了讓「原子鐘定義的精準時間」與「地球自轉決定的天文時間」保持一致，而在 UTC 中人工加減的 1 秒，是時間系統裡的微調機制。

g. 兩種時間標準的差異造成閏秒：
   - <mark style="background: #ADCCFF;">TAI（International Atomic Time，國際原子時）</mark>：用銫原子振動頻率計時，極穩定，幾百萬年才誤差一秒。
   - <mark style="background: #ADCCFF;">UT1（Universal Time 1，世界時）</mark>：以地球自轉一圈為一天。但地球自轉速度不均勻，會被月球潮汐摩擦、地核運動、冰河融化影響而變慢。

h. 因為地球轉得越來越慢，原子時走得比地球自轉快。當累積誤差接近 <mark style="background: #FFB8EB;">0.9 秒</mark>時，IERS（International Earth Rotation and Reference Systems Service，國際地球自轉和參考系統服務）就宣佈插入 1 閏秒。

i. 閏秒通常加在 6 月 30 日或 12 月 31 日的最後一秒。正常是 `23:59:58 → 23:59:59 → 00:00:00`；加入正閏秒時變成 `23:59:58 → 23:59:59 → 23:59:60 → 00:00:00`，會出現罕見的 <mark style="background: #FF5582;">23:59:60</mark>。

j. <mark style="background: #FF5582;">對資訊系統是惡夢</mark>：很多軟體預設每分鐘只有 60 秒（00 到 59），遇到 `23:59:60` 可能崩潰或無窮迴圈（2012 年閏秒曾造成 Reddit 與大量 Linux 伺服器集體當機）。

k. <mark style="background: #BBFABB;">Leap Smearing（時間塗抹）</mark>是 Google、Meta 等公司的因應做法：在閏秒前後 24 小時內把這 1 秒拆成微小的微秒，均勻分配貼進每一秒裡，讓系統平滑過渡而不會出現第 60 秒。

l. <mark style="background: #FFB8EB;">閏秒的未來</mark>：CGPM（General Conference on Weights and Measures，國際度量衡大會）已決定在 2035 年前取消閏秒機制。

### 三、UTC 與 GMT

m. <mark style="background: #ADCCFF;">UTC（Coordinated Universal Time，協調世界時）</mark><mark style="background: #FF5582;">不是一個時區</mark>，而是全球時間計算的基準尺度。特性有三：以原子時為基礎；本身位於本初子午線（經度 0 度），各地時區以 UTC 加減固定小時表示（台灣是 UTC+8、紐約 EST 是 UTC-5）；全年恆定不實施夏令時間。

n. <mark style="background: #FFF3A3;">UTC 與 GMT 的本質差別</mark>：

| 項目 | GMT（Greenwich Mean Time，格林威治標準時間） | UTC（協調世界時） |
| --- | --- | --- |
| 屬性 | 天文時區 | 物理／科學時間標準 |
| 依據 | 地球自轉與太陽位置 | 原子鐘（必要時以閏秒微調） |
| 精準度 | 較低，受自轉速度不均影響 | 極高 |
| 定位 | 主要作為歷史時區名稱 | 現代電腦、通訊與科學的統一標準 |

## 練習題（LeetCode／NeetCode 對應）

- LeetCode 1185 — Day of the Week：https://leetcode.com/problems/day-of-the-week/ 　自己從一個基準日推算星期，正是 (b) 說的「以某個 Epoch 為起點做整數運算」的手算版。
- LeetCode 2224 — Minimum Number of Operations to Convert Time：https://leetcode.com/problems/minimum-number-of-operations-to-convert-time/ 　把時間轉成「距離某起點的分鐘數」再相減，是 timestamp 思維的最小練習。
- LeetCode 1360 — Number of Days Between Two Dates：https://leetcode.com/problems/number-of-days-between-two-dates/ 　需要自己處理閏年，體會 (d) 說的「用整數秒數就不必煩惱這些」。

## 關聯筆記（附關聯原因）

- [[new-Date-日期物件重點]] — JavaScript 的 `Date.now()` 回傳的就是本篇 (c) 的 Unix Epoch 毫秒數，那篇是本篇概念在 JS 裡的直接應用。
- [[getDay與switch-case從0開始]] — 同屬日期主題，那篇談 JS 日期 API 從 0 起算的慣例，跟本篇「Epoch 從 0 開始」是同一種以零為起點的設計思維。
- [[ASCII-美國資訊交換標準碼]] — 同樣是「人類可讀概念 ↔ 電腦整數編碼」的對照表設計，可對照理解。
- [[CPU字長-TINYINT型別與OpenAPI資安雜記]] — 32 位元有號整數存 Unix 時間會在 2038-01-19 溢位（Year 2038 Problem），本篇 (c) 的整數表示法與那篇的字長限制直接相關。

## 各對話來源（原文）

### 解析 Epoch 時間的定義與由來（2026-08-27）— https://gemini.google.com/app/e26eeade9e115133

使用者：Epoch 時間中的 epoch 是什麼

Gemini：Epoch 在計算機科學與時間系統中，指的是一個時間計算的基準起點（Reference Point）。在電腦的世界裡，系統並不是直接以「年/月/日 時:分:秒」的形式來儲存時間，而是選擇一個固定的歷史時刻作為第 0 秒，並以「距離該起點過了多少秒（或毫秒）」來記錄時間。這個被選為起點的特定時間點，就稱為 Epoch。最常見的 Unix Epoch：定義時刻為 1970 年 1 月 1 日 00:00:00 UTC；計算方式是從該時刻起累積的秒數，忽略閏秒；`0` 代表 1970-01-01 00:00:00 UTC，`1700000000` 則代表 2023-11-14 22:13:20 UTC。為什麼需要 Epoch 設計：跨平台運算簡單，電腦比較與計算兩個數字非常迅速，不需要處理複雜的月份天數、閏年或時區換算；統一儲存格式，跨國系統傳輸資料時只需傳送單一整數。其他系統的 Epoch 範例：Windows（FILETIME）以 1601 年 1 月 1 日為 Epoch（以 100 奈秒為單位）；GPS 時間以 1980 年 1 月 6 日為 Epoch；Apple（Cocoa / Core Foundation）部分系統使用 2001 年 1 月 1 日作為起點。

使用者：閏秒是什麼

Gemini：閏秒（Leap Second）是為了讓人類根據原子振動所定義的「精準時間」，能夠與地球自轉所決定的「天文時間」保持一致，而在協調世界時（UTC）中人工加減的 1 秒。主要原因在於兩種時間標準的差異：國際原子時（TAI）利用銫原子的振動頻率來計時，極度穩定且均勻，幾百萬年才會誤差一秒；世界時（UT1）以地球自轉一圈為一天來計時，但地球自轉速度並不均勻，會受到月球潮汐摩擦、地核運動、冰河融化等因素影響而逐漸變慢。因為地球自轉越來越慢，原子時走得比地球自轉還要快，當兩者的累積誤差接近 0.9 秒時，國際地球自轉和參考系統服務（IERS）就會宣佈插入 1 閏秒。閏秒通常會在 6 月 30 日或 12 月 31 日的最後一秒加入：正常時間順序是 23:59:58 → 23:59:59 → 00:00:00，加入正閏秒時是 23:59:58 → 23:59:59 → 23:59:60 → 00:00:00。對電腦與資訊系統的衝擊：系統當機，許多軟體設計時預設每分鐘只有 60 秒，遇到 23:59:60 時可能引發程式崩潰或無窮迴圈（如 2012 年閏秒曾導致 Reddit、Linux 伺服器集體當機）；時間塗抹技術（Leap Smearing），Google、Meta 等會在閏秒前後的 24 小時內，將這 1 秒拆成微小的微秒均勻分配。閏秒的未來：國際度量衡大會（CGPM）已決定在 2035 年前取消閏秒機制。

使用者：UTC？

Gemini：UTC（Coordinated Universal Time，協調世界時）是當今全球最主要的時間標準。它不是一個時區，而是全球時間計算的基準尺度。核心特性：基於原子時（TAI），使用極度精準的原子鐘作為計時基礎；零時區基準，UTC 本身位於本初子午線（經度 0 度，格林威治），全球各地時區皆以 UTC 加上或減去固定小時來表示（台灣／北京時間為 UTC+8，紐約標準時間 EST 為 UTC-5）；不實施夏令時間，UTC 時間全年維持恆定。UTC 與 GMT 有何不同：GMT 屬性是天文時區、依據地球自轉與太陽位置、精準度較低、主要作為歷史時區名稱；UTC 屬性是物理／科學時間標準、依據原子鐘（搭配必要時的閏秒微調）、精準度極高、是現代電腦通訊與科學的統一標準。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話 | https://gemini.google.com/app/e26eeade9e115133 | 2026-08-27 擷取 |
| IERS — Bulletin C（閏秒公告權威來源） | https://www.iers.org/IERS/EN/Publications/Bulletins/bulletins.html | 2026-08-27 查證 |
| BIPM — Resolution 4 of the 27th CGPM（2022，決議 2035 年前取消閏秒） | https://www.bipm.org/en/cgpm-2022/resolution-4 | 2022-11 決議，2026-08-27 查證 |
| Google Cloud — Leap Smear 說明 | https://developers.google.com/time/smear | 2026-08-27 查證 |
| The Open Group — POSIX 對 Seconds Since the Epoch 的定義 | https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap04.html#tag_04_16 | 2026-08-27 查證 |
| MDN — Date.now() | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now | 2026-08-27 查證 |
