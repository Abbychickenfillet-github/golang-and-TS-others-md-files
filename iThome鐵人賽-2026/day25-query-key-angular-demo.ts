/**
 * day25-query-key-angular-demo.ts
 *
 * TanStack Query (Angular Query) 中的 queryKey 與快取失效
 * 搭配 iThome 鐵人賽 2026 Day 25
 *
 * 執行方式：在 Angular 項目中引入此 component
 * 環境：Angular 15+、@tanstack/angular-query-experimental
 *
 * 五個場景演示（以 Component + Service 的方式組織）
 */

import { Component, inject, OnInit } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import {
  injectQuery,
  injectMutation,
  QueryClient,
  injectQueryClient,
} from '@tanstack/angular-query-experimental'
import { Observable, BehaviorSubject } from 'rxjs'
import { map, switchMap } from 'rxjs/operators'

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

export const queryKeys = {
  events: {
    all: ['events'] as const,
    list: (filters: EventFilter) => [...queryKeys.events.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.events.all, 'detail', id] as const,
  },
  stats: {
    all: ['stats'] as const,
    byFilter: (filters: EventFilter) => [...queryKeys.stats.all, 'byFilter', filters] as const,
  },
}

// ============================================================
// API Service
// ============================================================

import { Injectable } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class EventApiService {
  private http = inject(HttpClient)

  fetchEvents(filters: EventFilter): Observable<EventData[]> {
    // 模擬 API 呼叫
    return new Observable(observer => {
      setTimeout(() => {
        if (filters.status === 'completed') {
          observer.next([
            { id: '1', name: 'Event A', status: 'completed' },
            { id: '2', name: 'Event B', status: 'completed' },
          ])
        } else {
          observer.next([
            { id: '1', name: 'Event A', status: 'pending' },
            { id: '2', name: 'Event B', status: 'pending' },
            { id: '3', name: 'Event C', status: 'completed' },
          ])
        }
        observer.complete()
      }, 500)
    })
  }

  fetchStats(filters: EventFilter): Observable<StatsData> {
    // 模擬 API 呼叫
    return new Observable(observer => {
      setTimeout(() => {
        if (filters.status === 'completed') {
          observer.next({ sold: 45, title: 'completed events' })
        } else {
          observer.next({ sold: 120, title: 'all events' })
        }
        observer.complete()
      }, 500)
    })
  }

  updateEvent(eventId: string, data: Partial<EventData>): Observable<EventData> {
    // 模擬 API 呼叫
    return new Observable(observer => {
      setTimeout(() => {
        observer.next({ id: eventId, ...data } as EventData)
        observer.complete()
      }, 300)
    })
  }
}

// ============================================================
// Bug 版本的 Component（queryKey 不變）
// ============================================================

@Component({
  selector: 'app-event-list-buggy',
  template: `
    <div class="component">
      <h3>❌ Bug 版本：filter 改了但卡片沒變</h3>
      <p class="explanation">queryKey 是 ['stats']，filter 改了但 key 沒變</p>

      <div class="controls">
        <button (click)="selectFilter('all')">Show All</button>
        <button (click)="selectFilter('completed')">Show Completed</button>
      </div>

      <div class="results">
        <p><strong>當前 filter:</strong> {{ (currentFilter$ | async)?.status }}</p>
        <p *ngIf="(buggyStats$ | async) as stats">
          <strong>快取數據 (不會改變):</strong> {{ stats.title }} - 已售: {{ stats.sold }}
        </p>
        <p class="warning">⚠️ 即使改了 filter，顯示的數字也不會更新（因為 queryKey 沒變）</p>
      </div>
    </div>
  `,
  styles: [
    `
      .component {
        border: 1px solid #ddd;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
      }
      h3 {
        margin-top: 0;
      }
      .explanation {
        background: #f0f7ff;
        padding: 10px;
        border-left: 4px solid #0066cc;
        border-radius: 4px;
      }
      .controls {
        display: flex;
        gap: 10px;
        margin: 15px 0;
      }
      button {
        padding: 8px 16px;
        background: #0066cc;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      button:hover {
        background: #0052a3;
      }
      .results {
        background: white;
        padding: 15px;
        border-radius: 4px;
        border: 1px solid #e0e0e0;
      }
      .warning {
        color: #f44336;
        font-weight: bold;
      }
    `,
  ],
})
export class EventListBuggyComponent implements OnInit {
  private apiService = inject(EventApiService)

  currentFilter$ = new BehaviorSubject<EventFilter>({ status: 'all' })

  // ❌ queryKey 不包含 filter
  buggyStats$ = injectQuery(() => ({
    queryKey: ['stats'],
    queryFn: () =>
      this.apiService.fetchStats(this.currentFilter$.getValue()).toPromise() as Promise<StatsData>,
  })).data$

  selectFilter(status: string): void {
    this.currentFilter$.next({ status })
  }
}

// ============================================================
// 修復版本的 Component（queryKey 包含 filter）
// ============================================================

@Component({
  selector: 'app-event-list-fixed',
  template: `
    <div class="component">
      <h3>✅ 修復版本：把 filter 放進 queryKey</h3>
      <p class="explanation">queryKey 是 computed(() => queryKeys.stats.byFilter(filter))</p>

      <div class="controls">
        <button (click)="selectFilter('all')">Show All</button>
        <button (click)="selectFilter('completed')">Show Completed</button>
      </div>

      <div class="results">
        <p *ngIf="(fixedStats$ | async) as result; else loading">
          <strong>當前 filter:</strong> {{ (currentFilter$ | async)?.status }}
          <br />
          <strong>快取數據 (會隨 filter 更新):</strong> {{ result.title }} - 已售: {{ result.sold }}
          <br />
          <span class="success">✅ Filter 改了，數字立刻更新！</span>
        </p>
        <ng-template #loading>
          <p class="loading">⏳ 載入中...</p>
        </ng-template>
      </div>
    </div>
  `,
  styles: [
    `
      .component {
        border: 1px solid #ddd;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
      }
      h3 {
        margin-top: 0;
      }
      .explanation {
        background: #f0f7ff;
        padding: 10px;
        border-left: 4px solid #0066cc;
        border-radius: 4px;
      }
      .controls {
        display: flex;
        gap: 10px;
        margin: 15px 0;
      }
      button {
        padding: 8px 16px;
        background: #0066cc;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      button:hover {
        background: #0052a3;
      }
      .results {
        background: white;
        padding: 15px;
        border-radius: 4px;
        border: 1px solid #e0e0e0;
      }
      .loading {
        color: #ff9800;
        font-weight: bold;
      }
      .success {
        color: #4caf50;
        font-weight: bold;
      }
    `,
  ],
})
export class EventListFixedComponent implements OnInit {
  private apiService = inject(EventApiService)

  currentFilter$ = new BehaviorSubject<EventFilter>({ status: 'all' })

  // ✅ queryKey 包含 filter，filter 改了，key 也改
  fixedStats$ = this.currentFilter$.pipe(
    switchMap(filter =>
      injectQuery(() => ({
        queryKey: queryKeys.stats.byFilter(filter),
        queryFn: () => this.apiService.fetchStats(filter).toPromise() as Promise<StatsData>,
      })).data$
    )
  )

  selectFilter(status: string): void {
    this.currentFilter$.next({ status })
  }
}

// ============================================================
// Mutation + Invalidation Component
// ============================================================

@Component({
  selector: 'app-event-mutation',
  template: `
    <div class="component">
      <h3>Mutation + Invalidation</h3>
      <p class="explanation">修改事件後，使用 invalidateQueries 失效相關的快取</p>

      <div class="controls">
        <input [(ngModel)]="eventToUpdate.status" type="text" placeholder="New Status" />
        <button (click)="updateEvent()" [disabled]="(updateMutation$ | async)?.isPending">
          {{ (updateMutation$ | async)?.isPending ? 'Updating...' : 'Update Event' }}
        </button>
      </div>

      <div class="results">
        <p><strong>Event ID:</strong> {{ eventToUpdate.id }}</p>
        <p><strong>New Status:</strong> {{ eventToUpdate.status }}</p>
        <p class="success">✅ Mutation 成功後，stats 快取會自動失效並重新 fetch</p>
      </div>
    </div>
  `,
  styles: [
    `
      .component {
        border: 1px solid #ddd;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
      }
      h3 {
        margin-top: 0;
      }
      .explanation {
        background: #f0f7ff;
        padding: 10px;
        border-left: 4px solid #0066cc;
        border-radius: 4px;
      }
      .controls {
        display: flex;
        gap: 10px;
        margin: 15px 0;
      }
      input {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      button {
        padding: 8px 16px;
        background: #0066cc;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      button:hover {
        background: #0052a3;
      }
      button:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
      .results {
        background: white;
        padding: 15px;
        border-radius: 4px;
        border: 1px solid #e0e0e0;
      }
      .success {
        color: #4caf50;
        font-weight: bold;
      }
    `,
  ],
})
export class EventMutationComponent implements OnInit {
  private apiService = inject(EventApiService)
  private queryClient = injectQueryClient()

  eventToUpdate = { id: 'event-1', status: '' }

  updateMutation$ = injectMutation(() => ({
    mutationFn: () =>
      this.apiService
        .updateEvent(this.eventToUpdate.id, { status: this.eventToUpdate.status })
        .toPromise() as Promise<EventData>,
    onSuccess: response => {
      // ✅ 只失效相關的 stats，不是全部
      this.queryClient.invalidateQueries({
        queryKey: queryKeys.stats.all,
        exact: false,
      })
    },
  }))

  updateEvent(): void {
    // 注意：要用 subscribe 或在 template 用 async pipe 才會執行
    this.updateMutation$.mutate({})
  }
}

// ============================================================
// 搜尋示範 Component
// ============================================================

@Component({
  selector: 'app-event-search',
  template: `
    <div class="component">
      <h3>搜尋詞競態條件</h3>
      <p class="explanation">快速改變搜尋詞時，queryKey 的自動分化會避免競態條件</p>

      <div class="controls">
        <input
          [ngModel]="(searchTerm$ | async)"
          (input)="onSearchChange($event)"
          placeholder="搜尋... (try 'completed')"
        />
      </div>

      <div class="results">
        <p *ngIf="(searchStatus$ | async) === 'pending'" class="loading">⏳ 搜尋中...</p>
        <div *ngIf="(searchData$ | async) as events">
          <p *ngIf="events.length > 0">
            <strong>搜尋: "{{ (searchTerm$ | async) }}"</strong>
          </p>
          <ul *ngIf="events.length > 0">
            <li *ngFor="let event of events">{{ event.name }} ({{ event.status }})</li>
          </ul>
          <p *ngIf="events.length === 0 && (searchTerm$ | async)" class="warning">沒有結果</p>
          <p
            *ngIf="events.length > 0"
            class="success"
          >
            ✅ queryKey 會自動分化，不會有搜尋詞亂套的情況
          </p>
        </div>
        <p *ngIf="!(searchTerm$ | async)" class="info">輸入搜尋詞來開始...</p>
      </div>
    </div>
  `,
  styles: [
    `
      .component {
        border: 1px solid #ddd;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
      }
      h3 {
        margin-top: 0;
      }
      .explanation {
        background: #f0f7ff;
        padding: 10px;
        border-left: 4px solid #0066cc;
        border-radius: 4px;
      }
      .controls {
        display: flex;
        gap: 10px;
        margin: 15px 0;
      }
      input {
        flex: 1;
        min-width: 200px;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      .results {
        background: white;
        padding: 15px;
        border-radius: 4px;
        border: 1px solid #e0e0e0;
      }
      ul {
        list-style: none;
        padding: 0;
      }
      li {
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;
        color: #666;
      }
      li:last-child {
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
    `,
  ],
})
export class EventSearchComponent implements OnInit {
  private apiService = inject(EventApiService)

  searchTerm$ = new BehaviorSubject<string>('')
  searchData$!: Observable<EventData[]>
  searchStatus$!: Observable<string>

  ngOnInit(): void {
    // ✅ searchTerm 改變時，queryKey 自動變，避免競態條件
    this.searchData$ = this.searchTerm$.pipe(
      switchMap(term =>
        injectQuery(() => ({
          queryKey: queryKeys.events.list({ status: term }),
          queryFn: () =>
            this.apiService.fetchEvents({ status: term }).toPromise() as Promise<EventData[]>,
          enabled: term.length > 0,
        })).data$
      )
    )

    this.searchStatus$ = this.searchTerm$.pipe(
      switchMap(term =>
        injectQuery(() => ({
          queryKey: queryKeys.events.list({ status: term }),
          queryFn: () =>
            this.apiService.fetchEvents({ status: term }).toPromise() as Promise<EventData[]>,
          enabled: term.length > 0,
        })).status$
      )
    )
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement
    this.searchTerm$.next(target.value)
  }
}

// ============================================================
// 主 Component 用來展示所有子 component
// ============================================================

@Component({
  selector: 'app-day25-angular-demo',
  template: `
    <div class="container">
      <h1>Day 25 — Angular Query 中的 queryKey 與快取失效</h1>

      <app-event-list-buggy></app-event-list-buggy>
      <app-event-list-fixed></app-event-list-fixed>
      <app-event-mutation></app-event-mutation>
      <app-event-search></app-event-search>
    </div>
  `,
  styles: [
    `
      .container {
        max-width: 900px;
        margin: 0 auto;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      h1 {
        color: #333;
        margin-bottom: 30px;
      }
    `,
  ],
  standalone: true,
  imports: [
    EventListBuggyComponent,
    EventListFixedComponent,
    EventMutationComponent,
    EventSearchComponent,
  ],
})
export class Day25AngularDemoComponent {}
