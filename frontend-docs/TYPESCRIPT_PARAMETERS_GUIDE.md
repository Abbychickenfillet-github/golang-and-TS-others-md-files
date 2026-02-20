# TypeScript 函數參數定義位置說明

## 📍 參數定義位置

TypeScript 的函數參數定義在**函數名稱後的圓括號 `()` 內**。

## 📝 基本語法

```typescript
function 函數名稱(參數1: 型別1, 參數2: 型別2): 返回型別 {
  // 函數內容
}
```

## 🔍 詳細說明

### 1. 參數定義位置

```typescript
// ✅ 正確：參數定義在圓括號 () 內
function myFunction(param1: string, param2: number) {
  // param1 和 param2 的型別在這裡定義
}

// ❌ 錯誤：不能在別的地方定義
function myFunction {
  param1: string  // 這樣是錯誤的！
}
```

### 2. 參數型別語法

使用**冒號 `:`** 來指定參數型別：

```typescript
// 語法：參數名稱: 型別
function greet(name: string) {
  console.log(`Hello, ${name}`)
}

// 多個參數
function add(a: number, b: number): number {
  return a + b
}
```

### 3. 實際範例

#### 範例 1：基本參數

```typescript
// 定義位置：在函數名稱後的 () 內
public static loginAccessToken(
  data: TDataLoginAccessToken,  // ← 參數定義在這裡
): CancelablePromise<Token> {
  // 函數內容
}
```

**說明：**
- `data` 是參數名稱
- `TDataLoginAccessToken` 是參數的型別
- 定義位置：`loginAccessToken(` 之後的 `()` 內

#### 範例 2：多個參數

```typescript
// 定義位置：在函數名稱後的 () 內
export const request = <T>(
  config: OpenAPIConfig,        // ← 第一個參數
  options: ApiRequestOptions,    // ← 第二個參數
  axiosClient: AxiosInstance = axios,  // ← 第三個參數（有預設值）
): CancelablePromise<T> => {
  // 函數內容
}
```

**說明：**
- `config`、`options`、`axiosClient` 都是參數
- 每個參數的型別用冒號 `:` 指定
- 參數之間用逗號 `,` 分隔
- 定義位置：`request = <T>(` 之後的 `()` 內

#### 範例 3：箭頭函數

```typescript
// 箭頭函數的參數定義也在 () 內
const login = async (data: AccessToken) => {
  // data 的型別定義在 (data: AccessToken) 這裡
  const response = await LoginService.loginAccessToken({
    formData: data,
  })
}
```

**說明：**
- 箭頭函數的參數也定義在 `()` 內
- `data: AccessToken` 表示參數名稱是 `data`，型別是 `AccessToken`

## 📊 完整對照表

| 語法元素 | 符號 | 用途 | 範例 |
|---------|------|------|------|
| 函數參數定義 | `()` 圓括號 | 包裹參數列表 | `function myFunc(param: string)` |
| 參數型別指定 | `:` 冒號 | 指定參數型別 | `param: string` |
| 泛型參數 | `<>` 角括號 | 包裹泛型型別 | `function myFunc<T>(param: T)` |
| 返回型別 | `:` 冒號（在 `)` 後） | 指定返回型別 | `function myFunc(): string` |
| 可選參數 | `?` 問號 | 標記參數為可選 | `param?: string` |
| 預設值 | `=` 等號 | 設定參數預設值 | `param: string = "default"` |

## 🎯 重點總結

1. **參數定義位置**：函數名稱後的 `()` 圓括號內
2. **型別指定方式**：使用冒號 `:`，格式為 `參數名稱: 型別`
3. **多個參數**：用逗號 `,` 分隔
4. **可選參數**：在參數名稱後加 `?`
5. **預設值**：使用 `=` 指定

## 📝 實際程式碼範例

### 範例 1：auth.ts 中的 loginAccessToken

```typescript
public static loginAccessToken(
  data: TDataLoginAccessToken,  // ← 參數定義在這裡
): CancelablePromise<Token> {
  const { formData } = data
  return __request(OpenAPI, {
    method: "POST",
    url: "/api/v1/login/access-token",
    formData: formData,
  })
}
```

**參數定義位置：**
- 函數名稱：`loginAccessToken`
- 參數定義：`(` 之後，`)` 之前
- 參數：`data: TDataLoginAccessToken`
  - `data` = 參數名稱
  - `:` = 型別指定符號
  - `TDataLoginAccessToken` = 參數型別

### 範例 2：request.ts 中的 request 函數

```typescript
export const request = <T>(
  config: OpenAPIConfig,           // ← 第一個參數
  options: ApiRequestOptions,       // ← 第二個參數
  axiosClient: AxiosInstance = axios,  // ← 第三個參數（有預設值）
): CancelablePromise<T> => {
  // 函數內容
}
```

**參數定義位置：**
- 函數名稱：`request`
- 泛型參數：`<T>`（在函數名稱後，圓括號前）
- 參數定義：`(` 之後，`)` 之前
- 三個參數：
  1. `config: OpenAPIConfig`
  2. `options: ApiRequestOptions`
  3. `axiosClient: AxiosInstance = axios`（有預設值）

### 範例 3：useAuth.ts 中的 login 函數

```typescript
const login = async (data: AccessToken) => {
  // ↑ 參數定義在這裡
  const response = await LoginService.loginAccessToken({
    formData: data,
  })
  localStorage.setItem("access_token", response.access_token)
}
```

**參數定義位置：**
- 函數名稱：`login`
- 參數定義：`(` 之後，`)` 之前
- 參數：`data: AccessToken`
  - `data` = 參數名稱
  - `:` = 型別指定符號
  - `AccessToken` = 參數型別

## ✅ 檢查清單

當你看到一個 TypeScript 函數時，要找到參數定義：

1. ✅ 找到函數名稱
2. ✅ 找到函數名稱後的 `(`
3. ✅ `(` 和 `)` 之間的內容就是參數定義
4. ✅ 每個參數的格式是：`參數名稱: 型別`
5. ✅ 多個參數用逗號 `,` 分隔

## 🔍 常見錯誤

### ❌ 錯誤 1：在錯誤的位置定義參數

```typescript
// 錯誤
function myFunction {
  param: string  // ❌ 不能在這裡定義
}

// 正確
function myFunction(param: string) {  // ✅ 參數定義在 () 內
}
```

### ❌ 錯誤 2：忘記冒號

```typescript
// 錯誤
function myFunction(param string) {  // ❌ 缺少冒號
}

// 正確
function myFunction(param: string) {  // ✅ 使用冒號指定型別
}
```

### ❌ 錯誤 3：參數之間缺少逗號

```typescript
// 錯誤
function myFunction(param1: string param2: number) {  // ❌ 缺少逗號
}

// 正確
function myFunction(param1: string, param2: number) {  // ✅ 用逗號分隔
}
```
