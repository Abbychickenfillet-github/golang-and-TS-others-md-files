# member_company.py 模型說明文檔

**最後更新**: 2025-11-20
**相關檔案**: `backend/app/models/member_company.py`

---

## 目錄

1. [模組級文檔字符串和 Linter 警告](#1-模組級文檔字符串和-linter-警告)
2. [TYPE_CHECKING 的作用](#2-type_checking-的作用)
3. [Python 類型提示中的中括號](#3-python-類型提示中的中括號)
4. [back_populates 雙向關係](#4-back_populates-雙向關係)
5. [sa_relationship_kwargs 參數配置](#5-sa_relationship_kwargs-參數配置)
6. [API 模型的作用和數據流向](#6-api-模型的作用和數據流向)
7. [項目結構說明](#7-項目結構說明)

---

## 1. 模組級文檔字符串和 Linter 警告

### 問題
為何在 `member_company.py` 文件開頭的模組級文檔字符串會出現 linter 警告？

### 回答

**這是標準的 Python 寫法，警告是誤報。**

#### 代碼示例
```python
"""
會員公司關聯相關模型
包含會員與公司的關聯關係管理
"""
```

#### 說明

1. **這是標準做法**：模組級文檔字符串（module-level docstring）是 Python 的標準寫法，用於描述整個模組的功能。

2. **與其他文件一致**：項目中其他模型文件（`member.py`、`company.py`、`item.py` 等）都使用相同的格式。

3. **Linter 誤報**：警告可能來自 IDE 的內建 linter，誤將文檔字符串識別為註釋代碼。

#### 建議
- **可以忽略此警告**：這是標準寫法，代碼本身沒有問題
- 如果確實想消除警告，可以檢查 IDE 的 linter 設置

---

## 2. TYPE_CHECKING 的作用

### 問題
`if TYPE_CHECKING:` 是什麼意思？為什麼要這樣寫？

### 回答

**`TYPE_CHECKING` 用於避免循環導入問題，只在類型檢查時導入類型，運行時不執行。**

#### 代碼示例
```python
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from .company import Company
    from .member import Member

# 在類中使用字符串形式的類型提示
class MemberCompany(SQLModel):
    member: Optional["Member"] = Relationship(...)
    company: Optional["Company"] = Relationship(...)
```

#### 詳細說明

**問題背景：**
- `member_company.py` 需要知道 `Company` 和 `Member` 的類型
- `member.py` 和 `company.py` 也需要知道 `MemberCompany` 的類型
- 如果直接導入，會形成循環導入（circular import）

**`TYPE_CHECKING` 的作用：**
- `TYPE_CHECKING` 在類型檢查時是 `True`，運行時是 `False`
- 放在 `if TYPE_CHECKING:` 裡的導入只在類型檢查時生效，運行時不會執行

**實際效果：**
1. **類型檢查時**：`TYPE_CHECKING = True`，導入 `Company` 和 `Member`，類型檢查工具知道這些類型
2. **運行時**：`TYPE_CHECKING = False`，不執行導入，避免循環導入錯誤
3. **代碼中**：使用字符串形式的類型提示（如 `"Member"`、`"Company"`）來引用這些類型，Python 會在需要時解析

#### 簡單類比
就像「先告訴類型檢查工具這些類型存在，但實際運行時先不導入，等需要時再解析」。

---

## 3. Python 類型提示中的中括號

### 問題
`Optional["Member"]` 中的中括號是陣列的意思嗎？在 Python 中中括號代表什麼？

### 回答

**在 Python 類型提示中，中括號 `[]` 不是陣列，而是泛型語法。**

#### 代碼示例
```python
from typing import Optional

member: Optional["Member"] = Relationship(...)
```

#### 詳細說明

**`Optional["Member"]` 的含義：**
- 意思是：可能是 `Member` 類型，也可能是 `None`
- 等價寫法：
  ```python
  Member | None      # Python 3.10+ 的新語法
  Union[Member, None]  # 舊語法
  ```

**為什麼用字符串 `"Member"`？**
- 因為 `Member` 類還沒定義（避免循環導入）
- 用字符串告訴 Python：「這個類型稍後會定義」

**對比：**
```python
# 如果 Member 已經導入，可以直接寫：
member: Optional[Member] = ...

# 如果 Member 還沒導入（避免循環導入），用字符串：
member: Optional["Member"] = ...
```

**Python 中括號的用途：**
1. **列表（List）**：`[1, 2, 3]`
2. **類型提示中的泛型**：`Optional[T]`、`list[str]`、`dict[str, int]`
3. **字符串類型提示**：`"Member"` 表示延遲解析的類型

---

## 4. back_populates 雙向關係

### 問題
`back_populates` 是什麼意思？

### 回答

**`back_populates` 用於建立雙向關係，讓兩個模型能互相訪問對方。**

#### 代碼示例

**在 `member_company.py` 中：**
```python
member: Optional["Member"] = Relationship(
    back_populates="member_companies",  # 告訴 Member：從 member_companies 屬性訪問回來
    ...
)
```

**在 `member.py` 中：**
```python
member_companies: list["MemberCompany"] = Relationship(
    back_populates="member",  # 告訴 MemberCompany：從 member 屬性訪問回來
    ...
)
```

#### 關係圖

```
Member (會員)
  └─ member_companies: list[MemberCompany]  ← 一個會員有多個關聯
       └─ back_populates="member"           ← 指向 MemberCompany.member

MemberCompany (會員公司關聯)
  └─ member: Optional[Member]               ← 一個關聯屬於一個會員
       └─ back_populates="member_companies" ← 指向 Member.member_companies
```

#### 實際使用

```python
# 從會員找他的所有公司關聯
member = session.get(Member, "member_id")
companies = member.member_companies  # 自動獲取所有關聯

# 從關聯找對應的會員
relation = session.get(MemberCompany, "relation_id")
member = relation.member  # 自動獲取對應的會員
```

#### 為什麼需要 back_populates？

- **雙向訪問**：可以從任一方向訪問關聯數據
- **自動同步**：當你修改一邊的關係時，另一邊會自動更新
- **數據一致性**：確保兩個模型之間的關係保持一致

---

## 5. sa_relationship_kwargs 參數配置

### 問題
`sa_relationship_kwargs` 屬性又是什麼意思？

### 回答

**`sa_relationship_kwargs` 用於傳遞 SQLAlchemy 的關係配置參數。**

#### 代碼示例
```python
member: Optional["Member"] = Relationship(
    back_populates="member_companies",
    sa_relationship_kwargs={
        "lazy": "joined"  # 告訴 SQLAlchemy：查詢時自動 JOIN 加載關聯數據
    }
)
```

#### 常見參數說明

**`lazy`：控制何時加載關聯數據**
- `"joined"`：查詢時自動 JOIN（一次查詢獲取所有數據）✅ 推薦
- `"select"`：需要時再查詢（可能多次查詢）
- `"subquery"`：使用子查詢

**`cascade`：級聯操作**
- `"all, delete-orphan"`：刪除父對象時，自動刪除子對象

#### 實際效果對比

**使用 `lazy="joined"`：**
```python
# 查詢 MemberCompany 時，會自動 JOIN Member 和 Company 表
relation = session.query(MemberCompany).first()

# 訪問 member 時，數據已經在第一次查詢時加載了（不需要額外查詢）
print(relation.member.name)  # ✅ 已經加載，很快
```

**沒有 `lazy="joined"`：**
```python
# 訪問 member 時會觸發額外的數據庫查詢
print(relation.member.name)  # ❌ 會觸發額外的數據庫查詢
```

#### 性能考量

- **`lazy="joined"`**：適合經常需要訪問關聯數據的情況，一次查詢獲取所有數據
- **`lazy="select"`**：適合不常訪問關聯數據的情況，按需加載

---

## 6. API 模型的作用和數據流向

### 問題
`MemberCompanyPublic` 的註釋「返回會員公司關聯資料用」是指把接收 API routes 的資料到 models/member_company.py 的檔案嗎？

### 回答

**不是！`MemberCompanyPublic` 是用於 API 返回數據，不是接收數據。**

#### 項目結構說明

```
models/      - 數據模型（定義數據庫表結構）
crud/        - 數據訪問（數據庫操作）
services/    - 業務邏輯
api/routes/  - API 路由
```

#### 數據流向

```
┌─────────────────────────────────────────────────────────┐
│ 1. 接收數據（創建/更新時）                               │
│    API Routes 使用：                                     │
│    - MemberCompanyCreate  ← 接收創建請求的數據          │
│    - MemberCompanyUpdate  ← 接收更新請求的數據          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. 數據庫操作                                            │
│    - Services → CRUD → Database                        │
│    - 使用 MemberCompany (數據庫模型)                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. 返回數據（查詢時）                                    │
│    API Routes 使用：                                     │
│    - MemberCompanyPublic  ← 返回給客戶端的數據格式      │
└─────────────────────────────────────────────────────────┘
```

#### 實際代碼示例

**在 `member_companies.py` 路由中：**
```python
@router.get("/", response_model=list[MemberCompanyPublic])
def read_member_company_relations(...):
    # 從數據庫獲取 MemberCompany 對象
    relations = member_company_service.get_all_relations(...)

    # 轉換為 MemberCompanyPublic 格式（只包含需要返回給客戶端的字段）
    return [MemberCompanyPublic.model_validate(relation) for relation in relations]
```

#### 不同模型的用途

```python
# 接收創建請求
MemberCompanyCreate  # 客戶端發送的數據格式

# 數據庫存儲
MemberCompany        # 數據庫中的完整模型（包含所有字段和關聯）

# 返回查詢結果
MemberCompanyPublic  # 返回給客戶端的數據格式（只包含公開字段）
```

#### 為什麼需要不同的模型？

1. **安全性**：只返回需要的字段，隱藏敏感信息
2. **性能**：不返回不需要的關聯數據
3. **版本控制**：API 返回格式可以獨立變化

---

## 7. 項目結構說明

### 問題
`member.py` 是指 models 還是 crud 層的檔案？

### 回答

**`member.py` 是指 `models/member.py`（模型層），不是 crud 層。**

#### 項目層級結構

```
backend/app/
├── models/          # 數據模型層（定義數據庫表結構和關係）
│   ├── member.py
│   ├── company.py
│   └── member_company.py
│
├── crud/            # 數據訪問層（數據庫操作）
│   ├── member.py
│   ├── company.py
│   └── member_company.py
│
├── services/        # 業務邏輯層
│   ├── member_service.py
│   └── member_company_service.py
│
└── api/routes/      # API 路由層
    ├── members.py
    └── member_companies.py
```

#### 各層的職責

1. **Models 層**：定義數據結構、關係、驗證規則
2. **CRUD 層**：提供基本的數據庫操作（Create, Read, Update, Delete）
3. **Services 層**：實現業務邏輯，組合多個 CRUD 操作
4. **Routes 層**：處理 HTTP 請求，調用 Services，返回響應

#### 數據流向示例

```
HTTP Request
    ↓
API Routes (member_companies.py)
    ↓
Services (member_company_service.py)
    ↓
CRUD (crud/member_company.py)
    ↓
Models (models/member_company.py)
    ↓
Database
```

---

## 相關文件引用

### 主要文件
- `backend/app/models/member_company.py` - 會員公司關聯模型定義
- `backend/app/models/member.py` - 會員模型定義
- `backend/app/models/company.py` - 公司模型定義
- `backend/app/api/routes/member_companies.py` - 會員公司關聯 API 路由

### 相關概念
- SQLModel/SQLAlchemy Relationship
- Python 類型提示（Type Hints）
- FastAPI 模型驗證
- 循環導入解決方案

---

## 更新記錄

- **2025-11-20**: 初始版本，包含模組級文檔字符串、TYPE_CHECKING、類型提示、Relationship 等概念說明
