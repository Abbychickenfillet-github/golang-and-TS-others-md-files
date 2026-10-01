# TanStack Query 在不同框架中的 queryKey 寫法統合

> **本文重點**：同一份數據（「取得事件列表」），在 React、Vue、Angular、Svelte 四個框架中，queryKey 的設計與失效策略怎麼寫。核心原理相同（queryKey 改變 = 新快取），框架差異在於「怎麼綁定到 component lifecycle」。

---

## 一、統一的 queryKey 工廠（所有框架共用）

**重點**：queryKey 本身是框架無關的，不管在 React、Vue 還是 Angular，定義的方式都一樣。

```typescript
// queryKeys.ts（所有框架共用）
export const eventQueryKeys = {
  all: ['events'] as const,
  lists: () => [...eventQueryKeys.all, 'list'] as const,
  list: (filters: EventFilter) => [...eventQueryKeys.lists(), filters] as const,
  details: () => [...eventQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventQueryKeys.details(), id] as const,
  byChannel: (channelId: string) => [...eventQueryKeys.all, 'channel', channelId] as const,
};

export const ticketQueryKeys = {
  all: ['tickets'] as const,
  search: (search: string) => [...ticketQueryKeys.all, 'search', search] as const,
  byEvent: (eventId: string) => [...ticketQueryKeys.all, 'event', eventId] as const,
  byStatus: (eventId: string, status: string) => 
    [...ticketQueryKeys.byEvent(eventId), 'status', status] as const,
};
```

**三個規則（框架無關）**：
1. **越具體越好** — 把所有會影響結果的參數都放進 key
2. **分層結構** — 方便後續的 `invalidateQueries` 以 prefix 方式失效多層
3. **不要序列化物件** — 用展開 spread operator，不要 `JSON.stringify`

---

## 二、React 中的 queryKey 寫法

### 方式一：useQuery + 簡單 filter

```tsx
// ✅ 基礎用法
import { useQuery } from '@tanstack/react-query';
import { eventQueryKeys } from '@/queryKeys';

function EventList({ filters }: { filters: EventFilter }) {
  const { data: events, isPending } = useQuery({
    queryKey: eventQueryKeys.list(filters), // ← filters 變了，key 自動變
    queryFn: () => fetchEventList(filters),
  });

  return isPending ? <Spinner /> : <EventTable events={events} />;
}
```

### 方式二：useQuery + dependency array（避免）

```tsx
// ❌ 反面教材：手動追蹤 dependency
function EventList({ eventId }: { eventId: string }) {
  const [filters, setFilters] = useState<EventFilter>({});
  
  // 如果漏掉 filters 在 dependency array，component 不會更新
  const { data } = useQuery({
    queryKey: eventQueryKeys.list(filters),
    queryFn: () => fetchEventList(filters),
    // ← 沒有 enabled、沒有 dependency array，就交給 queryKey 自動處理
  });

  return <EventTable events={data} />;
}
```

### 方式三：useMutation + 精確 invalidation

```tsx
// ✅ mutation 時只失效相關的快取
function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateEventPayload) => updateEvent(data),
    onSuccess: (response) => {
      // 只失效這個事件的詳情
      queryClient.invalidateQueries({
        queryKey: eventQueryKeys.detail(response.id),
      });

      // 同時失效這個事件相關的所有列表
      queryClient.invalidateQueries({
        queryKey: eventQueryKeys.byChannel(response.channelId),
        exact: false, // prefix match
      });
    },
  });
}
```

### 方式四：Query 組合（新功能 v5+）

```tsx
// ✅ React Query v5 的 combine 模式
function useEventDashboard(eventId: string) {
  const queries = useQueries({
    queries: [
      {
        queryKey: eventQueryKeys.detail(eventId),
        queryFn: () => fetchEventDetail(eventId),
      },
      {
        queryKey: ticketQueryKeys.byEvent(eventId),
        queryFn: () => fetchTickets(eventId),
      },
      {
        queryKey: eventQueryKeys.byChannel(channelId),
        queryFn: () => fetchChannelStats(channelId),
      },
    ],
  });

  return queries;
}
```

**React 特色**：
- 完全 hooks-based，queryKey 一改就自動 refetch
- Dependency 管理透明（queryKey 本身就是 dependency）
- 最成熟的生態與文件

---

## 三、Vue 3（Composition API）中的 queryKey 寫法

### 方式一：useQuery + ref 追蹤

```vue
<script setup lang="ts">
import { ref, watch } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { eventQueryKeys } from '@/queryKeys';

const filters = ref<EventFilter>({});

// ✅ 透過 computed 讓 queryKey 反應式
const { data: events, isPending } = useQuery({
  queryKey: computed(() => eventQueryKeys.list(filters.value)),
  queryFn: () => fetchEventList(filters.value),
});

const handleFilterChange = (newFilters: EventFilter) => {
  filters.value = newFilters; // ← 自動觸發重新 fetch
};
</script>

<template>
  <div>
    <Spinner v-if="isPending" />
    <EventTable :events="events" />
  </div>
</template>
```

### 方式二：useQuery + watch

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';

const eventId = ref('');
const enabled = ref(false);

const queryClient = useQueryClient();

// queryKey 用 computed 包起來，這樣改變時自動觸發
const queryKey = computed(() => ['event', eventId.value]);

const { data: event } = useQuery({
  queryKey,
  queryFn: () => fetchEvent(eventId.value),
  enabled: enabled.value && eventId.value !== '', // ← watch 也要手動管理
});

watch(eventId, (newId) => {
  if (newId) {
    enabled.value = true;
  }
});
</script>
```

### 方式三：useMutation + invalidation

```vue
<script setup lang="ts">
import { useMutation, useQueryClient } from '@tanstack/vue-query';

const queryClient = useQueryClient();

const { mutate: updateEvent } = useMutation({
  mutationFn: async (data: UpdateEventPayload) => {
    return await updateEvent(data);
  },
  onSuccess: (response) => {
    // Vue Query 的 invalidation 語法跟 React 完全相同
    queryClient.invalidateQueries({
      queryKey: eventQueryKeys.detail(response.id),
    });

    queryClient.invalidateQueries({
      queryKey: eventQueryKeys.all,
      exact: false,
    });
  },
});

const handleSave = async (eventData: EventData) => {
  updateEvent(eventData);
};
</script>
```

**Vue 特色**：
- 要包 `computed(() => queryKey)` 讓 key 變成反應式
- 不需要 dependency array，直接用 Vue 的反應性系統
- 語法上比 React 簡潔（沒有 `useCallback` / `useMemo`）

---

## 四、Angular 中的 queryKey 寫法

### 方式一：Resolver（推薦）+ queryKey

```typescript
// event.resolver.ts
import { inject } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { eventQueryKeys } from '@/queryKeys';

export class EventListResolver {
  private queryClient = inject(QueryClient);

  resolve(route: ActivatedRouteSnapshot) {
    const filters = route.queryParams as EventFilter;
    
    return injectQuery(() => ({
      queryKey: eventQueryKeys.list(filters),
      queryFn: () => fetchEventList(filters),
    }));
  }
}

// event-list.component.ts
@Component({
  selector: 'app-event-list',
  template: `
    <div *ngIf="events$ | async as events">
      <EventTable [events]="events" />
    </div>
  `,
})
export class EventListComponent {
  // Resolver 自動透過 route data 提供
  events$ = this.route.data.pipe(map(data => data.events));

  constructor(private route: ActivatedRoute) {}
}
```

### 方式二：injectQuery（RxJS 風格）

```typescript
// event-dashboard.component.ts
import { Component, Input } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-event-dashboard',
  template: `
    <div>
      <div *ngIf="eventDetail$ | async as detail">
        {{ detail.name }}
      </div>
      <div *ngIf="tickets$ | async as tickets">
        <TicketList [tickets]="tickets" />
      </div>
    </div>
  `,
})
export class EventDashboardComponent {
  @Input() eventId: string;

  // ✅ injectQuery 返回 Observable
  eventDetail$ = injectQuery(() => ({
    queryKey: eventQueryKeys.detail(this.eventId),
    queryFn: () => fetchEventDetail(this.eventId),
  })).data$;

  tickets$ = injectQuery(() => ({
    queryKey: ticketQueryKeys.byEvent(this.eventId),
    queryFn: () => fetchTickets(this.eventId),
  })).data$;
}
```

### 方式三：Mutation Service

```typescript
// event.service.ts
import { Injectable } from '@angular/core';
import { injectMutation } from '@tanstack/angular-query-experimental';

@Injectable({ providedIn: 'root' })
export class EventService {
  queryClient = inject(QueryClient);

  updateEvent$ = injectMutation(() => ({
    mutationFn: (data: UpdateEventPayload) => this.http.put(`/api/events/${data.id}`, data),
    onSuccess: (response) => {
      // invalidation 語法同上
      this.queryClient.invalidateQueries({
        queryKey: eventQueryKeys.detail(response.id),
      });
    },
  }));

  constructor(private http: HttpClient) {}
}

// event-editor.component.ts
@Component({
  selector: 'app-event-editor',
  template: `
    <form (ngSubmit)="onSave()">
      <!-- form controls -->
      <button 
        [disabled]="(eventService.updateEvent$ | async)?.isPending"
        type="submit"
      >
        Save
      </button>
    </form>
  `,
})
export class EventEditorComponent {
  constructor(
    public eventService: EventService,
  ) {}

  onSave() {
    this.eventService.updateEvent$.mutate(this.eventForm.value);
  }
}
```

**Angular 特色**：
- 基於 RxJS Observable（async pipe 處理訂閱）
- `injectQuery` 返回 Observable，要用 `data$` 取數據
- 通常搭配 Route Resolver 或 Guard 預載數據
- queryKey 的寫法跟 React/Vue 一樣

---

## 五、Svelte 中的 queryKey 寫法

### 方式一：createQuery store

```svelte
<!-- EventList.svelte -->
<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { eventQueryKeys } from '@/queryKeys';

  let filters: EventFilter = {};

  // ✅ createQuery 返回 store，自動追蹤 queryKey 變化
  const events = createQuery({
    queryKey: () => eventQueryKeys.list(filters),
    queryFn: () => fetchEventList(filters),
  });
</script>

{#if $events.isPending}
  <Spinner />
{:else}
  <EventTable events={$events.data} />
{/if}
```

### 方式二：reactive queryKey

```svelte
<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';

  export let eventId: string;

  // ✅ 用 derived 或 reactive 讓 queryKey 跟著改變
  const queryKey = $derived([eventQueryKeys, 'detail', eventId]);

  const event = createQuery({
    queryKey,
    queryFn: () => fetchEvent(eventId),
  });
</script>

<div>
  {#if $event.isPending}
    Loading...
  {:else}
    <h1>{$event.data?.name}</h1>
  {/if}
</div>
```

### 方式三：Mutation

```svelte
<script lang="ts">
  import { createMutation } from '@tanstack/svelte-query';
  import { useQueryClient } from '@tanstack/svelte-query';

  const queryClient = useQueryClient();

  const updateEvent = createMutation({
    mutationFn: (data: UpdateEventPayload) => updateEventAPI(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: eventQueryKeys.detail(response.id),
      });
    },
  });

  const handleSave = async (data: EventData) => {
    await $updateEvent.mutateAsync(data);
  };
</script>

<button on:click={() => handleSave(formData)}>
  {$updateEvent.isPending ? 'Saving...' : 'Save'}
</button>
```

**Svelte 特色**：
- Svelte 的 store 系統最簡潔（直接 `$` reactive variable）
- queryKey 用 `$derived` 追蹤會自動更新
- 語法上最少的 boilerplate

---

## 六、四個框架的 queryKey 寫法對比表

| 框架 | queryKey 怎麼反應式 | invalidation 文法 | 特點 |
|------|-----------------|-----------------|------|
| **React** | 直接變，自動 refetch | `queryClient.invalidateQueries(...)` | 最成熟，hooks 最靈活 |
| **Vue** | 用 `computed()` 包 | `queryClient.invalidateQueries(...)` | 反應性系統簡潔 |
| **Angular** | `injectQuery()` 返回 Observable | `queryClient.invalidateQueries(...)` | RxJS 生態，適合大型應用 |
| **Svelte** | `$derived` 自動追蹤 | `queryClient.invalidateQueries(...)` | 語法最簡，store 友善 |

**invalidation 的寫法在四個框架完全相同** ← 這是 TanStack Query 的強項

---

## 七、實戰場景：統計卡片（同一份 queryKey，四個框架）

### React 版本

```tsx
function StatsCard({ channelId }: { channelId: string }) {
  const { data: stats } = useQuery({
    queryKey: eventQueryKeys.byChannel(channelId),
    queryFn: () => fetchStats(channelId),
  });

  return <div>Sold: {stats?.sold}</div>;
}
```

### Vue 版本

```vue
<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';

const props = defineProps<{ channelId: string }>();

const { data: stats } = useQuery({
  queryKey: computed(() => eventQueryKeys.byChannel(props.channelId)),
  queryFn: () => fetchStats(props.channelId),
});
</script>

<template>
  <div>Sold: {{ stats?.sold }}</div>
</template>
```

### Angular 版本

```typescript
@Component({
  selector: 'app-stats-card',
  template: `<div>Sold: {{ (stats$ | async)?.sold }}</div>`,
})
export class StatsCardComponent {
  @Input() channelId: string;

  stats$ = injectQuery(() => ({
    queryKey: eventQueryKeys.byChannel(this.channelId),
    queryFn: () => fetchStats(this.channelId),
  })).data$;
}
```

### Svelte 版本

```svelte
<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';

  export let channelId: string;

  const stats = createQuery({
    queryKey: () => eventQueryKeys.byChannel(channelId),
    queryFn: () => fetchStats(channelId),
  });
</script>

<div>Sold: {$stats.data?.sold}</div>
```

**觀察**：
- **queryKey 定義完全相同** —— 四個框架都是 `eventQueryKeys.byChannel(channelId)`
- **invalidation 寫法相同** —— 全部都是 `queryClient.invalidateQueries(...)`
- **差異只在「怎麼綁定到 component lifecycle」**

---

## 八、遇到的常見坑（四個框架都會踩）

### 坑一：queryKey 沒變，快取沒失效

```tsx
// ❌ 四個框架都會出這個坑
const { data } = useQuery({
  queryKey: ['stats'], // ← filter 改了也是 ['stats']
  queryFn: () => fetchStats(filters),
});
```

**解法**（框架無關）：

```tsx
// ✅
const { data } = useQuery({
  queryKey: ['stats', filters], // ← filters 改，key 也改
  queryFn: () => fetchStats(filters),
});
```

### 坑二：Mutation 後 invalidation 太粗略

```tsx
// ❌ 四個框架都會出
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['stats'] }); // ← 整個 stats 都失效了
};
```

**解法**（框架無關）：

```tsx
// ✅
onSuccess: (response) => {
  queryClient.invalidateQueries({
    queryKey: eventQueryKeys.byChannel(response.channelId),
  });
};
```

### 坑三：React 特有 —— missing dependency

```tsx
// ❌ React only
const filters = useRef(...);

const { data } = useQuery({
  queryKey: ['stats'], // ← queryKey 不涉及 filters
  queryFn: () => fetchStats(filters.current), // ← 但 fn 用了 filters
  // ← 當 filters 改變時，queryKey 沒變，所以不會 refetch
});
```

**解法**（React only）：

```tsx
// ✅
const { data } = useQuery({
  queryKey: ['stats', filters], // ← queryKey 也包含 filters
  queryFn: () => fetchStats(filters),
});
```

### 坑四：Vue 特有 —— computed 沒用 computed()

```vue
<!-- ❌ Vue -->
<script setup lang="ts">
const props = defineProps<{ channelId: string }>();

const { data } = useQuery({
  queryKey: eventQueryKeys.byChannel(props.channelId), // ← 寫了但不是 reactive
  queryFn: () => fetchStats(props.channelId),
});
</script>
```

**解法**（Vue only）：

```vue
<!-- ✅ -->
<script setup lang="ts">
const props = defineProps<{ channelId: string }>();

const { data } = useQuery({
  queryKey: computed(() => eventQueryKeys.byChannel(props.channelId)), // ← 用 computed
  queryFn: () => fetchStats(props.channelId),
});
</script>
```

### 坑五：Angular 特有 —— 忘記取 `data$`

```typescript
// ❌ Angular
const event = injectQuery(() => ({
  queryKey: eventQueryKeys.detail(this.eventId),
  queryFn: () => fetchEvent(this.eventId),
}));

// template 中用 event 會印出整個 query object，不是數據
// <div>{{ event }}</div> ← 爆
```

**解法**（Angular only）：

```typescript
// ✅
const event$ = injectQuery(() => ({
  queryKey: eventQueryKeys.detail(this.eventId),
  queryFn: () => fetchEvent(this.eventId),
})).data$;

// <div>{{ event$ | async }}</div> ← 對
```

---

## 九、最佳實踐（框架無關）

### 模式一：centralized queryKey

```typescript
// 所有框架共用
// src/query-keys.ts
export const queryKeys = {
  events: {
    all: ['events'] as const,
    list: (filters: EventFilter) => [...queryKeys.events.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.events.all, 'detail', id] as const,
  },
  tickets: {
    all: ['tickets'] as const,
    byEvent: (eventId: string) => [...queryKeys.tickets.all, 'event', eventId] as const,
  },
};
```

**優點**：
- 單一真相來源（Single Source of Truth）
- invalidation 時不會拼錯 key
- 跨 component 一致

### 模式二：分層 invalidation

```typescript
// 所有框架共用，以 React 為例
const mutation = useMutation({
  mutationFn: updateEvent,
  onSuccess: (response) => {
    // 1. 失效單筆詳情
    queryClient.invalidateQueries({
      queryKey: queryKeys.events.detail(response.id),
    });

    // 2. 失效所有列表（prefix match）
    queryClient.invalidateQueries({
      queryKey: queryKeys.events.all,
      exact: false,
    });

    // 3. 失效相關票券
    queryClient.invalidateQueries({
      queryKey: queryKeys.tickets.byEvent(response.id),
    });
  },
});
```

### 模式三：環境感知的 staleTime

```typescript
// 所有框架共用
const queryOptions = {
  production: {
    staleTime: 10 * 60 * 1000, // 10 分鐘
    gcTime: 30 * 60 * 1000, // 30 分鐘
  },
  development: {
    staleTime: 0, // 立刻 stale
    gcTime: 60 * 1000, // 1 分鐘
  },
};

// React
const { data } = useQuery({
  queryKey: queryKeys.events.list(filters),
  queryFn: () => fetchEvents(filters),
  ...queryOptions[process.env.NODE_ENV as keyof typeof queryOptions],
});
```

---

## 十、表格速查：框架差異一覽

| 需求 | React | Vue | Angular | Svelte |
|------|-------|-----|---------|--------|
| **基礎查詢** | `useQuery()` | `useQuery()` | `injectQuery()` | `createQuery()` |
| **queryKey 反應式** | 自動 | `computed()` | Observable | `$derived` |
| **在 template 用** | 直接用 | 直接用 | `\| async` | `$` prefix |
| **Mutation** | `useMutation()` | `useMutation()` | `injectMutation()` | `createMutation()` |
| **invalidation** | `queryClient.invalidateQueries()` | 相同 | 相同 | 相同 |
| **最佳 case** | 中小型單頁應用 | 同 React | 大型企業應用 | 最小型輕量應用 |
| **文件品質** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ (新) | ⭐⭐⭐ |
| **生態成熟度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

---

## 十一、Day 25 的教訓在四個框架都適用

回到 Day 25 的 bug 案例（統計卡片不更新），四個框架都會踩同樣的坑：

### Bug：filter 改了卡片沒變

```typescript
// ❌ 四個框架都會出（只改框架語法）
const { data: stats } = useQuery({
  queryKey: ['stats'], // ← filter 改了也還是 ['stats']
  queryFn: () => fetchStats(filters),
});
```

### 修法：框架無關

```typescript
// ✅ 四個框架都一樣
const { data: stats } = useQuery({
  queryKey: ['stats', filters], // ← filters 改了，key 自動變
  queryFn: () => fetchStats(filters),
});
```

**結論**：TanStack Query 最聰明的地方就在這裡 —— **queryKey 本身框架無關，所以最佳實踐也框架無關**。

---

## 資料來源

| 內容 | 連結 | 查證時間 |
|---|---|---|
| TanStack Query 官方文件（React） | https://tanstack.com/query/latest/docs/react/overview | 2026-09-26 |
| TanStack Vue Query | https://tanstack.com/query/latest/docs/vue/overview | 2026-09-26 |
| TanStack Angular Query（實驗性） | https://tanstack.com/query/latest/docs/angular/overview | 2026-09-26 |
| TanStack Svelte Query | https://tanstack.com/query/latest/docs/svelte/overview | 2026-09-26 |
| queryKey 設計最佳實踐 | https://tanstack.com/query/latest/docs/react/important-defaults | 2026-09-26 |
