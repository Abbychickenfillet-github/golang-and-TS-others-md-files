# Python Excel 匯出功能說明

## 概述

本專案使用 `openpyxl` 套件來產生 Excel 檔案，並透過 FastAPI 的 `StreamingResponse` 回傳給前端下載。

---

## 資料流程圖

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   前端      │     │  API Route  │     │   Service   │     │    CRUD     │
│  (React)    │────>│  (FastAPI)  │────>│   Layer     │────>│   Layer     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      │  fetch + token    │                   │                   │
      │                   │                   │                   │
      │                   │   呼叫 service    │                   │
      │                   │   export_to_excel │                   │
      │                   │                   │                   │
      │                   │                   │  查詢資料庫       │
      │                   │                   │  get_multi()      │
      │                   │                   │<──────────────────│
      │                   │                   │                   │
      │                   │                   │  使用 openpyxl    │
      │                   │                   │  建立 Excel       │
      │                   │                   │                   │
      │                   │  回傳 BytesIO     │                   │
      │                   │<──────────────────│                   │
      │                   │                   │                   │
      │  StreamingResponse│                   │                   │
      │  (Excel binary)   │                   │                   │
      │<──────────────────│                   │                   │
      │                   │                   │                   │
      │  blob.download()  │                   │                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 三層架構說明

### 1. Route 層 (API 端點)

**檔案位置**: `backend/app/api/routes/members.py`

```python
from datetime import datetime
from urllib.parse import quote
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

@router.get("/export")
def export_members(
    *,
    session: SessionDep,
    current_user: CurrentUser,  # 需要認證
    search: str | None = Query(default=None),
    # ... 其他篩選參數
) -> StreamingResponse:
    """
    Route 層職責：
    1. 接收 HTTP 請求參數
    2. 驗證使用者權限
    3. 呼叫 Service 層取得 Excel 檔案
    4. 設定 HTTP Response Headers（Content-Disposition）
    5. 回傳 StreamingResponse
    """

    # 呼叫 Service 層
    excel_file = member_service.export_to_excel(
        session,
        search=search,
        # ... 傳遞篩選參數
    )

    # 產生中文檔名（使用 RFC 5987 編碼）
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"會員資料_{timestamp}.xlsx"
    encoded_filename = quote(filename, safe="")

    # 回傳串流響應
    return StreamingResponse(
        excel_file,  # BytesIO 物件
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
        },
    )
```

### 2. Service 層 (業務邏輯)

**檔案位置**: `backend/app/services/member_service.py`

```python
from io import BytesIO

def export_to_excel(
    self,
    session: Session,
    *,
    search: str | None = None,
    # ... 其他篩選參數
) -> BytesIO:
    """
    Service 層職責：
    1. 動態載入 openpyxl（避免強制依賴）
    2. 呼叫 CRUD 層取得資料
    3. 進行額外的資料篩選（如果 CRUD 不支援）
    4. 建立 Excel 工作簿並設定樣式
    5. 填入資料
    6. 回傳 BytesIO 物件
    """

    # Step 1: 動態載入 openpyxl
    try:
        import openpyxl
        from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    except ImportError:
        raise ImportError("請安裝 openpyxl: pip install openpyxl")

    # Step 2: 從 CRUD 層取得資料
    members = self.crud.get_multi(
        session,
        skip=0,
        limit=10000,
        search=search,
        # ... 只傳遞 CRUD 支援的參數
    )

    # Step 3: 額外篩選（CRUD 不支援的條件）
    if email_verified:
        members = [m for m in members if m.email_verified == email_verified]

    # Step 4: 建立工作簿
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "會員資料"

    # Step 5: 設定樣式和填入資料（詳見下方）
    # ...

    # Step 6: 輸出到 BytesIO
    output = BytesIO()
    wb.save(output)
    output.seek(0)  # 重要！將指標移回開頭
    return output
```

### 3. 前端呼叫

**檔案位置**: `frontend/src/routes/_layout/members.tsx`

```typescript
const handleExportExcel = async () => {
  setIsExporting(true)
  try {
    const baseUrl = OpenAPI.BASE || ""

    // 取得認證 token
    const token =
      typeof OpenAPI.TOKEN === "function"
        ? await OpenAPI.TOKEN({} as any)
        : OpenAPI.TOKEN

    // 建立查詢參數
    const params = new URLSearchParams()
    if (search) params.append("search", search)
    // ... 其他篩選條件

    const url = `${baseUrl}/api/v1/members/export?${params.toString()}`

    // 發送請求（帶認證）
    const response = await fetch(url, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (!response.ok) throw new Error("匯出失敗")

    // 下載檔案
    const blob = await response.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = blobUrl
    a.download = `members_${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(blobUrl)
    document.body.removeChild(a)

    toast({ title: "匯出成功", status: "success" })
  } catch (err) {
    toast({ title: "匯出失敗", status: "error" })
  } finally {
    setIsExporting(false)
  }
}
```

---

## openpyxl 常用語法

### 建立工作簿和工作表

```python
import openpyxl

wb = openpyxl.Workbook()      # 建立新工作簿
ws = wb.active                 # 取得預設工作表
ws.title = "資料表名稱"        # 設定工作表名稱
```

### 寫入儲存格

```python
# 方法 1: 使用 cell()
ws.cell(row=1, column=1, value="內容")

# 方法 2: 使用座標
ws["A1"] = "內容"
```

### 設定樣式

```python
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

# 字型
header_font = Font(bold=True, size=12, color="FFFFFF")

# 背景色
header_fill = PatternFill(
    start_color="4472C4",
    end_color="4472C4",
    fill_type="solid"
)

# 對齊
center_alignment = Alignment(horizontal="center", vertical="center")

# 框線
thin_border = Border(
    left=Side(style="thin"),
    right=Side(style="thin"),
    top=Side(style="thin"),
    bottom=Side(style="thin"),
)

# 套用樣式
cell = ws.cell(row=1, column=1, value="標題")
cell.font = header_font
cell.fill = header_fill
cell.alignment = center_alignment
cell.border = thin_border
```

### 合併儲存格

```python
ws.merge_cells("A1:D1")  # 合併 A1 到 D1
```

### 設定欄寬和列高

```python
ws.column_dimensions["A"].width = 20
ws.row_dimensions[1].height = 25

# 使用欄位編號
from openpyxl.utils import get_column_letter
col_letter = get_column_letter(1)  # 'A'
ws.column_dimensions[col_letter].width = 20
```

### 儲存到 BytesIO

```python
from io import BytesIO

output = BytesIO()
wb.save(output)
output.seek(0)  # 重要！移回開頭位置
```

---

## HTTP Response Headers 說明

```python
# Content-Type: 告訴瀏覽器這是 Excel 檔案
media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

# Content-Disposition: 告訴瀏覽器下載此檔案
# filename*=UTF-8'' 使用 RFC 5987 編碼支援中文檔名
headers = {
    "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
}
```

---

## 新增匯出功能的步驟

1. **確認 openpyxl 已安裝**
   ```bash
   # pyproject.toml
   "openpyxl>=3.1.0",
   ```

2. **在 Service 層新增 export_to_excel 方法**
   - 取得資料
   - 建立 Excel
   - 回傳 BytesIO

3. **在 Route 層新增 /export 端點**
   - 注意：必須放在 `/{id}` 路由之前！
   - 使用 StreamingResponse 回傳

4. **在前端新增匯出按鈕和 fetch 邏輯**
   - 記得帶入認證 token
   - 使用 blob 下載

---

## 參考檔案

- 廠商支付方式匯出: `backend/app/services/vendor_payment_method_service.py` (line 198-356)
- 廠商支付方式路由: `backend/app/api/routes/vendor_payment_methods.py` (line 130-182)
- 會員匯出: `backend/app/services/member_service.py` (export_to_excel)
- 會員路由: `backend/app/api/routes/members.py` (/export endpoint)
