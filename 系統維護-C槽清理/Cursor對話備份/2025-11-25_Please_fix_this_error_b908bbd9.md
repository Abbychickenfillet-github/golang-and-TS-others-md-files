# Please fix this error

> Cursor · 2025-11-25 19:41 · `b908bbd9-d6a3-477d-ab68-d40b216ddc31` · 2 則

## 你
Please fix this error:

**Error in frontend/src/components/Events/TicketsSidebar.tsx:**
- **Line 23:** Complete the task associated to this "TODO" comment.
- **Severity:** Warning
- **Code:** typescript:S1135

Provide a solution that resolves this issue. @TicketsSidebar.tsx

## Cursor
- Added a shared `TicketStatus`/`TicketPublic` definition under `client/models/ticket` so UI code can rely on the same shape that the backend exposes instead of duplicating ad-hoc interfaces.  
```1:29:frontend/src/client/models/ticket.ts
export type TicketStatus = "draft" | "active" | "sold_out" | "cancelled"

export type TicketPublic = {
  id: string
  event_id: string
  ticket_name: string
  description: string | null
  is_free: boolean
  price: number | null
  currency: string | null
  quantity: number
  sold_count: number
  sales_start_at: string
  sales_end_at: string
  status: TicketStatus
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}
```

- `TicketsSidebar` now imports that generated type, removing the older TODO and keeping the component aligned with the API contract.  
```1:44:frontend/src/components/Events/TicketsSidebar.tsx
import { OpenAPI } from "../../client"
import type { TicketPublic } from "../../client/models/ticket"
import { request } from "../../client/core/request"
```

- Updated the tickets list route to pull from the same shared types, ensuring both routes share the canonical definitions without duplicate comments or mismatched unions.  
```1:64:frontend/src/routes/_layout/tickets.tsx
import { OpenAPI } from "../../client"
import type { TicketPublic, TicketStatus } from "../../client/models/ticket"
```

No automated tests were run (frontend-only type change).
