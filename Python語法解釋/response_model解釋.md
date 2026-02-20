# FastAPI response_model 解釋

## response_model 是什麼？

`response_model` 告訴 FastAPI：「這個 API 回傳的資料要長什麼樣子」。

```python
@router.get("/", response_model=EventsPublic)
def read_events(request: Request, session: SessionDep):
    ...
```

FastAPI 會：
1. **驗證** 回傳的資料是否符合 `EventsPublic` 的格式
2. **過濾** 只回傳 `EventsPublic` 定義的欄位（隱藏多餘資料）
3. **產生文件** 在 Swagger UI 顯示回應格式

---

## 為什麼用 EventsPublic 而不是 list[EventPublic]？

### 原本的結構

```python
# 單筆活動
class EventPublic(SQLModel):
    id: str
    name: str
    ...

# 多筆活動（包裝過）
class EventsPublic(SQLModel):
    data: list[EventPublic]  # 活動列表
    count: int               # 總筆數
```

### 比較兩種方式

| 方式 | 回傳格式 | 優缺點 |
|------|----------|--------|
| `list[EventPublic]` | `[{活動1}, {活動2}, ...]` | 單純，但沒有額外資訊 |
| `EventsPublic` | `{"data": [...], "count": 10}` | 有分頁資訊，更完整 |

### 實際回傳範例

**使用 `list[EventPublic]`：**
```json
[
  {"id": "1", "name": "活動A"},
  {"id": "2", "name": "活動B"}
]
```
問題：前端不知道總共有幾筆資料，無法做分頁。

**使用 `EventsPublic`：**
```json
{
  "data": [
    {"id": "1", "name": "活動A"},
    {"id": "2", "name": "活動B"}
  ],
  "count": 50
}
```
前端知道總共 50 筆，目前拿到 2 筆，可以計算分頁。

---

## 為什麼這樣設計？

### 1. 分頁需求
前端需要知道「總共有多少筆」才能顯示分頁器（第 1 頁 / 共 5 頁）。

### 2. API 一致性
所有列表 API 都用相同結構，前端處理更簡單：
```typescript
// 前端可以統一處理
interface ListResponse<T> {
  data: T[];
  count: number;
}
```

### 3. 擴充性
未來可以輕鬆加入更多資訊：
```python
class EventsPublic(SQLModel):
    data: list[EventPublic]
    count: int
    page: int          # 目前頁數（未來可加）
    page_size: int     # 每頁筆數（未來可加）
```

---

## 常見的命名慣例

| 模型名稱 | 用途 |
|----------|------|
| `EventPublic` | 單筆活動的回傳格式 |
| `EventsPublic` | 多筆活動的回傳格式（包含 count） |
| `EventCreate` | 建立活動時的輸入格式 |
| `EventUpdate` | 更新活動時的輸入格式 |

---

## 總結

- `response_model` = 定義 API 回傳的資料結構
- 用 `EventsPublic` 而非 `list[EventPublic]` 是為了**包含分頁資訊**
- 這是 RESTful API 的常見設計模式
