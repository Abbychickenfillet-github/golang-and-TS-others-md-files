# Day 22：框架與 API 交互—React / Vue / Angular 呼叫 Gemini 的寫法差異與效能

## 核心議題

現代框架（React、Vue、Angular）在呼叫外部 API（如 Google Gemini）時，雖然底層都是發送 HTTP 請求，但由於各框架的響應式系統、渲染時機、狀態管理思想不同，導致寫法、效能特性完全不一樣。

### 三大框架的 API 呼叫模式對比

| 框架 | 副作用執行時機 | 狀態管理 | 資料流 | API 呼叫習慣 |
|------|--------------|--------|------|-----------|
| **React** | `useEffect` 依賴陣列精確控制 | Hook（分散式）或 Context | 資料向下、事件向上 | 客戶端呼叫 → hook 管理狀態 |
| **Vue** | `watchEffect` / `watch` 自動追蹤 | `ref` / `reactive` 響應式系統 | 雙向綁定 | 組件方法呼叫 → 更新 data |
| **Angular** | `OnInit` 生命週期 / RxJS | 服務注入 + 可觀察物件流 | 依賴注入模式 | 服務呼叫 → Observable 訂閱 |

---

## 實例 1：基礎 API 呼叫寫法

### React 的寫法

```javascript
// React Hook 模式：副作用與狀態分離
import { useState, useEffect } from 'react'

export function ChatComponent() {
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const callGeminiAPI = async (message) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
      
      const data = await result.json()
      setResponse(data.response)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={() => callGeminiAPI('你好')}>呼叫 Gemini</button>
      {loading && <p>載入中...</p>}
      {error && <p>錯誤：{error}</p>}
      {response && <p>回應：{response}</p>}
    </div>
  )
}
```

**React 的特點**：
- 呼叫是**事件驅動**（點擊按鈕觸發）
- 狀態改變用 `setState` 觸發重新渲染
- 需要**手動管理** loading、error 三態
- **依賴陣列** `[]` 控制副作用何時執行

---

### Vue 的寫法

#### 傳統 setup() 函式

```javascript
// Vue Composition API：響應式追蹤 + 自動渲染
import { ref } from 'vue'

export default {
  setup() {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. ref() — 建立響應式狀態
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ref(value) 把普通值包進一個「參考物件」
    // 內部結構：{ value: '', _isRef: true }
    // 為什麼需要？JavaScript 無法監聽普通變數，
    // 所以 Vue 用 Proxy 監聽 .value 的讀寫變化
    
    const response = ref('')      // API 的回應
    const loading = ref(false)    // 載入狀態
    const error = ref(null)       // 錯誤信息
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. 定義方法 — 呼叫 API
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const callGeminiAPI = async (message) => {
      loading.value = true    // ← 修改 .value 觸發響應式更新
      error.value = null
      
      try {
        const result = await fetch('/api/ai/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        })
        
        const data = await result.json()
        response.value = data.response  // ← 更新 .value
      } catch (err) {
        error.value = err.message
      } finally {
        loading.value = false
      }
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. 必須 return 暴露給模板
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // setup() 返回的物件中的屬性都能在模板中使用
    
    return { response, loading, error, callGeminiAPI }
  }
}
```

**Vue setup() 的運作原理**：

1. **setup() 執行時機**
   - 在組件初始化時執行（甚至在 beforeCreate 之前）
   - 只執行一次，不會重複執行
   - 此時組件實例還沒完全初始化，所以不能用 `this`

2. **ref() 的響應式機制**
   ```javascript
   // 內部運作（簡化版）
   const response = ref('')
   // Vue 用 Proxy 監聽：
   // response.value = 'xxx'  ← 偵測到改變
   //   ↓
   // 觸發所有依賴這個 ref 的組件重新渲染
   ```

3. **模板中自動脫殼**
   ```vue
   <!-- 在模板中，不需要寫 .value -->
   <p>{{ response }}</p>        ✓ 正確
   <p>{{ response.value }}</p>  ✗ 不需要（Vue 自動脫殼）
   ```

---

#### 現代 `<script setup>` 寫法

`<script setup>` 是編譯時的語法糖，自動化了 setup() 的 return 邏輯。相同邏輯用更簡潔的方式寫：

```vue
<script setup>
  import { ref } from 'vue'
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 狀態 — 直接定義，無需 return
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const response = ref('')
  const loading = ref(false)
  const error = ref(null)
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 方法 — 也是直接定義
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const callGeminiAPI = async (message) => {
    loading.value = true
    error.value = null
    
    try {
      const result = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
      
      const data = await result.json()
      response.value = data.response
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }
  
  // 不需要 return，自動暴露給模板！
</script>

<template>
  <div>
    <button @click="callGeminiAPI('你好')">呼叫 Gemini</button>
    
    <!-- ref 在模板中自動脫殼 -->
    <p v-if="loading">載入中...</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="response" class="response">{{ response }}</p>
  </div>
</template>
```

**setup() vs `<script setup>` 對比**：

| 特性 | setup() 函式 | `<script setup>` |
|------|-------------|-----------------|
| 需要 import | ✓ | ✓（同樣要） |
| 需要手動 return | ✓ 必須 return | ✗ 自動暴露 |
| 程式碼行數 | 較多 | 較少 |
| 支援度 | Vue 3.0+ | Vue 3.2+（推薦） |
| 效能 | 相同 | 相同 |
| 社群推薦 | ✗ 舊方式 | ✓ 現代推薦 |

---

**Vue 的特點**：
- 也是**事件驅動**，但用 `ref()` 包裝狀態，自動偵測 `.value` 改變
- **不需要** React 那樣的依賴陣列（自動追蹤）
- **不需要** Angular 那樣的手動訂閱（Observable）
- 模板層可直接綁定 `{{ response }}`，ref 自動脫殼
- `<script setup>` 是現代 Vue 寫法，比傳統 setup() 簡潔

---

### Angular 的寫法

```typescript
// Angular 服務 + Observable：函數式響應式程式設計
import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { BehaviorSubject, Observable } from 'rxjs'
import { tap, finalize } from 'rxjs/operators'

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private loadingSubject = new BehaviorSubject(false)
  private responseSubject = new BehaviorSubject('')
  private errorSubject = new BehaviorSubject(null)

  loading$ = this.loadingSubject.asObservable()
  response$ = this.responseSubject.asObservable()
  error$ = this.errorSubject.asObservable()

  constructor(private http: HttpClient) {}

  callGemini(message: string): Observable<any> {
    this.loadingSubject.next(true)
    this.errorSubject.next(null)

    return this.http.post('/api/ai/agent', { message }).pipe(
      tap(data => this.responseSubject.next(data.response)),
      finalize(() => this.loadingSubject.next(false))
    )
  }
}

// 組件中注入並訂閱
@Component({
  selector: 'app-chat',
  template: `
    <button (click)="onAsk('你好')">呼叫 Gemini</button>
    <p *ngIf="loading$ | async">載入中...</p>
    <p *ngIf="error$ | async as err">錯誤：{{ err }}</p>
    <p *ngIf="response$ | async as resp">回應：{{ resp }}</p>
  `
})
export class ChatComponent {
  loading$ = this.gemini.loading$
  response$ = this.gemini.response$
  error$ = this.gemini.error$

  constructor(private gemini: GeminiService) {}

  onAsk(message: string) {
    this.gemini.callGemini(message).subscribe({
      error: (err) => console.error(err)
    })
  }
}
```

**Angular 的特點**：
- **服務層** 封裝 API 邏輯，組件層只**訂閱** Observable
- 用 RxJS 的 `pipe()`、`tap()`、`finalize()` 串聯轉換
- 必須**手動訂閱** (subscribe)，才能執行
- 狀態用 `BehaviorSubject`，自動推播變化給所有訂閱者

---

## 效能差異分析

### 1. **重新渲染觸發時機**

| 框架 | 觸發方式 | 影響 |
|------|--------|-----|
| React | `setState` 呼叫 → 整個組件樹重新執行函式 | 可能不必要的重渲染，需用 `useMemo` / `useCallback` 優化 |
| Vue | 直接修改 `ref.value` → 響應式系統偵測 | 精確追蹤修改，只更新相關 DOM 節點 |
| Angular | Observable 推播 → 變異偵測 | 預設檢查所有組件，需用 `OnPush` 策略優化 |

### 2. **記憶體與 CPU**

React 在大表單中的問題：
```javascript
// ❌ 每次狀態更新都重新執行整個函式
const [items, setItems] = useState([])
const [filter, setFilter] = useState('')

// 即使只改 filter，items 也會重新建立陣列
// 導致子組件全部重渲染
return items.map(item => <ItemCard key={item.id} data={item} />)
```

Vue 的優勢：
```javascript
// ✓ 只更新實際改變的 DOM 部分
const items = ref([])
const filter = ref('')
// 修改 filter.value 時，items 相關的 DOM 不會重新計算
```

Angular 的陷阱：
```typescript
// ❌ 預設每個事件都觸發變異偵測
export class ItemListComponent {
  items = [] // 沒用 OnPush，會全表掃描
}

// ✓ 改用 OnPush 只監聽 @Input 變化
@Component({
  selector: 'app-list',
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

### 3. **API 呼叫的去抖動 (Debounce) 寫法**

**React**：需要自己管理 timer
```javascript
const [query, setQuery] = useState('')

useEffect(() => {
  const timer = setTimeout(() => {
    callGeminiAPI(query)
  }, 500)

  return () => clearTimeout(timer) // 清理
}, [query])
```

**Vue**：搭配 `watch` 可自動清理
```javascript
const query = ref('')

watch(
  query,
  async (newVal) => {
    // 自動防抖，watch 會取消前一次
    await callGeminiAPI(newVal)
  },
  { debounce: 500 }
)
```

**Angular**：RxJS 內建 `debounceTime`
```typescript
this.search$.pipe(
  debounceTime(500),
  switchMap(query => this.http.post('/api/ai/agent', { message: query }))
).subscribe(...)
```

---

## 專案實例：你的 Next.js + Gemini

### 現狀（後端 API Route）

```javascript
// app/(api)/api/ai/agent/route.js
export async function POST(request) {
  const body = await request.json()
  const { message } = body

  const aiClient = getAIClient()
  const response = await aiClient.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: message
  })

  return successResponse(res, { response: response.text })
}
```

**你目前的架構**：
- 後端 API Route **直接呼叫** Gemini（不經過前端）
- 前端發送 POST 請求到 `/api/ai/agent`
- 後端返回 AI 回應

### 若改用純前端框架呼叫（示例）

**React**：
```javascript
const [response, setResponse] = useState('')

const callDirect = async (message) => {
  const res = await fetch('/api/ai/agent', {
    method: 'POST',
    body: JSON.stringify({ message })
  })
  const data = await res.json()
  setResponse(data.response)
}
```

**Vue**：
```javascript
const response = ref('')

const callDirect = async (message) => {
  const res = await fetch('/api/ai/agent', {
    method: 'POST',
    body: JSON.stringify({ message })
  })
  const data = await res.json()
  response.value = data.response
}
```

**Angular**：
```typescript
@Injectable()
export class GeminiClient {
  constructor(private http: HttpClient) {}

  ask(message: string): Observable<any> {
    return this.http.post('/api/ai/agent', { message })
  }
}
```

**結論**：三者底層邏輯相同，差異在於狀態管理風格。

---

## 額外：Number 轉換邏輯與 API 呼叫的搭配

在你的應用中，若涉及數值驗證（如時間戳記、計數），需要小心 JavaScript 的隱性轉換：

```javascript
// ❌ 常見錯誤
const userInput = "123abc"
const num = Number(userInput)  // NaN （不符合數字格式）

// ✓ 正確做法
const num = Number(userInput)
if (isNaN(num)) {
  // 返回用戶友善的錯誤信息給 API
  throw new Error('輸入必須是有效的數字')
}

// 在 React 中
const [input, setInput] = useState('')
const handleSubmit = () => {
  const num = Number(input)
  if (isNaN(num)) {
    setError('輸入必須是有效的數字')
    return
  }
  callGeminiAPI(`分析數字 ${num}`)
}
```

**Vue 版**：
```javascript
const input = ref('')
const error = ref(null)

const handleSubmit = () => {
  const num = Number(input.value)
  if (isNaN(num)) {
    error.value = '輸入必須是有效的數字'
    return
  }
  callGeminiAPI(`分析數字 ${num}`)
}
```

**Angular 版**：
```typescript
onSubmit(input: string) {
  const num = Number(input)
  if (isNaN(num)) {
    this.error$.next('輸入必須是有效的數字')
    return
  }
  this.geminiService.ask(`分析數字 ${num}`).subscribe(...)
}
```

---

## 效能最佳實踐

### 1. **避免不必要的 API 呼叫**

所有框架都應該用去抖動或節流：
- **去抖動** (debounce)：使用者停止輸入 500ms 後才呼叫
- **節流** (throttle)：每 500ms 最多呼叫一次

### 2. **快取回應**

```javascript
// React + useMemo 或外部 TanStack Query
// Vue + computed 或 pinia 狀態管理
// Angular + service + BehaviorSubject

const cache = new Map()

const callGemini = async (message) => {
  if (cache.has(message)) return cache.get(message)
  
  const response = await fetch(...)
  cache.set(message, response)
  return response
}
```

### 3. **處理並發請求**

**React**：用 `AbortController` 取消過時請求
```javascript
useEffect(() => {
  const abort = new AbortController()
  
  fetch('/api/ai/agent', { signal: abort.signal })
  
  return () => abort.abort() // 組件卸載時取消
}, [])
```

**Angular**：RxJS 的 `switchMap` 自動取消前一個請求
```typescript
this.query$.pipe(
  switchMap(q => this.http.post('/api/ai/agent', { message: q }))
)
```

---

## 總結

| 指標 | React | Vue | Angular |
|------|-------|-----|---------|
| 學習曲線 | 中等（需懂 Hook）| 低（更直覺）| 高（TypeScript + RxJS）|
| 效能（小應用）| 優 | 優 | 優 |
| 效能（大應用）| 需手動優化 | 自動追蹤，略優 | 需 OnPush 策略 |
| API 呼叫易用性 | 中等（useEffect 複雜）| 高（watch 直覺）| 中等（Observable 函數式）|
| 企業規模適配 | 適合 | 適合中小型 | 最適合企業 |

**建議**：
- 小專案或快速迭代 → **Vue**（響應式系統自動優化）
- 複雜狀態 + 大團隊 → **React**（生態豐富，但需自律）
- 企業級型別安全 + 架構規範 → **Angular**（一切現成）

---

## 參考來源

1. [React Hooks 官方文件](https://react.dev/reference/react/useEffect) — useEffect 依賴陣列與副作用時機
2. [Vue Composition API](https://vuejs.org/guide/extras/composition-api-faq.html) — 響應式系統原理
3. [Angular Change Detection](https://angular.io/guide/change-detection) — OnPush 策略
4. [RxJS 官方手冊](https://rxjs.dev/guide/overview) — switchMap、debounceTime 等操作符
5. [Google Generative AI 官方文件](https://cloud.google.com/docs/genai) — Gemini API 呼叫規範
6. [MDN：Number() 轉換與 NaN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number) — 數值驗證

---

**撰寫日期**：2026-09-23  
**適用版本**：React 19+、Vue 3+、Angular 18+、Gemini 2.5 Flash
