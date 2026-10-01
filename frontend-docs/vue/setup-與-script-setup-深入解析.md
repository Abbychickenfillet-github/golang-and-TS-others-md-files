# Vue 3：setup() 與 `<script setup>` 深入解析

## 核心概念：setup() 是什麼？

`setup()` 是 Vue 3 Composition API 的**核心入口函式**，在組件實例初始化時被執行。它的主要職責是：

1. 建立**響應式狀態**（reactive state）
2. 定義**計算屬性**（computed properties）
3. 定義**監聽器**（watchers）
4. 定義**方法**（methods）
5. 生命週期鉤子（lifecycle hooks）

簡單說：**setup() 是你告訴 Vue「這個組件需要什麼狀態和邏輯」的地方**。

---

## 為什麼需要 setup()？

### 傳統 Options API 的問題

在 Vue 2 或 Vue 3 的 Options API 中：

```javascript
export default {
  data() {
    return {
      count: 0,
      message: ''
    }
  },
  
  computed: {
    doubled() {
      return this.count * 2
    }
  },
  
  watch: {
    count(newVal) {
      console.log('count 改變了:', newVal)
    }
  },
  
  methods: {
    increment() {
      this.count++
    }
  }
}
```

**問題**：
- 邏輯分散在不同區塊（data、computed、watch、methods）
- 如果一個功能涉及多個狀態和邏輯，需要跳來跳去找程式碼
- 難以複用邏輯（只能用 mixins，但容易命名衝突）
- `this` 的動態綁定有困擾

### Composition API 的優勢

```javascript
export default {
  setup() {
    // 一個地方 = 一個功能的所有邏輯
    
    // 狀態
    const count = ref(0)
    const message = ref('')
    
    // 計算
    const doubled = computed(() => count.value * 2)
    
    // 監聽
    watch(count, (newVal) => {
      console.log('count 改變了:', newVal)
    })
    
    // 方法
    const increment = () => {
      count.value++
    }
    
    // 必須 return 暴露給模板
    return {
      count,
      message,
      doubled,
      increment
    }
  }
}
```

**優勢**：
- 邏輯內聚（cohesion）：相關的狀態、計算、方法放在一起
- 易於複用：可以提取成獨立的 composable（自訂 Hook）
- 沒有 `this`，純函數式思維
- TypeScript 友好

---

## setup() 的執行時機與生命週期

### 執行時序圖

```
組件初始化流程
│
├─ 1. beforeCreate() ← setup() 在這之前執行！✨
│
├─ 2. setup() 執行 ← 🟢 這裡
│    ├─ 建立響應式狀態
│    ├─ 定義方法
│    └─ return 暴露給模板
│
├─ 3. created()
│
├─ 4. beforeMount()
│
├─ 5. mounted() ← 此時 DOM 已建立
│
├─ 6. beforeUpdate() ← 狀態改變時
│
├─ 7. updated()
│
├─ 8. beforeUnmount()
│
└─ 9. unmounted() ← 組件銷毀
```

**關鍵點**：setup() 執行時**組件實例還沒完全初始化**，所以不能用 `this`。

---

## 傳統 setup() 函式的詳細用法

### 基礎寫法

```javascript
import { ref, computed, watch } from 'vue'

export default {
  setup() {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. 建立響應式狀態 — ref()
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const count = ref(0)
    //  │        │   │
    //  │        │   └─ 初始值
    //  │        └────── 建立響應式參考物件（Ref Object）
    //  └────────────── 變數名稱
    
    // ref(0) 的內部結構
    // {
    //   value: 0,        ← 實際的值存在 .value
    //   _isRef: true     ← 標記這是個 Ref
    // }
    
    const message = ref('Hello')
    const isLoading = ref(false)
    const user = ref({
      name: 'Alice',
      age: 25
    })
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. 建立計算屬性 — computed()
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const doubled = computed(() => {
      // 這個回調函式只在依賴項改變時執行
      // 依賴項：count.value
      return count.value * 2
    })
    
    // computed() 返回一個 ComputedRef 物件
    // 可以直接讀它的 .value
    console.log(doubled.value)  // 0（因為 count 初始值是 0）
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. 監聽狀態改變 — watch()
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    watch(count, (newValue, oldValue) => {
      // count 改變時執行這個回調
      console.log(`count 從 ${oldValue} 變成 ${newValue}`)
    })
    
    // 監聽多個依賴項
    watch([count, message], ([newCount, newMsg]) => {
      console.log('count 或 message 改變了')
      console.log('新的 count:', newCount)
      console.log('新的 message:', newMsg)
    })
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. 定義方法 — 普通函式
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const increment = () => {
      count.value++  // ← 修改 .value 觸發響應式更新
    }
    
    const decrement = () => {
      count.value--
    }
    
    const resetCount = () => {
      count.value = 0
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5. 定義生命週期鉤子
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    import { onMounted, onUnmounted } from 'vue'
    
    onMounted(() => {
      console.log('組件已掛載到 DOM')
      // 初始化邏輯：載入資料、設定事件監聽等
    })
    
    onUnmounted(() => {
      console.log('組件被卸載')
      // 清理邏輯：移除事件監聽、取消定時器等
    })
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 6. 必須 return 暴露給模板
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    return {
      // 返回的物件中的屬性都可以在模板中使用
      count,
      message,
      doubled,
      increment,
      decrement,
      resetCount
    }
  }
}
```

### 模板使用

```vue
<template>
  <!-- 在模板中使用時，ref 會自動「脫殼」(auto-unwrap) -->
  <!-- 不需要寫 count.value，直接寫 count -->
  
  <div>
    <p>計數：{{ count }}</p>
    <p>加倍：{{ doubled }}</p>
    <p>訊息：{{ message }}</p>
    
    <button @click="increment">加 1</button>
    <button @click="decrement">減 1</button>
    <button @click="resetCount">重置</button>
  </div>
</template>
```

**為什麼在模板中不需要 `.value`？**

Vue 偵測到你在模板中使用 ref，會自動脫殼。這叫**自動脫殼 (Auto-unwrapping)**。

內部運作：
```javascript
// 模板編譯成以下程式碼
const count = this.count  // setup() 返回的 ref 物件
console.log(count.value)  // Vue 內部自動加 .value

// 但在 {{ }} 或事件處理中，Vue 已經幫你脫殼了
// 所以你只需寫 {{ count }} 而不是 {{ count.value }}
```

---

## ref() 的深層原理

### ref() 做了什麼？

```javascript
// 你寫的
const count = ref(0)

// Vue 內部執行的（簡化版）
function ref(value) {
  const refObject = {
    value: value,         // 實際值
    _isRef: true,        // 標記為 Ref（內部用）
    // ... 其他內部屬性
  }
  
  // 用 Proxy 監聽 .value 的讀寫
  return new Proxy(refObject, {
    get(target, key) {
      if (key === 'value') {
        // 追蹤依賴（dependency tracking）
        trackDependency()
      }
      return target[key]
    },
    
    set(target, key, newValue) {
      if (key === 'value' && target.value !== newValue) {
        target.value = newValue
        // 觸發所有依賴這個 ref 的 computed、watch、組件重新渲染
        triggerReactivity()
      }
      return true
    }
  })
}
```

### 為什麼不直接用普通變數？

```javascript
// ❌ 普通 JavaScript 變數
let count = 0
count++  // Vue 完全不知道這個變數改變了

// ✓ ref() 建立可追蹤的響應式物件
const count = ref(0)
count.value++  // Vue 偵測到改變 → 觸發重新渲染
```

**原因**：JavaScript 沒有辦法監聽普通變數。Vue 需要用 Proxy 或 Object.defineProperty 才能偵測變化。

---

## reactive() — 物件的響應式化

有時你需要整個物件都是響應式的，而不是一個個屬性用 ref：

```javascript
import { reactive, watch } from 'vue'

export default {
  setup() {
    // 方法 1：用多個 ref（淺層）
    const user = ref({
      name: 'Alice',
      age: 25,
      email: 'alice@example.com'
    })
    
    // 修改深層屬性需要這樣
    user.value.name = 'Bob'
    user.value.age = 26
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    // 方法 2：用 reactive（深層）
    const state = reactive({
      user: {
        name: 'Alice',
        age: 25,
        email: 'alice@example.com'
      },
      isLoading: false,
      error: null
    })
    
    // 可以直接修改，不需要 .value
    state.user.name = 'Bob'
    state.user.age = 26
    state.isLoading = true
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    // ref vs reactive 的差異
    const refUser = ref({ name: 'Alice' })
    const reactiveUser = reactive({ name: 'Alice' })
    
    // 修改深層屬性
    refUser.value.name = 'Bob'          // ← 需要 .value
    reactiveUser.name = 'Bob'           // ← 不需要 .value
    
    // 模板中都可以直接用
    // {{ refUser.user.name }}       ← 自動脫殼，不需寫 .value
    // {{ reactiveUser.user.name }}  ← 直接用
    
    return {
      refUser,
      reactiveUser,
      state
    }
  }
}
```

**ref vs reactive 對比**：

| 特性 | ref | reactive |
|------|-----|----------|
| 基本值（number、string）| ✓ | ✗ |
| 物件 | ✓（需 .value） | ✓（不需 .value） |
| 陣列 | ✓ | ✓ |
| 類型檢查 | 清晰（.value） | 隱式（容易混亂） |
| 解構時 | 容易丟失響應性 | 必須用 `toRefs()` |
| 社群推薦 | ✓ 主流 | 較少用 |

---

## computed() — 衍生狀態與快取機制

computed 不只是計算一個值，它有**快取**機制：

```javascript
import { ref, computed } from 'vue'

export default {
  setup() {
    const firstName = ref('Alice')
    const lastName = ref('Smith')
    
    // ❌ 普通方法 — 每次呼叫都執行
    const getFullName = () => {
      console.log('getFullName 被呼叫了')
      return `${firstName.value} ${lastName.value}`
    }
    
    // 模板中使用
    // {{ getFullName() }}  ← 每次渲染都執行
    
    // ✓ computed — 只在依賴項改變時執行
    const fullName = computed(() => {
      console.log('fullName 被計算了')
      return `${firstName.value} ${lastName.value}`
    })
    
    // 模板中使用
    // {{ fullName }}  ← 快取結果，不重複計算
    
    return {
      firstName,
      lastName,
      fullName,
      getFullName
    }
  }
}
```

### 可寫 computed

computed 預設是只讀的，但可以設定 getter 和 setter：

```javascript
const fullName = computed({
  get() {
    // 讀取時執行
    return `${firstName.value} ${lastName.value}`
  },
  
  set(newValue) {
    // 寫入時執行
    // 例如 fullName.value = 'Bob Johnson'
    [firstName.value, lastName.value] = newValue.split(' ')
  }
})

// 使用
fullName.value = 'Bob Johnson'  // 觸發 setter
console.log(firstName.value)    // 'Bob'
console.log(lastName.value)     // 'Johnson'
```

---

## watch() — 監聽響應式狀態

watch 讓你在狀態改變時執行副作用（side effects）：

```javascript
import { ref, watch } from 'vue'

export default {
  setup() {
    const count = ref(0)
    const message = ref('')
    const user = reactive({ name: 'Alice', age: 25 })
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. 監聽單一 ref
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    watch(count, (newValue, oldValue) => {
      console.log(`count 從 ${oldValue} 變成 ${newValue}`)
    })
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. 監聽多個依賴項
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    watch([count, message], ([newCount, newMsg], [oldCount, oldMsg]) => {
      console.log('count 或 message 改變了')
    })
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. 監聽物件的特定屬性
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    // ❌ 這不會工作 — 直接傳入物件只監聽參考，不監聽內部屬性
    watch(user, (newUser) => {
      console.log('user 改變了')
    })
    
    // ✓ 用 getter 函式指定要監聽的屬性
    watch(
      () => user.name,  // ← getter 函式
      (newName, oldName) => {
        console.log(`user.name 從 ${oldName} 變成 ${newName}`)
      }
    )
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. 深度監聽（deep watch）
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    watch(
      user,
      (newUser) => {
        console.log('user 物件內任何屬性改變了')
      },
      { deep: true }  // ← 啟用深度監聽
    )
    
    // 🚨 注意：deep watch 效能較差，盡量用 getter 監聽特定屬性
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5. 立即執行（immediate）
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    watch(
      count,
      (newValue) => {
        console.log('count 改變了（包括初始值）')
      },
      { immediate: true }  // ← 立即執行一次，即使 count 還沒改變
    )
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 6. 停止監聽
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const stopWatching = watch(count, (newValue) => {
      console.log('count 改變了')
    })
    
    // 任何時候可以停止監聽
    stopWatching()
    
    return { count, message, user }
  }
}
```

### watch vs watchEffect 的差異

```javascript
// watch — 顯式聲明依賴
watch(count, (newValue) => {
  console.log('count 改變了:', newValue)
})

// watchEffect — 自動追蹤依賴
watchEffect(() => {
  // 自動偵測這個回調中使用的所有響應式值
  console.log('count 改變了:', count.value)
  console.log('doubled:', doubled.value)
})

// watchEffect 的優勢：當依賴多時，不需要手動列舉
// watchEffect 的劣勢：無法取得 oldValue
```

---

## 生命週期鉤子在 setup() 中

在 setup() 中使用生命週期鉤子，需要匯入相應的函式：

```javascript
import {
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted
} from 'vue'

export default {
  setup() {
    onBeforeMount(() => {
      console.log('組件即將掛載到 DOM')
    })
    
    onMounted(() => {
      console.log('組件已掛載到 DOM')
      // 此時可以存取 DOM 元素
      const element = document.querySelector('#myElement')
      // 載入資料、初始化第三方庫等
    })
    
    onBeforeUpdate(() => {
      console.log('組件即將更新（狀態改變了）')
    })
    
    onUpdated(() => {
      console.log('組件已更新')
      // DOM 已更新，可以重新計算 DOM 尺寸等
    })
    
    onBeforeUnmount(() => {
      console.log('組件即將被卸載')
    })
    
    onUnmounted(() => {
      console.log('組件已被卸載')
      // 清理：移除事件監聽、清除定時器、取消 API 請求等
    })
  }
}
```

---

## `<script setup>` — 語法糖

`<script setup>` 是編譯時的語法糖，自動化上面所有的 return 邏輯。

### 傳統 setup() vs `<script setup>`

**傳統寫法**：
```javascript
export default {
  setup() {
    const count = ref(0)
    const increment = () => count.value++
    
    return { count, increment }  // ← 必須 return
  }
}
```

**`<script setup>` 寫法**：
```vue
<script setup>
  // 直接在此定義，自動暴露給模板
  const count = ref(0)
  const increment = () => count.value++
  // 不需要 return
</script>
```

### 怎樣用 `<script setup>`？

```vue
<script setup>
  import { ref, computed, watch, onMounted } from 'vue'
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. 響應式狀態
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const count = ref(0)
  const message = ref('Hello World')
  const user = ref({
    name: 'Alice',
    age: 25
  })
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. 計算屬性
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const doubled = computed(() => count.value * 2)
  const upperMessage = computed(() => message.value.toUpperCase())
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. 監聽器
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  watch(count, (newValue, oldValue) => {
    console.log(`count 從 ${oldValue} 變成 ${newValue}`)
  })
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. 方法
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const increment = () => count.value++
  const decrement = () => count.value--
  const reset = () => count.value = 0
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. 生命週期鉤子
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  onMounted(() => {
    console.log('組件已掛載')
  })
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 就這樣，不需要 return！
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
</script>

<template>
  <!-- 所有在 <script setup> 中定義的變數都可以直接用 -->
  <div>
    <p>計數：{{ count }}</p>
    <p>加倍：{{ doubled }}</p>
    <p>訊息：{{ message }}</p>
    <p>大寫：{{ upperMessage }}</p>
    
    <button @click="increment">加 1</button>
    <button @click="decrement">減 1</button>
    <button @click="reset">重置</button>
  </div>
</template>

<style scoped>
  button {
    margin: 0 5px;
  }
</style>
```

### `<script setup>` 的自動匯入和導出

在 `<script setup>` 中：

```vue
<script setup>
  // ✓ 自動暴露到模板
  const count = ref(0)
  const increment = () => count.value++
  
  // ✓ 自動暴露到模板
  import MyComponent from './MyComponent.vue'
  
  // ✗ 想要暴露的話需要明確定義 (少見)
  import { useId } from 'vue'
  const id = useId()  // ← 自動暴露
  
  // 接收 props
  defineProps({
    msg: String
  })
  
  // 定義 emits
  const emit = defineEmits(['update:count'])
  
  // 暴露組件的公開屬性（外部可透過 ref 存取）
  defineExpose({
    count,
    increment
  })
</script>
```

---

## 實戰例子：API 呼叫

### 使用 setup() 呼叫 Gemini API

```vue
<script>
import { ref, onMounted, onUnmounted } from 'vue'

export default {
  setup() {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 狀態管理
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const message = ref('')           // 使用者輸入的訊息
    const response = ref('')          // AI 的回應
    const loading = ref(false)        // 載入狀態
    const error = ref(null)           // 錯誤信息
    const abortController = ref(null) // 用於取消請求
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 方法：呼叫 Gemini API
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const callGeminiAPI = async () => {
      // 驗證輸入
      if (!message.value.trim()) {
        error.value = '請輸入訊息'
        return
      }
      
      // 重置狀態
      loading.value = true
      error.value = null
      response.value = ''
      
      // 建立新的 AbortController（用於取消請求）
      abortController.value = new AbortController()
      
      try {
        const result = await fetch('/api/ai/agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: message.value,
            isAuthenticated: false
          }),
          signal: abortController.value.signal  // 綁定取消訊號
        })
        
        if (!result.ok) {
          throw new Error(`API 錯誤：${result.status} ${result.statusText}`)
        }
        
        const data = await result.json()
        
        if (data.status === 'success') {
          response.value = data.data.response
          message.value = ''  // 清空輸入框
        } else {
          error.value = data.message || '未知錯誤'
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          error.value = '請求已取消'
        } else {
          error.value = `錯誤：${err.message}`
        }
      } finally {
        loading.value = false
      }
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 方法：取消請求
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const cancelRequest = () => {
      if (abortController.value) {
        abortController.value.abort()
        loading.value = false
        error.value = '請求已取消'
      }
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 生命週期：組件卸載時清理
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    onUnmounted(() => {
      // 組件卸載時取消所有未完成的請求
      if (abortController.value) {
        abortController.value.abort()
      }
    })
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 暴露給模板
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    return {
      message,
      response,
      loading,
      error,
      callGeminiAPI,
      cancelRequest
    }
  }
}
</script>

<template>
  <div class="chat-container">
    <!-- 訊息輸入框 -->
    <div class="input-group">
      <input
        v-model="message"
        type="text"
        placeholder="輸入訊息..."
        @keyup.enter="callGeminiAPI"
      />
      <button
        @click="callGeminiAPI"
        :disabled="loading || !message.trim()"
      >
        {{ loading ? '載入中...' : '傳送' }}
      </button>
      <button
        v-if="loading"
        @click="cancelRequest"
        class="cancel-btn"
      >
        取消
      </button>
    </div>
    
    <!-- 錯誤信息 -->
    <div v-if="error" class="error-message">
      ❌ {{ error }}
    </div>
    
    <!-- AI 回應 -->
    <div v-if="response" class="response">
      <h3>AI 回應：</h3>
      <p>{{ response }}</p>
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.cancel-btn {
  background-color: #dc3545;
}

.error-message {
  color: red;
  padding: 10px;
  background-color: #ffe6e6;
  border-radius: 4px;
  margin-bottom: 10px;
}

.response {
  background-color: #f0f0f0;
  padding: 15px;
  border-radius: 4px;
}

.response h3 {
  margin-top: 0;
}
</style>
```

### 用 `<script setup>` 改寫

```vue
<script setup>
import { ref } from 'vue'

// 狀態
const message = ref('')
const response = ref('')
const loading = ref(false)
const error = ref(null)
const abortController = ref(null)

// 方法
const callGeminiAPI = async () => {
  if (!message.value.trim()) {
    error.value = '請輸入訊息'
    return
  }
  
  loading.value = true
  error.value = null
  response.value = ''
  abortController.value = new AbortController()
  
  try {
    const result = await fetch('/api/ai/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.value, isAuthenticated: false }),
      signal: abortController.value.signal
    })
    
    if (!result.ok) throw new Error(`API 錯誤：${result.status}`)
    
    const data = await result.json()
    response.value = data.data.response
    message.value = ''
  } catch (err) {
    error.value = err.name === 'AbortError' ? '請求已取消' : `錯誤：${err.message}`
  } finally {
    loading.value = false
  }
}

const cancelRequest = () => {
  abortController.value?.abort()
}

// 組件卸載時清理
onUnmounted(() => abortController.value?.abort())
</script>

<!-- 樣板和樣式同上 -->
```

---

## ref 的 shallow 與 deep

```javascript
// 普通 ref — 深度響應式
const state = ref({
  user: {
    name: 'Alice'
  }
})

state.value.user.name = 'Bob'  // ✓ 能偵測到

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// shallowRef — 只監聽 .value 本身，不監聽內部屬性
const shallowState = shallowRef({
  user: {
    name: 'Alice'
  }
})

shallowState.value.user.name = 'Bob'  // ✗ 不能偵測到
shallowState.value = { user: { name: 'Bob' } }  // ✓ 能偵測到

// 🎯 用途：大型不可變資料結構（如樹形資料）需要手動更新時使用
```

---

## 常見陷阱與解決方案

### 陷阱 1：解構 ref 後丟失響應性

```javascript
const state = ref({ name: 'Alice', age: 25 })

// ❌ 錯誤：解構後變成普通值，失去響應性
const { name, age } = state.value
name = 'Bob'  // Vue 不會偵測到

// ✓ 正確方式 1：不解構
{{ state.value.name }}

// ✓ 正確方式 2：用 toRefs()
import { toRefs } from 'vue'
const { name, age } = toRefs(state.value)
name.value = 'Bob'  // ✓ 現在能偵測到

// ✓ 正確方式 3：用 reactive
const state = reactive({ name: 'Alice', age: 25 })
const { name, age } = state
name = 'Bob'  // ✓ 因為 reactive 已經代理了
```

### 陷阱 2：忘記在 watch 中清理

```javascript
// ❌ 危險：如果組件多次掛載/卸載，會有多個監聽器積累
watch(count, () => {
  // 副作用
})

// ✓ 正確：在 onUnmounted 時停止監聽
const stopWatching = watch(count, () => {
  // 副作用
})

onUnmounted(() => {
  stopWatching()
})

// 或簡單方式：watch 自動清理（如果有返回清理函式）
watch(count, async (newValue) => {
  const timer = setTimeout(() => {
    // 延遲操作
  }, 1000)
  
  // 返回清理函式
  return () => clearTimeout(timer)
})
```

### 陷阱 3：computed 的依賴追蹤

```javascript
// ❌ 錯誤：依賴沒有被自動追蹤
const userInput = ref('')
const result = computed(() => {
  // 這個 fetch 不會因為 userInput 改變而重新執行
  fetch(`/api/search?q=${userInput.value}`)
  return userInput.value.toUpperCase()
})

// ✓ 正確：用 watchEffect 或 watch 處理 API 呼叫
const userInput = ref('')
const searchResult = ref('')

watchEffect(async () => {
  const response = await fetch(`/api/search?q=${userInput.value}`)
  searchResult.value = await response.json()
})
```

---

## Number 轉換在 setup 中的應用

根據你的專案要求，如果字串內容不符合數字格式，就會返回 NaN：

```vue
<script setup>
import { ref, computed, watch } from 'vue'

// 使用者輸入
const userInput = ref('')

// 轉換為數字
const convertedNumber = computed(() => {
  const num = Number(userInput.value)
  // 如果字串內容不符合數字格式，就會返回 NaN
  return isNaN(num) ? null : num
})

// 監聽轉換結果
watch(convertedNumber, (newNum) => {
  if (newNum === null) {
    console.log('輸入無效')
  } else {
    console.log(`轉換成功：${newNum}`)
  }
})

// 送給 Gemini API
const analyzeNumber = async () => {
  const num = convertedNumber.value
  
  if (num === null) {
    error.value = '請輸入有效的數字'
    return
  }
  
  // 呼叫 API
  const response = await fetch('/api/ai/agent', {
    method: 'POST',
    body: JSON.stringify({
      message: `分析數字 ${num} 的特性`
    })
  })
  
  const data = await response.json()
  result.value = data.response
}
</script>

<template>
  <div>
    <input
      v-model="userInput"
      type="text"
      placeholder="輸入數字"
    />
    
    <!-- 顯示轉換結果 -->
    <p v-if="convertedNumber === null" class="error">
      ❌ 無效：不是數字
    </p>
    <p v-else class="success">
      ✓ 有效：{{ convertedNumber }}
    </p>
    
    <button @click="analyzeNumber">分析</button>
  </div>
</template>
```

---

## 總結表

| 概念 | 說明 | 用途 |
|------|------|------|
| **ref()** | 響應式容器，包裝任何值 | 基本狀態管理 |
| **reactive()** | 代理物件，深度響應式 | 複雜物件狀態 |
| **computed()** | 衍生狀態，有快取 | 計算值 |
| **watch()** | 監聽狀態改變 | 副作用（API 呼叫、日誌等） |
| **watchEffect()** | 自動追蹤依賴的監聽 | 依賴多時更簡潔 |
| **setup()** | 組件邏輯入口 | Composition API 核心 |
| **`<script setup>`** | setup() 的語法糖 | 現代 Vue 推薦寫法 |

---

## 參考資源

1. [Vue 3 官方文件 — setup()](https://vuejs.org/guide/extras/composition-api-faq.html)
2. [Vue 3 官方文件 — ref()](https://vuejs.org/api/reactivity-core.html#ref)
3. [Vue 3 官方文件 — computed()](https://vuejs.org/api/reactivity-core.html#computed)
4. [Vue 3 官方文件 — watch()](https://vuejs.org/api/reactivity-core.html#watch)
5. [Vue 3 官方文件 — Lifecycle Hooks](https://vuejs.org/api/composition-api-lifecycle.html)
6. [Vue 3 SFC `<script setup>` 文件](https://vuejs.org/api/sfc-script-setup.html)

---

**撰寫日期**：2026-09-23  
**適用版本**：Vue 3.3+  
**難度等級**：中級（需要理解響應式系統基礎）
