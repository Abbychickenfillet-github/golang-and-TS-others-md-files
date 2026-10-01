<!--
day25-query-key-svelte-demo.svelte

TanStack Query (Svelte Query) 中的 queryKey 與快取失效
搭配 iThome 鐵人賽 2026 Day 25

執行方式：在 Svelte 項目中引入此 component
環境：Svelte 3+、@tanstack/svelte-query

五個場景演示：
  Part A   queryKey 的本質：為什麼陣列的深度比較是必須的
  Part B   Bug 重現一：filter 改了但卡片沒變
  Part C   Bug 重現二：mutation 後快取沒失效
  Part D   Pattern 示範：怎麼用 queryKey 避免 bug
  Part E   競態條件：搜尋詞連打三次的時序模擬
-->

<script lang="ts">
  import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query'

  // ============================================================
  // 型別定義（跨框架共用）
  // ============================================================

  interface EventFilter {
    status?: string
    channelId?: string
  }

  interface EventData {
    id: string
    name: string
    status: string
  }

  interface StatsData {
    sold: number
    title: string
  }

  // ============================================================
  // QueryKey 定義（跨框架共用）
  // ============================================================

  const queryKeys = {
    events: {
      all: ['events'] as const,
      list: (filters: EventFilter) => [...queryKeys.events.all, 'list', filters] as const,
    },
    stats: {
      all: ['stats'] as const,
      byFilter: (filters: EventFilter) => [...queryKeys.stats.all, 'byFilter', filters] as const,
    },
  }

  // ============================================================
  // 模擬 API
  // ============================================================

  const fetchEvents = async (filters: EventFilter): Promise<EventData[]> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    if (filters.status === 'completed') {
      return [
        { id: '1', name: 'Event A', status: 'completed' },
        { id: '2', name: 'Event B', status: 'completed' },
      ]
    }
    return [
      { id: '1', name: 'Event A', status: 'pending' },
      { id: '2', name: 'Event B', status: 'pending' },
      { id: '3', name: 'Event C', status: 'completed' },
    ]
  }

  const fetchStats = async (filters: EventFilter): Promise<StatsData> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    if (filters.status === 'completed') {
      return { sold: 45, title: 'completed events' }
    }
    return { sold: 120, title: 'all events' }
  }

  const updateEvent = async (eventId: string, data: Partial<EventData>) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { id: eventId, ...data }
  }

  // ============================================================
  // Component State
  // ============================================================

  let currentDemo: 'buggy' | 'fixed' | 'mutation' | 'patterns' = 'buggy'

  // Demo 1: Buggy - filter 改了但卡片沒變
  let buggyFilters: EventFilter = { status: 'all' }

  const buggyQuery = createQuery({
    queryKey: ['stats'], // ❌ 永遠都是這個
    queryFn: () => fetchStats(buggyFilters),
  })

  // Demo 2: Fixed - 把 filter 放進 queryKey
  let fixedFilters: EventFilter = { status: 'all' }

  const fixedQuery = createQuery({
    queryKey: $derived([queryKeys.stats.byFilter(fixedFilters)]), // ✅ filter 改，key 也改
    queryFn: () => fetchStats(fixedFilters),
  })

  // Demo 3: Mutation + Invalidation
  let eventToUpdate: Partial<EventData> = { id: 'event-1', status: '' }
  const queryClient = useQueryClient()

  const updateMutation = createMutation({
    mutationFn: () => updateEvent(eventToUpdate.id!, eventToUpdate),
    onSuccess: () => {
      // ✅ 只失效相關的 stats，不是全部
      queryClient.invalidateQueries({
        queryKey: queryKeys.stats.all,
        exact: false,
      })
    },
  })

  // Demo 4: 搜尋詞競態條件
  let searchTerm = ''
  let enabled = $derived(searchTerm.length > 0)

  const searchQuery = createQuery({
    queryKey: $derived([queryKeys.events.list({ status: searchTerm })]), // ✅ 搜尋詞改，key 也改
    queryFn: () => fetchEvents({ status: searchTerm }),
    enabled,
  })

  // ============================================================
  // Event Handlers
  // ============================================================

  const handleBuggyFilterChange = (status: string) => {
    buggyFilters = { status }
  }

  const handleFixedFilterChange = (status: string) => {
    fixedFilters = { status }
  }

  const handleSearchChange = (value: string) => {
    searchTerm = value
  }

  const handleUpdateEvent = () => {
    $updateMutation.mutate({})
  }
</script>

<div class="svelte-demo">
  <h1>Day 25 — Svelte Query 中的 queryKey 與快取失效</h1>

  <!-- Demo 選擇 -->
  <div class="demo-selector">
    <button
      class:active={currentDemo === 'buggy'}
      on:click={() => (currentDemo = 'buggy')}
    >
      ❌ Bug 版本
    </button>
    <button
      class:active={currentDemo === 'fixed'}
      on:click={() => (currentDemo = 'fixed')}
    >
      ✅ 修復版本
    </button>
    <button
      class:active={currentDemo === 'mutation'}
      on:click={() => (currentDemo = 'mutation')}
    >
      Mutation 示範
    </button>
    <button
      class:active={currentDemo === 'patterns'}
      on:click={() => (currentDemo = 'patterns')}
    >
      Pattern 展示
    </button>
  </div>

  <!-- Demo 1: Buggy -->
  {#if currentDemo === 'buggy'}
    <section class="demo-section">
      <h2>❌ Bug 重現：filter 改了但卡片沒變</h2>
      <div class="explanation">
        <p>
          代碼中 queryKey 是 <code>['stats']</code>，filter 改了但 key 沒變，所以快取系統不知道有新問題。
        </p>
      </div>

      <div class="controls">
        <button on:click={() => handleBuggyFilterChange('all')}>Show All</button>
        <button on:click={() => handleBuggyFilterChange('completed')}>Show Completed</button>
      </div>

      <div class="results">
        <p><strong>當前 filter:</strong> {buggyFilters.status}</p>
        <p><strong>快取數據 (不會改變):</strong> {$buggyQuery.data?.title} - 已售: {$buggyQuery.data?.sold}</p>
        <p class="warning">⚠️ 即使改了 filter，顯示的數字也不會更新（因為 queryKey 沒變）</p>
      </div>
    </section>
  {/if}

  <!-- Demo 2: Fixed -->
  {#if currentDemo === 'fixed'}
    <section class="demo-section">
      <h2>✅ 修復：把 filter 放進 queryKey</h2>
      <div class="explanation">
        <p>
          代碼中 queryKey 是 <code>$derived([queryKeys.stats.byFilter(fixedFilters)])</code>，filter 改了，key 也改，快取自動失效。
        </p>
      </div>

      <div class="controls">
        <button on:click={() => handleFixedFilterChange('all')}>Show All</button>
        <button on:click={() => handleFixedFilterChange('completed')}>Show Completed</button>
      </div>

      <div class="results">
        {#if $fixedQuery.isPending}
          <p class="loading">⏳ 載入中...</p>
        {:else}
          <p><strong>當前 filter:</strong> {fixedFilters.status}</p>
          <p><strong>快取數據 (會隨 filter 更新):</strong> {$fixedQuery.data?.title} - 已售: {$fixedQuery.data?.sold}</p>
          <p class="success">✅ Filter 改了，數字立刻更新！</p>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Demo 3: Mutation -->
  {#if currentDemo === 'mutation'}
    <section class="demo-section">
      <h2>Mutation + Invalidation</h2>
      <div class="explanation">
        <p>修改事件後，使用 <code>invalidateQueries</code> 失效相關的快取。</p>
      </div>

      <div class="controls">
        <input
          bind:value={eventToUpdate.status}
          type="text"
          placeholder="New Status"
        />
        <button
          on:click={handleUpdateEvent}
          disabled={$updateMutation.isPending}
        >
          {$updateMutation.isPending ? 'Updating...' : 'Update Event'}
        </button>
      </div>

      <div class="results">
        <p><strong>Event ID:</strong> {eventToUpdate.id}</p>
        <p><strong>New Status:</strong> {eventToUpdate.status}</p>
        <p class="success">✅ Mutation 成功後，stats 快取會自動失效並重新 fetch</p>
      </div>
    </section>
  {/if}

  <!-- Demo 4: 搜尋詞競態條件 -->
  {#if currentDemo === 'patterns'}
    <section class="demo-section">
      <h2>搜尋詞競態條件</h2>
      <div class="explanation">
        <p>快速改變搜尋詞時，queryKey 的自動分化會避免競態條件。</p>
      </div>

      <div class="controls">
        <input
          value={searchTerm}
          on:input={e => handleSearchChange(e.currentTarget.value)}
          type="text"
          placeholder="搜尋... (try 'completed')"
        />
      </div>

      <div class="results">
        {#if $searchQuery.isPending}
          <p class="loading">⏳ 搜尋中...</p>
        {:else if $searchQuery.data && $searchQuery.data.length > 0}
          <p><strong>搜尋: "{searchTerm}"</strong></p>
          <ul>
            {#each $searchQuery.data as event (event.id)}
              <li>{event.name} ({event.status})</li>
            {/each}
          </ul>
          <p class="success">✅ queryKey 會自動分化，不會有搜尋詞亂套的情況</p>
        {:else if searchTerm}
          <p class="warning">沒有結果</p>
        {:else}
          <p class="info">輸入搜尋詞來開始...</p>
        {/if}
      </div>
    </section>
  {/if}
</div>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0;
    padding: 0;
    background: #f5f5f5;
  }

  .svelte-demo {
    max-width: 900px;
    margin: 0 auto;
    padding: 20px;
  }

  h1 {
    color: #333;
    margin-bottom: 30px;
  }

  h2 {
    color: #555;
    font-size: 1.3em;
    margin-top: 20px;
  }

  .demo-selector {
    display: flex;
    gap: 10px;
    margin-bottom: 30px;
    flex-wrap: wrap;
  }

  .demo-selector button {
    padding: 8px 16px;
    border: 2px solid #ddd;
    background: #f5f5f5;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .demo-selector button:hover {
    border-color: #0066cc;
    background: #e6f2ff;
  }

  .demo-selector button.active {
    border-color: #0066cc;
    background: #0066cc;
    color: white;
  }

  .demo-section {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    background: #fafafa;
  }

  .explanation {
    background: #f0f7ff;
    padding: 12px;
    border-left: 4px solid #0066cc;
    margin-bottom: 20px;
    border-radius: 4px;
  }

  .explanation p {
    margin: 0;
    color: #333;
    line-height: 1.6;
  }

  code {
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
  }

  .controls {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .controls button {
    padding: 10px 16px;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.95em;
    transition: background 0.3s;
  }

  .controls button:hover {
    background: #0052a3;
  }

  .controls button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .controls input {
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.95em;
    flex: 1;
    min-width: 200px;
  }

  .results {
    background: white;
    padding: 15px;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
  }

  .results p {
    margin: 10px 0;
    color: #555;
  }

  .results ul {
    list-style: none;
    padding: 0;
    margin: 10px 0;
  }

  .results li {
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
    color: #666;
  }

  .results li:last-child {
    border-bottom: none;
  }

  .loading {
    color: #ff9800;
    font-weight: bold;
  }

  .success {
    color: #4caf50;
    font-weight: bold;
  }

  .warning {
    color: #f44336;
    font-weight: bold;
  }

  .info {
    color: #666;
    font-style: italic;
  }

  strong {
    color: #333;
  }
</style>
