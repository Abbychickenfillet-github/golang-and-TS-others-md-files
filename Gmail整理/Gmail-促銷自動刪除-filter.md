# Gmail 整理：自動刪除 Filter + 依寄件者刪除

> 建立日期：2026-06-15　主題：清空促銷內容 / 最新快訊、釋放 Google 儲存空間

---

## 一、依「寄件者」一次刪除（最簡單、最安全）

適合先清掉明顯不要的寄件者，確認不會誤刪。

搜尋欄輸入寄件者網域 → 全選 → 刪除：

```text
from:stickermule.com
```

<mark style="background: #FFF3A3A6;">操作：</mark>搜尋後 → 點列表左上角的**勾選框** → 出現
「**選取符合此搜尋條件的所有對話**」就點它 → 按**垃圾桶圖示**。

| 寄件者 | 搜尋關鍵字 |
| --- | --- |
| Sticker Mule | `from:stickermule.com` |
| （其他垃圾寄件者，照樣換網域即可） | `from:寄件者網域` |

<mark style="background: #ADCCFFA6;">小知識：</mark>`from:` 用「網域」就能涵蓋該網域所有信箱
（例如 `help@`、`news@`、子網域 `e.stickermule.com` 都會被抓到）。

---

## 二、一次清空 + 以後自動刪除（Filter 篩選器）

一個 Filter 同時做兩件事：把現有近 39,000 封丟垃圾桶 + 以後自動刪除。

在搜尋列點右邊**篩選圖示（橫線滑桿）**，貼上兩格：

**包含字詞 (Has the words)**

```text
category:promotions OR category:updates
```

**不包含字詞 (Doesn't have the words)　← 這格就是「保留清單」**

```text
from:pxbillrc01.cathaybk.com.tw OR from:pxmart@l.tradevan.com.tw OR from:notify.zeabur.com OR 圖書館 OR is:starred OR is:important
```

### 會保留什麼

| 保留項目 | 對應排除條件 |
| --- | --- |
| <mark style="background: #BBFABBA6;">國泰世華 刷卡 / 消費通知</mark> | `from:pxbillrc01.cathaybk.com.tw` |
| <mark style="background: #BBFABBA6;">全聯 電子發票消費通知</mark> | `from:pxmart@l.tradevan.com.tw` |
| <mark style="background: #BBFABBA6;">Zeabur 訂閱扣費通知</mark> | `from:notify.zeabur.com` |
| <mark style="background: #BBFABBA6;">市立圖書館 通知</mark> | `圖書館`（關鍵字，不限寄件者） |
| <mark style="background: #BBFABBA6;">標記為「重要 / 星號」的對話</mark> | `is:important` / `is:starred` |

### 建立步驟

1. 貼上兩格 → 點 **建立篩選器 (Create filter)**
2. 勾選 <mark style="background: #FF8FA3A6;">刪除它 (Delete it)</mark>
3. 勾選 <mark style="background: #FFF3A3A6;">也套用至符合的對話 (Also apply to matching conversations)</mark>　← 這就是「一鍵刪除全部」
4. 點 **建立篩選器** 完成
5. <mark style="background: #FF8FA3A6;">最後一步：</mark>左側 **垃圾桶 → 立即清空垃圾桶**（不清空，30 天內仍佔空間）

---

## 三、關於釋放儲存空間

- Google 容量是 <mark style="background: #FF8FA3A6;">Gmail + 雲端硬碟 + 相簿 共用</mark>。
- 促銷信通常很小（沒附件），刪 2 萬封釋放的空間可能比想像少。
- 真正吃空間的是**大附件**，先處理這個最有效：

```text
in:anywhere larger:10M
has:attachment larger:10M
```

---

## 四、補充

- Filter 是「持續生效」的：新促銷信一進來就自動刪，原本想要的「每天早上手動清理」其實不必再做。
- 若發現某類通知被誤刪 → 在「不包含字詞」那格再加一個 `OR from:寄件者網域`。
- <mark style="background: #D2B3FFA6;">最新快訊 (Updates)</mark> 裡也常有 GitHub、收據、Apple、Evernote 客服等；不放心可先只跑 `category:promotions`，確認沒誤刪再加 updates。
