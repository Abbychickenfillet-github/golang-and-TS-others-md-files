# 攤位地圖縮放與定位 — 完整參數解釋

> 檔案：`src/pages/EventBoothMapSection.tsx`
> 問題：地圖沒有填滿外層容器 DIV，手機上地圖太小

---

## 一、問題是什麼？

地圖底圖（例如 2000x1500 的 JPG）要塞進網頁上一個可能只有 600px 寬的 `<div>` 裡。
需要計算：
1. 容器要多高？（`dynamicHeight`）
2. 地圖要縮小多少倍？（`scale`）
3. 地圖要放在容器的哪個位置？（`mapOffset`）
4. 每個攤位方塊要放在哪裡？（用 `scale` 和 `mapOffset` 換算）

---

## 二、核心參數一覽

```
┌─────────────────────────────────────────────┐
│ 容器 DIV (containerSize.width x dynamicHeight) │
│                                             │
│   ┌─────────────────────────────────┐       │
│   │                                 │       │
│   │   地圖底圖（縮放後）              │       │
│   │   寬 = mapDimensions.width * scale       │
│   │   高 = mapDimensions.height * scale      │
│   │                                 │       │
│   │   ← mapOffset.x →              │       │
│   │   ↑ mapOffset.y                 │       │
│   │                                 │       │
│   │   ■ 攤位 (coordinate * scale + offset)   │
│   │                                 │       │
│   └─────────────────────────────────┘       │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 三、參數詳解

### 1. `mapDimensions` — 地圖底圖的原始像素尺寸

```typescript
const { data: mapDimensions } = useMapImageDimensions(activeMapUrl)
// 回傳值範例：{ width: 2000, height: 1500 }
```

- **來源**：`useMapImageDimensions` hook 載入圖片 URL，讀取圖片的天然寬高
- **用途**：所有縮放計算的基準
- **單位**：像素 (px)

---

### 2. `containerSize.width` — 容器 DIV 的實際寬度

```typescript
const [containerSize, setContainerSize] = useState({ width: 800, height: 400 })

// ResizeObserver 監聽容器寬度變化
const observer = new ResizeObserver((entries) => {
  setContainerSize({
    width: entry.contentRect.width,   // ← 這個
    height: entry.contentRect.height,
  })
})
```

- **來源**：`ResizeObserver` 監聽 DOM 元素的實際尺寸
- **用途**：知道容器有多寬，才能算地圖要縮多小
- **會變動**：當瀏覽器視窗大小改變、側邊欄展開/收合時會更新

---

### 3. `dynamicHeight` — 容器的計算高度

```typescript
const dynamicHeight = useMemo(() => {
  if (!mapDimensions) return Math.max(300, containerSize.width * 0.75)
  const aspectRatio = mapDimensions.height / mapDimensions.width
  return Math.max(300, containerSize.width * aspectRatio)
}, [mapDimensions, containerSize.width])
```

**計算邏輯：**

| 情況 | 公式 | 範例 |
|------|------|------|
| 地圖已載入 | `容器寬度 * (地圖高度 / 地圖寬度)` | 600 * (1500/2000) = **450px** |
| 地圖未載入 | `容器寬度 * 0.75`（預設 4:3 比例） | 600 * 0.75 = **450px** |
| 算出來太小 | 至少 300px | max(300, 200) = **300px** |

**重點**：容器高度 = 容器寬度 * 地圖長寬比，這樣容器的比例跟地圖一模一樣。

---

### 4. `scale` — 地圖的縮放比例

```typescript
const scale = useMemo(() => {
  if (!mapDimensions) return null
  const scaleX = containerSize.width / mapDimensions.width    // 水平方向的縮放
  const scaleY = dynamicHeight / mapDimensions.height          // 垂直方向的縮放
  return Math.min(scaleX, scaleY)                              // 取較小的，確保不超出
}, [mapDimensions, containerSize.width, dynamicHeight])
```

**計算範例：**

```
地圖原始尺寸：2000 x 1500
容器寬度：600px
dynamicHeight：450px

scaleX = 600 / 2000 = 0.3    （水平縮到 30%）
scaleY = 450 / 1500 = 0.3    （垂直縮到 30%）
scale  = min(0.3, 0.3) = 0.3

縮放後地圖大小：2000 * 0.3 = 600px 寬，1500 * 0.3 = 450px 高
→ 剛好填滿容器！
```

**為什麼取 `Math.min`？**
- 如果容器比地圖「更寬」，scaleX > scaleY，用 scaleY 確保高度不超出
- 如果容器比地圖「更高」，scaleY > scaleX，用 scaleX 確保寬度不超出
- 簡單說：**保證地圖完全在容器內**

---

### 5. `mapOffset` — 地圖在容器中的偏移（置中用）

```typescript
const mapOffset = useMemo(() => {
  if (!mapDimensions || !scale) return { x: 0, y: 0 }
  const scaledWidth = mapDimensions.width * scale      // 縮放後的寬度
  const scaledHeight = mapDimensions.height * scale     // 縮放後的高度
  return {
    x: (containerSize.width - scaledWidth) / 2,         // 水平置中
    y: (dynamicHeight - scaledHeight) / 2,              // 垂直置中
  }
}, [mapDimensions, scale, containerSize.width, dynamicHeight])
```

**計算範例（當地圖剛好填滿）：**

```
scaledWidth  = 2000 * 0.3 = 600
scaledHeight = 1500 * 0.3 = 450

mapOffset.x = (600 - 600) / 2 = 0   （水平不需偏移）
mapOffset.y = (450 - 450) / 2 = 0   （垂直不需偏移）
```

**計算範例（當地圖沒填滿，比如正方形地圖 2000x2000 放在 600x450 容器）：**

```
scaleX = 600/2000 = 0.3
scaleY = 450/2000 = 0.225
scale  = min(0.3, 0.225) = 0.225    ← 受高度限制

scaledWidth  = 2000 * 0.225 = 450
scaledHeight = 2000 * 0.225 = 450

mapOffset.x = (600 - 450) / 2 = 75  ← 左右各留 75px 空白
mapOffset.y = (450 - 450) / 2 = 0
```

---

### 6. 攤位定位 — 把後端座標轉成螢幕位置

```typescript
// 後端儲存的攤位座標（相對於地圖原始尺寸）
const coords = parseCoordinate(booth.coordinate)
// 範例：{ x: 500, y: 300 }（在 2000x1500 地圖上的位置）

// 轉換成螢幕上的 CSS left/top
left = mapOffset.x + coords.x * scale   // 0 + 500 * 0.3 = 150px
top  = mapOffset.y + coords.y * scale   // 0 + 300 * 0.3 = 90px
```

攤位在螢幕上的大小也用 `scale` 縮放：
```typescript
const size = getBoothSize(booth.booth_type, boothTypes)
// 範例：{ width: 80, height: 60 }（在地圖上佔 80x60 像素）

width  = size.width * scale    // 80 * 0.3 = 24px
height = size.height * scale   // 60 * 0.3 = 18px
```

---

## 四、之前的 Bug：為什麼地圖沒填滿容器？

### 舊寫法（有問題）

```typescript
// ❌ scale 用 containerSize.height（來自 ResizeObserver）
const scale = useMemo(() => {
  const scaleX = containerSize.width / mapDimensions.width
  const scaleY = containerSize.height / mapDimensions.height  // ← 問題在這
  return Math.min(scaleX, scaleY)
}, [mapDimensions, containerSize])
```

### 問題：時序不同步

```
渲染流程：
1. containerSize 初始值 = { width: 800, height: 400 }（預設值）
2. dynamicHeight 用 containerSize.width=800 算出 600
3. DIV 渲染高度 = 600px
4. ResizeObserver 偵測到高度變化 → containerSize.height = 600
5. scale 重新計算（現在才正確）

但在步驟 2~4 之間，scale 用的是 height=400（舊值），
算出來的 scaleY = 400/1500 = 0.267，比 scaleX = 800/2000 = 0.4 小
→ scale = 0.267，地圖被縮太小，容器裡有大片灰色空白
```

### 修正後

```typescript
// ✅ scale 直接用 dynamicHeight（計算值，不依賴 ResizeObserver）
const scale = useMemo(() => {
  const scaleX = containerSize.width / mapDimensions.width
  const scaleY = dynamicHeight / mapDimensions.height  // ← 用 dynamicHeight
  return Math.min(scaleX, scaleY)
}, [mapDimensions, containerSize.width, dynamicHeight])
```

**dynamicHeight 和 scale 用同一個 `containerSize.width` 計算**，不會有時序差異。

---

## 五、用戶縮放/拖曳（新功能）

### 架構：兩層 transform

```html
<!-- 容器 DIV -->
<div style="overflow: hidden; height: dynamicHeight">

  <!-- 第一層：用戶的縮放和拖曳 -->
  <div style="transform: translate(userPan.x, userPan.y) scale(userZoom)">

    <!-- 第二層：程式自動的區域縮放（點擊區域時 zoom in） -->
    <div style="transform: scale(zoomTransform.zoom) translate(tx, ty)">

      <!-- 地圖底圖 + 攤位方塊 -->
    </div>
  </div>
</div>
```

### 為什麼分兩層？

| | 用戶控制層 | 程式控制層 |
|---|---|---|
| 觸發 | 滾輪/拖曳/pinch | 點擊區域/攤位 |
| 動畫 | 無（即時回應） | 有 transition（0.5s 動畫） |
| 重置 | 切換區域/地圖時歸 1 | 根據 viewLevel 自動計算 |

### 滾輪縮放的數學

```typescript
// 用戶滾輪縮放，以游標位置為中心
const cx = 滑鼠在容器內的 X 位置
const cy = 滑鼠在容器內的 Y 位置

const factor = 滾輪向下 ? 0.92 : 1.08  // 縮小 or 放大
const newZoom = Math.max(0.5, Math.min(5, oldZoom * factor))

// 關鍵：保持游標下方的地圖點不動
// 原理：游標位置 = pan + 地圖點 * zoom
//       cx = pan.x + point * oldZoom
//       cx = newPan.x + point * newZoom
// 解出：newPan.x = cx - (cx - pan.x) * (newZoom / oldZoom)
const ratio = newZoom / oldZoom
newPan = {
  x: cx - ratio * (cx - pan.x),
  y: cy - ratio * (cy - pan.y),
}
```

**白話文**：滾輪縮放時，你游標指著的那個點會「釘住不動」，其他地方圍繞它放大或縮小。這就是 Google Maps 的操作方式。

---

## 六、總結：資料流

```
後端 API
  │
  ├── /booths/map/{eventId} → booths[]（攤位座標、狀態）
  │                         → map_url（地圖底圖 URL）
  │
  └── /maps/?event_id={id}  → maps[]（多地圖列表）

前端計算流程：
  map_url → useMapImageDimensions → mapDimensions { width, height }
                                          │
  ResizeObserver → containerSize.width ────┤
                                          │
                          ┌───────────────┘
                          ▼
                    dynamicHeight = width * (mapHeight / mapWidth)
                          │
                          ▼
                    scale = min(width/mapW, dynamicHeight/mapH)
                          │
                          ▼
                    mapOffset = 置中偏移
                          │
                          ▼
                    每個攤位的 left/top = offset + coordinate * scale
```
