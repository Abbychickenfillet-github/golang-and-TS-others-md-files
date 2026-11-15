---
tags: [編碼, Unicode, UTF-8, ASCII, Base64, Mojibake]
aliases: [亂碼Mojibake-編碼不一致與UTF全名-附RFC1034備忘錄, 字元編碼關係, 亂碼Mojibake]
---
# 字元編碼-Unicode-ASCII-Base64-UTF-8關係與亂碼Mojibake

主檔：[互動版 HTML](./字元編碼-Unicode-ASCII-Base64-UTF-8關係與亂碼Mojibake.html)

- 主軸圖：Unicode、ASCII、Base64、UTF-8 的文氏圖（字元側與位元組側，箭頭表示編碼與解碼）
- charset 機制：BOM → HTTP 標頭 → meta charset → 瀏覽器猜測
- 亂碼 Mojibake 的成因與修法

相關：[[JS字串-UTF-16碼元與代理對Surrogate-Pair-ECMAScript定義]]（同一個 Unicode 碼位，JS 內部用 UTF-16 存）
相關：[[ASCII-美國資訊交換標準碼]]（ASCII 是文氏圖裡 UTF-8 的前 128 個，亂碼中英文數字仍看得到的原因）
