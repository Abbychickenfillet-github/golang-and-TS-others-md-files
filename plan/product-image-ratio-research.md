# 商品圖片比例研究報告

> 研究日期：2026-02-25
> 情境：FutureSign 活動市集平台，攤位商品以卡片式 Grid（1-3 欄）呈現
> 目前程式碼：`aspect-[3/2]`（3:2 橫向）

---

## 一、各大電商平台標準

| 平台 | 主圖比例 | 建議尺寸 | 備註 |
|------|---------|---------|------|
| **Amazon** | 1:1 | 2000 x 2000 px | 白底，商品需佔畫面 85% 以上 |
| **Shopify** | 1:1 | 2048 x 2048 px | 官方推薦正方形，Grid 頁面最整齊 |
| **Etsy** | 1:1（搜尋縮圖）| 2000 x 2000 px | 官方表示正方形照片提高購買率 |
| **Shopee** | 1:1（基本）/ 3:4（推薦）| 最低 500 x 500 px | 3:4 可增加手機端曝光面積與點擊率 |
| **PChome** | 1:1 | 800 x 800 px | 商品列表使用正方形裁切 |
| **momo** | 1:1 | 800 x 800 px | 商品列表正方形顯示 |

**結論**：全球主流電商幾乎統一使用 **1:1 正方形** 作為商品圖標準。Shopee 近年推動 **3:4 直式** 作為進階選項，因為在手機上能佔據更大顯示面積。

---

## 二、各比例優缺點分析

### 1:1（正方形）
- **優點**：
  - 業界標準，使用者最熟悉的商品圖格式
  - Grid 排列最整齊，不會產生高低不一的問題
  - 手機與桌面表現一致，無需 responsive 切換
  - WebP 格式的 1:1 圖片載入速度比未裁切的 JPEG 快 2.3 倍（Shopify 數據）
  - 維持比例一致性可改善 Core Web Vitals 達 18%（特別是 CLS）
- **缺點**：
  - 橫向商品（如家具、展架）可能留較多上下空白
  - 展示面積比直式圖略小

### 4:3（橫向）
- **優點**：
  - 適合展示有情境的商品照（lifestyle shots）
  - 傳統螢幕比例，桌面端觀感佳
- **缺點**：
  - 手機端佔據較少垂直空間，商品顯得小
  - Grid 中每行能看到更多卡片但單張圖較矮

### 3:2（目前使用）
- **優點**：
  - 標準攝影比例（35mm 底片），商品照容易取得
  - 活動 Banner 使用合理
- **缺點**：
  - 比 4:3 更寬，手機上商品圖更矮、視覺衝擊力更低
  - 在 2 欄 Grid 中，圖片高度明顯不足
  - **不是任何主流電商平台的商品圖標準**

### 3:4（直式）
- **優點**：
  - Shopee 推薦，手機端顯示面積最大
  - 適合服飾、飲品、直立型商品
  - Mobile-first 設計趨勢
- **缺點**：
  - 桌面端 Grid 可能過高，單行能顯示的卡片數量減少
  - 橫向商品需留較多左右空白
  - 非全球通用標準

### 16:9（寬螢幕）
- **優點**：
  - 影片預覽、Banner 圖適用
  - 視覺衝擊力強（hero section）
- **缺點**：
  - **完全不適合商品列表卡片**
  - 手機端商品圖極小，細節無法辨識
  - 沒有任何電商平台將此用於商品圖

---

## 三、Mobile-First 考量

- **75% 的電商銷售來自行動裝置**（Shopify 統計）
- 手機螢幕為直式，正方形或偏直式的圖片能最大化利用螢幕空間
- 在手機端 2 欄 Grid 中：
  - 1:1 的圖片每張約 180x180 px 顯示區域
  - 3:2 的圖片每張約 180x120 px —— 高度減少 33%，商品細節損失明顯
  - 3:4 的圖片每張約 180x240 px —— 最大但卡片過高
- 手機使用者習慣垂直滑動瀏覽，**圖片不宜過矮**

---

## 四、Grid 排版影響

| Grid 欄數 | 1:1 效果 | 3:2 效果 | 3:4 效果 |
|-----------|---------|---------|---------|
| **1 欄**（手機） | 大正方形，清晰展示 | 圖片偏矮，下方文字區比例偏重 | 圖片佔據大量空間 |
| **2 欄**（手機/平板） | 整齊均衡 | 圖片矮小，商品辨識度下降 | 圖片高，滑動距離增加 |
| **3 欄**（桌面） | 緊湊整齊 | 可接受但圖片仍偏矮 | 每行過高，首屏商品少 |

**重點**：混用不同比例的圖片會導致 Grid 錯位，產生混亂的使用者體驗。**所有商品必須統一同一比例**。

---

## 五、商品攝影建議

1. **統一白色或淺色背景**：讓商品成為視覺焦點
2. **商品佔畫面 70-85%**：留適當空白但不浪費空間
3. **正面朝上拍攝**：方便裁切為任何比例
4. **從較遠距離拍攝**：保留周圍空間，後期方便裁切
5. **解析度至少 1500x1500 px**：平衡畫質與載入速度
6. **檔案大小控制在 500KB 以下**：維持頁面載入 3 秒內完成

---

## 六、最終建議

### 商品卡片圖片：改用 **1:1（正方形）**

**理由**：

1. **業界共識**：Amazon、Shopify、Etsy、PChome、momo 全部使用 1:1，這是使用者最習慣的商品圖格式
2. **Grid 整齊度最佳**：正方形在 1/2/3 欄 Grid 中都能保持整齊對齊，不會出現高低不一
3. **Mobile 表現優於 3:2**：在手機 2 欄 Grid 中，1:1 的圖片高度比 3:2 多 33%，商品細節更清晰
4. **效能最佳**：載入速度更快，CLS 更穩定
5. **商家容易配合**：絕大多數商家已有 1:1 格式的商品圖（來自其他電商平台），降低上架門檻
6. **FutureSign 情境適用**：攤位商品種類多元（食品、文創、服務），正方形是最通用的格式

### 程式碼修改建議

```
// 目前
<div className="aspect-[3/2] ...">

// 建議改為
<div className="aspect-square ...">
```

### 備選方案：4:5 或 3:4（直式）

如果希望在手機端有更大的視覺衝擊力，可考慮 **4:5**（Instagram 格式）或 **3:4**（Shopee 格式）。但需注意：
- 桌面端 3 欄 Grid 每行會變得很高
- 商家需要額外準備直式圖片
- 建議僅在確認商品類型偏向直立型（服飾、飲品）時才採用

### 活動 Banner 圖：維持 3:2

活動 Banner（hero-banner、EventDetailPage）使用 3:2 是合理的，因為 Banner 本質是橫幅圖片，3:2 在桌面和手機端都有良好的視覺呈現。

---

## 參考來源

- [Clipping Path Experts - Best Image Aspect Ratio for Ecommerce 2025](https://www.clippingpathexperts.com/blog/image-aspect-ratio-for-ecommerce/)
- [Squareshot - E-commerce Product Image Size Guide 2026](https://www.squareshot.com/post/e-commerce-product-image-size-guide)
- [Shopify - Website Image Size Guidelines 2026](https://www.shopify.com/blog/image-sizes)
- [Amazon Image Aspect Ratios Guide 2025](https://searchxpro.com/amazon-image-aspect-ratios-complete-guide-2025/)
- [Shopee - Why upload product images in 3:4 ratio](https://seller.shopee.ph/edu/article/17355/product-images-3-4-ratio)
- [Etsy - Image Requirements and Best Practices](https://help.etsy.com/hc/en-us/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop)
- [UXPin - Aspect Ratios in UX/UI Design](https://www.uxpin.com/studio/blog/aspect-ratio/)
- [GoodBarber - Images Aspect Ratios Design System](https://www.goodbarber.com/uxdesign/images-aspect-ratios/)
- [Amasty - Shopify Product Image Size Guide 2025](https://amasty.com/blog/shopify-product-image-size/)
