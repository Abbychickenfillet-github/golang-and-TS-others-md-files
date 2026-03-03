# 活動品牌商審核 + 封鎖功能 — 全端實作計畫

## Context

品牌商 (vendor) 目前可直接購買攤位，缺少活動層級的審核流程。需要：
1. **活動品牌商審核** — 主辦可啟用 `require_vendor_review`，品牌商須經審核才能購買攤位
2. **活動品牌商封鎖（公司）** — 主辦可封鎖特定品牌商公司，禁止其參加該活動
3. **活動會員封鎖（個人）** — 主辦可封鎖特定會員個人，禁止其參加該活動

**前端整合位置**：在活動管理頁面 `events.tsx` 每個活動的 Tabs 中，新增 3 個 tab：「申請名單」「已封鎖公司」「已封鎖會員」

SQL 建表由使用者手動在 stage/prod 執行，不用 AutoMigrate。

---

## Step 1: Model 層（3 新建 + 1 修改）

### 1a. 新建 `backend-go/internal/models/event_company_review.go`

```go
package models

import "time"

// 活動品牌商審核狀態常數
const (
	EventCompanyReviewStatusPending  = "pending"
	EventCompanyReviewStatusApproved = "approved"
	EventCompanyReviewStatusRejected = "rejected"
)

// EventCompanyReview 活動品牌商審核記錄
type EventCompanyReview struct {
	Base
	EventID       string     `gorm:"type:varchar(36);not null;uniqueIndex:uk_event_company_review,priority:1;index:idx_ecr_event" json:"event_id"`
	CompanyID     string     `gorm:"type:varchar(36);not null;uniqueIndex:uk_event_company_review,priority:2;index:idx_ecr_company" json:"company_id"`
	Status        string     `gorm:"type:varchar(20);not null;default:'pending';index:idx_ecr_status;comment:審核狀態 (pending/approved/rejected)" json:"status"`
	ReviewComment *string    `gorm:"type:varchar(500);comment:審核意見" json:"review_comment"`
	ReviewedBy    *string    `gorm:"type:varchar(36);comment:審核人 member ID" json:"reviewed_by"`
	ReviewedAt    *time.Time `gorm:"type:datetime;comment:審核時間" json:"reviewed_at"`

	// 關聯（使用 constraint:- 避免 GORM 自動建立外鍵）
	Event   *Event   `gorm:"foreignKey:EventID;constraint:-" json:"event,omitempty"`
	Company *Company `gorm:"foreignKey:CompanyID;constraint:-" json:"company,omitempty"`
}

// TableName 指定資料表名稱
func (EventCompanyReview) TableName() string {
	return "event_company_review"
}
```

### 1b. 新建 `backend-go/internal/models/event_company_block.go`

```go
package models

// EventCompanyBlock 活動品牌商封鎖記錄（封鎖公司）
type EventCompanyBlock struct {
	Base
	EventID         string  `gorm:"type:varchar(36);not null;uniqueIndex:uk_event_company_block,priority:1;index:idx_ecb_event" json:"event_id"`
	CompanyID       string  `gorm:"type:varchar(36);not null;uniqueIndex:uk_event_company_block,priority:2;index:idx_ecb_company" json:"company_id"`
	BlockedMemberID *string `gorm:"type:varchar(36);index:idx_ecb_blocked_member;comment:被封鎖的會員 ID（若是針對公司內特定會員）" json:"blocked_member_id"`
	Reason          *string `gorm:"type:varchar(500);comment:封鎖原因" json:"reason"`
	BlockedBy       string  `gorm:"type:varchar(36);not null;comment:執行封鎖的 member ID" json:"blocked_by"`

	Event   *Event   `gorm:"foreignKey:EventID;constraint:-" json:"event,omitempty"`
	Company *Company `gorm:"foreignKey:CompanyID;constraint:-" json:"company,omitempty"`
	BlockedMember *Member `gorm:"foreignKey:BlockedMemberID;constraint:-" json:"blocked_member,omitempty"`
}

func (EventCompanyBlock) TableName() string {
	return "event_company_block"
}
```

### 1c. 新建 `backend-go/internal/models/event_member_block.go`

```go
package models

// EventMemberBlock 活動會員封鎖記錄（封鎖個人）
type EventMemberBlock struct {
	Base
	EventID   string  `gorm:"type:varchar(36);not null;uniqueIndex:uk_event_member_block,priority:1;index:idx_emb_event" json:"event_id"`
	MemberID  string  `gorm:"type:varchar(36);not null;uniqueIndex:uk_event_member_block,priority:2;index:idx_emb_member" json:"member_id"`
	Reason    *string `gorm:"type:varchar(500);comment:封鎖原因" json:"reason"`
	BlockedBy string  `gorm:"type:varchar(36);not null;comment:執行封鎖的 member ID" json:"blocked_by"`

	Event         *Event  `gorm:"foreignKey:EventID;constraint:-" json:"event,omitempty"`
	BlockedMember *Member `gorm:"foreignKey:MemberID;constraint:-" json:"blocked_member,omitempty"`
}

func (EventMemberBlock) TableName() string {
	return "event_member_block"
}
```

**SQL 建表（手動執行）：**
```sql
CREATE TABLE `event_member_block` (
  `id`          VARCHAR(36)   NOT NULL COMMENT 'UUID 主鍵',
  `event_id`    VARCHAR(36)   NOT NULL COMMENT '活動 ID',
  `member_id`   VARCHAR(36)   NOT NULL COMMENT '被封鎖的會員 ID',
  `reason`      VARCHAR(500)  NULL     COMMENT '封鎖原因',
  `blocked_by`  VARCHAR(36)   NOT NULL COMMENT '執行封鎖的 member ID',
  `created_at`  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at`  DATETIME(6)   NULL     COMMENT '軟刪除（解除封鎖）',
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_event_member_block` (`event_id`, `member_id`, `deleted_at`),
  INDEX `idx_emb_event`   (`event_id`),
  INDEX `idx_emb_member`  (`member_id`),
  INDEX `idx_emb_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='活動會員封鎖表';
```

**`event_company_block` 表也要加欄位：**
```sql
ALTER TABLE `event_company_block`
  ADD COLUMN `blocked_member_id` VARCHAR(36) NULL
  COMMENT '被封鎖的會員 ID（若是針對公司內特定會員）'
  AFTER `company_id`,
  ADD INDEX `idx_ecb_blocked_member` (`blocked_member_id`);
```

### 1d. 修改 `backend-go/internal/models/event.go` (L99, IsFeatured 後)

```go
RequireVendorReview bool `gorm:"type:tinyint(1);not null;default:0;comment:是否需要品牌商審核才能參加活動" json:"require_vendor_review"`
```

---

## Step 2: DTO 層（3 新建 + 1 修改）

### 2a. 新建 `backend-go/internal/dto/event_company_review.go`

```go
package dto

import "time"

// CreateEventCompanyReviewRequest 品牌商申請加入活動
type CreateEventCompanyReviewRequest struct {
	EventID   string `json:"event_id" binding:"required"`
	CompanyID string `json:"company_id" binding:"required"`
}

// ReviewEventCompanyRequest 主辦審核品牌商
type ReviewEventCompanyRequest struct {
	Status        string  `json:"status" binding:"required,oneof=approved rejected"`
	ReviewComment *string `json:"review_comment"`
}

// EventCompanyReviewResponse 審核記錄回應
type EventCompanyReviewResponse struct {
	ID            string     `json:"id"`
	EventID       string     `json:"event_id"`
	CompanyID     string     `json:"company_id"`
	Status        string     `json:"status"`
	ReviewComment *string    `json:"review_comment,omitempty"`
	ReviewedBy    *string    `json:"reviewed_by,omitempty"`
	ReviewedAt    *time.Time `json:"reviewed_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	// 關聯欄位（透過 Preload 取得，避免 N+1）
	CompanyName *string `json:"company_name,omitempty"`
	BrandName   *string `json:"brand_name,omitempty"`
	EventName   *string `json:"event_name,omitempty"`
}

// EventCompanyReviewListResponse 審核列表回應
type EventCompanyReviewListResponse struct {
	Data  []EventCompanyReviewResponse `json:"data"`
	Count int64                        `json:"count"`
}
```

### 2b. 新建 `backend-go/internal/dto/event_company_block.go`

```go
package dto

import "time"

// CreateEventCompanyBlockRequest 封鎖品牌商公司請求
type CreateEventCompanyBlockRequest struct {
	EventID         string  `json:"event_id" binding:"required"`
	CompanyID       string  `json:"company_id" binding:"required"`
	BlockedMemberID *string `json:"blocked_member_id"`
	Reason          *string `json:"reason"`
}

// EventCompanyBlockResponse 封鎖記錄回應
type EventCompanyBlockResponse struct {
	ID              string    `json:"id"`
	EventID         string    `json:"event_id"`
	CompanyID       string    `json:"company_id"`
	BlockedMemberID *string   `json:"blocked_member_id,omitempty"`
	Reason          *string   `json:"reason,omitempty"`
	BlockedBy       string    `json:"blocked_by"`
	CreatedAt       time.Time `json:"created_at"`
	// 關聯欄位（透過 Preload 取得，避免 N+1）
	CompanyName       *string `json:"company_name,omitempty"`
	BrandName         *string `json:"brand_name,omitempty"`
	EventName         *string `json:"event_name,omitempty"`
	BlockedMemberName *string `json:"blocked_member_name,omitempty"`
}

// EventCompanyBlockListResponse 封鎖列表回應
type EventCompanyBlockListResponse struct {
	Data  []EventCompanyBlockResponse `json:"data"`
	Count int64                       `json:"count"`
}
```

### 2c. 新建 `backend-go/internal/dto/event_member_block.go`

```go
package dto

import "time"

// CreateEventMemberBlockRequest 封鎖會員個人請求
type CreateEventMemberBlockRequest struct {
	EventID  string  `json:"event_id" binding:"required"`
	MemberID string  `json:"member_id" binding:"required"`
	Reason   *string `json:"reason"`
}

// EventMemberBlockResponse 會員封鎖記錄回應
type EventMemberBlockResponse struct {
	ID        string    `json:"id"`
	EventID   string    `json:"event_id"`
	MemberID  string    `json:"member_id"`
	Reason    *string   `json:"reason,omitempty"`
	BlockedBy string    `json:"blocked_by"`
	CreatedAt time.Time `json:"created_at"`
	// 關聯欄位（透過 Preload 取得，避免 N+1）
	MemberName  *string `json:"member_name,omitempty"`
	MemberEmail *string `json:"member_email,omitempty"`
	EventName   *string `json:"event_name,omitempty"`
}

// EventMemberBlockListResponse 會員封鎖列表回應
type EventMemberBlockListResponse struct {
	Data  []EventMemberBlockResponse `json:"data"`
	Count int64                      `json:"count"`
}
```

### 2d. 修改 `backend-go/internal/dto/event.go`

在以下位置加入 `RequireVendorReview`：
- **EventPublic** (L26, IsFeatured 後): `RequireVendorReview bool \`json:"require_vendor_review"\``
- **EventConsumerPublic** (L71, IsFeatured 後): 同上
- **EventCreate** (L108 末尾): `RequireVendorReview *bool \`json:"require_vendor_review,omitempty"\``
- **EventUpdate** (L136 末尾): `RequireVendorReview *bool \`json:"require_vendor_review,omitempty"\``

---

## Step 3: Repository 層 — GORM 語法 + 避免 N+1（3 新建）

### 3a. 新建 `backend-go/internal/repository/event_company_review_repository.go`

**重點：使用 `Preload("Event").Preload("Company")` 避免 N+1 問題**

```go
package repository

import (
	"context"
	"errors"

	"github.com/yutuo-tech/futuresign_backend/internal/models"
	"gorm.io/gorm"
)

// EventCompanyReviewRepository 活動品牌商審核資料存取介面
type EventCompanyReviewRepository interface {
	Create(ctx context.Context, review *models.EventCompanyReview) error
	GetByID(ctx context.Context, id string) (*models.EventCompanyReview, error)
	GetByEventAndCompany(ctx context.Context, eventID, companyID string) (*models.EventCompanyReview, error)
	GetByEventID(ctx context.Context, eventID string, status *string, skip, limit int) ([]*models.EventCompanyReview, int64, error)
	GetByCompanyID(ctx context.Context, companyID string, skip, limit int) ([]*models.EventCompanyReview, int64, error)
	Update(ctx context.Context, review *models.EventCompanyReview) error
	SoftDelete(ctx context.Context, id string) error
	GetDB() *gorm.DB
}

type eventCompanyReviewRepository struct {
	db *gorm.DB
}

func NewEventCompanyReviewRepository(db *gorm.DB) EventCompanyReviewRepository {
	return &eventCompanyReviewRepository{db: db}
}

// GetByID 透過 ID 查詢審核記錄（Preload 避免 N+1）
func (r *eventCompanyReviewRepository) GetByID(ctx context.Context, id string) (*models.EventCompanyReview, error) {
	var review models.EventCompanyReview
	err := r.db.WithContext(ctx).
		Preload("Event").
		Preload("Company").
		Where("id = ?", id).First(&review).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &review, nil
}

// GetByEventAndCompany 不需 Preload（僅做存在性檢查）
func (r *eventCompanyReviewRepository) GetByEventAndCompany(ctx context.Context, eventID, companyID string) (*models.EventCompanyReview, error) {
	var review models.EventCompanyReview
	err := r.db.WithContext(ctx).
		Where("event_id = ? AND company_id = ?", eventID, companyID).
		First(&review).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &review, nil
}

// GetByEventID 列出活動的審核記錄（單次查詢 count + Preload 列表）
// ⚠️ N+1 防護：使用 Preload 而非在 service 層逐筆查詢 Event/Company
func (r *eventCompanyReviewRepository) GetByEventID(ctx context.Context, eventID string, status *string, skip, limit int) ([]*models.EventCompanyReview, int64, error) {
	var reviews []*models.EventCompanyReview
	var count int64

	query := r.db.WithContext(ctx).Model(&models.EventCompanyReview{}).Where("event_id = ?", eventID)
	if status != nil {
		query = query.Where("status = ?", *status)
	}

	// 先 count（不需要 Preload）
	if err := query.Count(&count).Error; err != nil {
		return nil, 0, err
	}

	// 再 find（加 Preload）
	if err := query.
		Preload("Event").
		Preload("Company").
		Order("created_at DESC").
		Offset(skip).Limit(limit).
		Find(&reviews).Error; err != nil {
		return nil, 0, err
	}

	return reviews, count, nil
}

// GetByCompanyID 品牌商查看自己的審核列表
func (r *eventCompanyReviewRepository) GetByCompanyID(ctx context.Context, companyID string, skip, limit int) ([]*models.EventCompanyReview, int64, error) {
	var reviews []*models.EventCompanyReview
	var count int64

	query := r.db.WithContext(ctx).Model(&models.EventCompanyReview{}).Where("company_id = ?", companyID)

	if err := query.Count(&count).Error; err != nil {
		return nil, 0, err
	}
	if err := query.
		Preload("Event").
		Preload("Company").
		Order("created_at DESC").
		Offset(skip).Limit(limit).
		Find(&reviews).Error; err != nil {
		return nil, 0, err
	}

	return reviews, count, nil
}

func (r *eventCompanyReviewRepository) Create(ctx context.Context, review *models.EventCompanyReview) error {
	return r.db.WithContext(ctx).Create(review).Error
}

func (r *eventCompanyReviewRepository) Update(ctx context.Context, review *models.EventCompanyReview) error {
	return r.db.WithContext(ctx).Save(review).Error
}

func (r *eventCompanyReviewRepository) SoftDelete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).
		Model(&models.EventCompanyReview{}).
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("CURRENT_TIMESTAMP")).Error
}

func (r *eventCompanyReviewRepository) GetDB() *gorm.DB {
	return r.db
}
```

### 3b. 新建 `backend-go/internal/repository/event_company_block_repository.go`

同樣模式，`GetByEventID` 使用 `Preload("Event").Preload("Company").Preload("BlockedMember")`：
- Create, GetByID(+Preload), GetByEventAndCompany(無Preload), GetByEventID(+Preload+count), SoftDelete, GetDB

```go
// EventCompanyBlockRepository 活動品牌商封鎖資料存取介面
type EventCompanyBlockRepository interface {
	Create(ctx context.Context, block *models.EventCompanyBlock) error
	GetByID(ctx context.Context, id string) (*models.EventCompanyBlock, error)
	GetByEventAndCompany(ctx context.Context, eventID, companyID string) (*models.EventCompanyBlock, error)
	GetByEventID(ctx context.Context, eventID string, skip, limit int) ([]*models.EventCompanyBlock, int64, error)
	SoftDelete(ctx context.Context, id string) error
	GetDB() *gorm.DB
}
```

### 3c. 新建 `backend-go/internal/repository/event_member_block_repository.go`

使用 `Preload("Event").Preload("BlockedMember")` 避免 N+1：

```go
package repository

import (
	"context"
	"errors"

	"github.com/yutuo-tech/futuresign_backend/internal/models"
	"gorm.io/gorm"
)

// EventMemberBlockRepository 活動會員封鎖資料存取介面
type EventMemberBlockRepository interface {
	Create(ctx context.Context, block *models.EventMemberBlock) error
	GetByID(ctx context.Context, id string) (*models.EventMemberBlock, error)
	GetByEventAndMember(ctx context.Context, eventID, memberID string) (*models.EventMemberBlock, error)
	GetByEventID(ctx context.Context, eventID string, skip, limit int) ([]*models.EventMemberBlock, int64, error)
	SoftDelete(ctx context.Context, id string) error
	GetDB() *gorm.DB
}

type eventMemberBlockRepository struct {
	db *gorm.DB
}

func NewEventMemberBlockRepository(db *gorm.DB) EventMemberBlockRepository {
	return &eventMemberBlockRepository{db: db}
}

// GetByID 透過 ID 查詢封鎖記錄（Preload 避免 N+1）
func (r *eventMemberBlockRepository) GetByID(ctx context.Context, id string) (*models.EventMemberBlock, error) {
	var block models.EventMemberBlock
	err := r.db.WithContext(ctx).
		Preload("Event").
		Preload("BlockedMember").
		Where("id = ?", id).First(&block).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &block, nil
}

// GetByEventAndMember 不需 Preload（僅做存在性檢查）
func (r *eventMemberBlockRepository) GetByEventAndMember(ctx context.Context, eventID, memberID string) (*models.EventMemberBlock, error) {
	var block models.EventMemberBlock
	err := r.db.WithContext(ctx).
		Where("event_id = ? AND member_id = ?", eventID, memberID).
		First(&block).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &block, nil
}

// GetByEventID 列出活動的會員封鎖記錄（Preload 避免 N+1）
func (r *eventMemberBlockRepository) GetByEventID(ctx context.Context, eventID string, skip, limit int) ([]*models.EventMemberBlock, int64, error) {
	var blocks []*models.EventMemberBlock
	var count int64

	query := r.db.WithContext(ctx).Model(&models.EventMemberBlock{}).Where("event_id = ?", eventID)

	if err := query.Count(&count).Error; err != nil {
		return nil, 0, err
	}
	if err := query.
		Preload("Event").
		Preload("BlockedMember").
		Order("created_at DESC").
		Offset(skip).Limit(limit).
		Find(&blocks).Error; err != nil {
		return nil, 0, err
	}

	return blocks, count, nil
}

func (r *eventMemberBlockRepository) Create(ctx context.Context, block *models.EventMemberBlock) error {
	return r.db.WithContext(ctx).Create(block).Error
}

func (r *eventMemberBlockRepository) SoftDelete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).
		Model(&models.EventMemberBlock{}).
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("CURRENT_TIMESTAMP")).Error
}

func (r *eventMemberBlockRepository) GetDB() *gorm.DB {
	return r.db
}
```

---

## Step 4: Service 層（3 新建）

### 4a. 新建 `backend-go/internal/service/event_company_review_service.go`

```go
// 錯誤定義
var (
	ErrEventCompanyReviewNotFound      = errors.New("審核記錄不存在")
	ErrEventCompanyReviewAlreadyExists = errors.New("已存在審核申請")
	ErrEventCompanyBlocked             = errors.New("品牌商已被封鎖")
	ErrEventMemberBlocked              = errors.New("會員已被封鎖")
	ErrRegistrationPeriodClosed        = errors.New("報名時間已結束")
	ErrVendorNotApproved               = errors.New("品牌商尚未通過審核")
)

// 依賴
type eventCompanyReviewService struct {
	reviewRepo      repository.EventCompanyReviewRepository
	blockRepo       repository.EventCompanyBlockRepository
	memberBlockRepo repository.EventMemberBlockRepository
	eventRepo       repository.EventRepository
	companyRepo     repository.CompanyRepository
	actionLogRepo   repository.ActionLogRepository
}
```

**關鍵方法：CheckVendorCanParticipate**（被 BoothHandler.SelectBooth 呼叫）
```go
// CheckVendorCanParticipate 檢查品牌商是否可以參加活動
// 1. 檢查會員個人是否被封鎖 → ErrEventMemberBlocked
// 2. 檢查公司是否被封鎖 → ErrEventCompanyBlocked
// 3. 檢查活動是否需要審核 (require_vendor_review)
// 4. 若需要，檢查是否已通過審核 → ErrVendorNotApproved
func (s *eventCompanyReviewService) CheckVendorCanParticipate(ctx context.Context, eventID, companyID, memberID string) error {
	logger.Info("檢查品牌商參加資格", "event_id", eventID, "company_id", companyID, "member_id", memberID)

	// 1. 檢查會員個人封鎖（不需 Preload，只要存在性）
	memberBlock, err := s.memberBlockRepo.GetByEventAndMember(ctx, eventID, memberID)
	if err != nil {
		return err
	}
	if memberBlock != nil {
		logger.Warn("會員已被封鎖", "event_id", eventID, "member_id", memberID)
		return ErrEventMemberBlocked
	}

	// 2. 檢查公司封鎖（不需 Preload，只要存在性）
	block, err := s.blockRepo.GetByEventAndCompany(ctx, eventID, companyID)
	if err != nil {
		return err
	}
	if block != nil {
		logger.Warn("品牌商已被封鎖", "event_id", eventID, "company_id", companyID)
		return ErrEventCompanyBlocked
	}

	// 3. 檢查活動是否需要審核
	event, err := s.eventRepo.GetByID(eventID, false, true)
	if err != nil {
		return err
	}
	if event == nil {
		return errors.New("活動不存在")
	}
	if !event.RequireVendorReview {
		return nil // 不需審核，直接放行
	}

	// 4. 檢查審核狀態（不需 Preload）
	review, err := s.reviewRepo.GetByEventAndCompany(ctx, eventID, companyID)
	if err != nil {
		return err
	}
	if review == nil || review.Status != models.EventCompanyReviewStatusApproved {
		logger.Warn("品牌商尚未通過審核", "event_id", eventID, "company_id", companyID)
		return ErrVendorNotApproved
	}

	return nil
}
```

**ApplyToEvent 關鍵邏輯：**
```go
func (s *eventCompanyReviewService) ApplyToEvent(ctx context.Context, req *dto.CreateEventCompanyReviewRequest, memberID string) (*dto.EventCompanyReviewResponse, error) {
	logger.Info("品牌商申請加入活動", "member_id", memberID, "event_id", req.EventID, "company_id", req.CompanyID)

	// 1. 查活動 + 檢查報名時間
	event, err := s.eventRepo.GetByID(req.EventID, false, true)
	// ... 檢查 RegistrationStartTime / RegistrationEndTime

	// 2. 檢查封鎖
	block, _ := s.blockRepo.GetByEventAndCompany(ctx, req.EventID, req.CompanyID)
	if block != nil { return nil, ErrEventCompanyBlocked }

	// 3. 檢查重複申請
	existing, _ := s.reviewRepo.GetByEventAndCompany(ctx, req.EventID, req.CompanyID)
	if existing != nil { return nil, ErrEventCompanyReviewAlreadyExists }

	// 4. 建立記錄
	review := &models.EventCompanyReview{
		EventID:   req.EventID,
		CompanyID: req.CompanyID,
		Status:    models.EventCompanyReviewStatusPending,
	}
	if err := s.reviewRepo.Create(ctx, review); err != nil { ... }

	// 5. ActionLog
	s.actionLogRepo.Create(ctx, &models.ActionLog{...})

	// 6. 重新查詢（帶 Preload）以取得完整回應
	created, _ := s.reviewRepo.GetByID(ctx, review.ID)
	return s.buildReviewResponse(created), nil
}
```

### 4b. 新建 `backend-go/internal/service/event_company_block_service.go`

**BlockCompany 關鍵：封鎖時自動 reject 該公司的 pending 審核**
```go
func (s *eventCompanyBlockService) BlockCompany(ctx context.Context, req *dto.CreateEventCompanyBlockRequest, blockedByMemberID string) (*dto.EventCompanyBlockResponse, error) {
	// ... 建立封鎖記錄

	// 自動 reject pending 審核
	pendingReview, _ := s.reviewRepo.GetByEventAndCompany(ctx, req.EventID, req.CompanyID)
	if pendingReview != nil && pendingReview.Status == models.EventCompanyReviewStatusPending {
		pendingReview.Status = models.EventCompanyReviewStatusRejected
		comment := "因品牌商被封鎖，自動拒絕"
		pendingReview.ReviewComment = &comment
		pendingReview.ReviewedBy = &blockedByMemberID
		now := time.Now()
		pendingReview.ReviewedAt = &now
		s.reviewRepo.Update(ctx, pendingReview)
	}
}
```

### 4c. 新建 `backend-go/internal/service/event_member_block_service.go`

```go
package service

import (
	"context"
	"errors"

	"github.com/yutuo-tech/futuresign_backend/internal/dto"
	"github.com/yutuo-tech/futuresign_backend/internal/logger"
	"github.com/yutuo-tech/futuresign_backend/internal/models"
	"github.com/yutuo-tech/futuresign_backend/internal/repository"
)

// 錯誤定義
var (
	ErrEventMemberBlockNotFound      = errors.New("會員封鎖記錄不存在")
	ErrEventMemberBlockAlreadyExists = errors.New("該會員已被封鎖")
)

// EventMemberBlockService 活動會員封鎖服務介面
type EventMemberBlockService interface {
	BlockMember(ctx context.Context, req *dto.CreateEventMemberBlockRequest, blockedByMemberID string) (*dto.EventMemberBlockResponse, error)
	UnblockMember(ctx context.Context, id string) error
	ListByEvent(ctx context.Context, eventID string, skip, limit int) (*dto.EventMemberBlockListResponse, error)
	GetByID(ctx context.Context, id string) (*dto.EventMemberBlockResponse, error)
	IsBlocked(ctx context.Context, eventID, memberID string) (bool, error)
}

type eventMemberBlockService struct {
	blockRepo     repository.EventMemberBlockRepository
	eventRepo     repository.EventRepository
	actionLogRepo repository.ActionLogRepository
}

// NewEventMemberBlockService 建立會員封鎖服務實例
func NewEventMemberBlockService(
	blockRepo repository.EventMemberBlockRepository,
	eventRepo repository.EventRepository,
	actionLogRepo repository.ActionLogRepository,
) EventMemberBlockService {
	return &eventMemberBlockService{
		blockRepo:     blockRepo,
		eventRepo:     eventRepo,
		actionLogRepo: actionLogRepo,
	}
}

// BlockMember 封鎖會員
func (s *eventMemberBlockService) BlockMember(ctx context.Context, req *dto.CreateEventMemberBlockRequest, blockedByMemberID string) (*dto.EventMemberBlockResponse, error) {
	logger.Info("封鎖會員", "event_id", req.EventID, "member_id", req.MemberID)

	// 檢查是否已封鎖
	existing, err := s.blockRepo.GetByEventAndMember(ctx, req.EventID, req.MemberID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrEventMemberBlockAlreadyExists
	}

	// 建立封鎖記錄
	block := &models.EventMemberBlock{
		EventID:   req.EventID,
		MemberID:  req.MemberID,
		Reason:    req.Reason,
		BlockedBy: blockedByMemberID,
	}
	if err := s.blockRepo.Create(ctx, block); err != nil {
		return nil, err
	}

	// ActionLog
	s.actionLogRepo.Create(ctx, &models.ActionLog{
		EntityType:  "event_member_block",
		EntityID:    block.ID,
		Action:      "block_member",
		Status:      "success",
		ApplierID:   blockedByMemberID,
		ApplierType: "member",
	})

	// 重新查詢（帶 Preload）
	created, _ := s.blockRepo.GetByID(ctx, block.ID)
	return s.buildResponse(created), nil
}

// UnblockMember 解除封鎖（軟刪除）
func (s *eventMemberBlockService) UnblockMember(ctx context.Context, id string) error {
	block, err := s.blockRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if block == nil {
		return ErrEventMemberBlockNotFound
	}
	return s.blockRepo.SoftDelete(ctx, id)
}

// ListByEvent 列出活動的會員封鎖記錄
func (s *eventMemberBlockService) ListByEvent(ctx context.Context, eventID string, skip, limit int) (*dto.EventMemberBlockListResponse, error) {
	blocks, count, err := s.blockRepo.GetByEventID(ctx, eventID, skip, limit)
	if err != nil {
		return nil, err
	}
	resp := make([]dto.EventMemberBlockResponse, len(blocks))
	for i, b := range blocks {
		resp[i] = *s.buildResponse(b)
	}
	return &dto.EventMemberBlockListResponse{Data: resp, Count: count}, nil
}

// GetByID 取得單筆封鎖記錄
func (s *eventMemberBlockService) GetByID(ctx context.Context, id string) (*dto.EventMemberBlockResponse, error) {
	block, err := s.blockRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if block == nil {
		return nil, ErrEventMemberBlockNotFound
	}
	return s.buildResponse(block), nil
}

// IsBlocked 檢查會員是否被封鎖（僅存在性，無 Preload）
func (s *eventMemberBlockService) IsBlocked(ctx context.Context, eventID, memberID string) (bool, error) {
	block, err := s.blockRepo.GetByEventAndMember(ctx, eventID, memberID)
	if err != nil {
		return false, err
	}
	return block != nil, nil
}

// buildResponse 將 Model 轉為 DTO（從 Preload 的關聯取欄位）
func (s *eventMemberBlockService) buildResponse(block *models.EventMemberBlock) *dto.EventMemberBlockResponse {
	resp := &dto.EventMemberBlockResponse{
		ID:        block.ID,
		EventID:   block.EventID,
		MemberID:  block.MemberID,
		Reason:    block.Reason,
		BlockedBy: block.BlockedBy,
		CreatedAt: block.CreatedAt,
	}
	if block.BlockedMember != nil {
		resp.MemberName = block.BlockedMember.FullName
		resp.MemberEmail = &block.BlockedMember.Email
	}
	if block.Event != nil {
		resp.EventName = &block.Event.Name
	}
	return resp
}
```

---

## Step 5: Handler 層（1 新建，包含 3 組路由）

### 5a. 新建 `backend-go/internal/handler/event_company_review_handler.go`

合併審核 + 公司封鎖 + 會員封鎖 endpoints。路由表：

**審核 API：**

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/api/v1/event-company-reviews` | MemberAuth | ApplyToEvent |
| GET | `/api/v1/event-company-reviews/:id` | TryBothAuth | GetReview |
| GET | `/api/v1/event-company-reviews/event/:event_id` | TryBothAuth | ListByEvent |
| GET | `/api/v1/event-company-reviews/company/:company_id` | MemberAuth | ListByCompany |
| PATCH | `/api/v1/event-company-reviews/:id/review` | MemberAuth | ReviewApplication |
| DELETE | `/api/v1/event-company-reviews/:id` | TryBothAuth | DeleteReview |

**公司封鎖 API：**

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/api/v1/event-company-blocks` | MemberAuth | BlockCompany |
| GET | `/api/v1/event-company-blocks/event/:event_id` | TryBothAuth | ListBlocksByEvent |
| GET | `/api/v1/event-company-blocks/:id` | TryBothAuth | GetBlock |
| DELETE | `/api/v1/event-company-blocks/:id` | MemberAuth | UnblockCompany |

**會員封鎖 API：**

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/api/v1/event-member-blocks` | MemberAuth | BlockMember |
| GET | `/api/v1/event-member-blocks/event/:event_id` | TryBothAuth | ListMemberBlocksByEvent |
| GET | `/api/v1/event-member-blocks/:id` | TryBothAuth | GetMemberBlock |
| DELETE | `/api/v1/event-member-blocks/:id` | MemberAuth | UnblockMember |

---

## Step 6: Booth 整合（修改 `booth_handler.go`）

在 BoothHandler struct 加欄位 + setter：
```go
eventCompanyReviewService service.EventCompanyReviewService

// SetEventCompanyReviewService 設置品牌商審核服務
func (h *BoothHandler) SetEventCompanyReviewService(svc service.EventCompanyReviewService) {
	h.eventCompanyReviewService = svc
}
```

在 SelectBooth L937（booth 查詢後）插入：
```go
// 檢查品牌商參加資格（會員封鎖 + 公司封鎖 + 審核）
if h.eventCompanyReviewService != nil {
	// 取得品牌商的 approved company ID
	memberCompanies, mcErr := h.memberCompanyService.GetMemberCompanies(member.ID, false)
	if mcErr == nil {
		for _, mc := range memberCompanies {
			if mc.Status == "approved" && mc.CompanyID != "" {
				if err := h.eventCompanyReviewService.CheckVendorCanParticipate(
					c.Request.Context(), booth.EventID, mc.CompanyID, member.ID,
				); err != nil {
					switch {
					case errors.Is(err, service.ErrEventMemberBlocked):
						c.JSON(http.StatusForbidden, gin.H{"detail": "您的帳號已被封鎖，無法參加此活動"})
					case errors.Is(err, service.ErrEventCompanyBlocked):
						c.JSON(http.StatusForbidden, gin.H{"detail": "此品牌商已被封鎖，無法參加此活動"})
					case errors.Is(err, service.ErrVendorNotApproved):
						c.JSON(http.StatusForbidden, gin.H{"detail": "此品牌商尚未通過審核，無法選位"})
					default:
						c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
					}
					return
				}
				break // 找到第一個 approved company 即可
			}
		}
	}
}
```

---

## Step 7: Migration + DI + 路由（修改 2 檔案）

### 7a. 修改 `internal/migrate/migrate.go` (L181)
```go
&models.EventHandbookPage{},
&models.EventCompanyReview{},  // 新增
&models.EventCompanyBlock{},   // 新增
&models.EventMemberBlock{},    // 新增
```

### 7b. 修改 `cmd/server/main.go`

```go
// ~L460 Repository
eventCompanyReviewRepo := repository.NewEventCompanyReviewRepository(database.DB)
eventCompanyBlockRepo := repository.NewEventCompanyBlockRepository(database.DB)
eventMemberBlockRepo := repository.NewEventMemberBlockRepository(database.DB)

// ~L485 Service
eventCompanyBlockService := service.NewEventCompanyBlockService(eventCompanyBlockRepo, eventRepo, eventCompanyReviewRepo, actionLogRepo)
eventMemberBlockService := service.NewEventMemberBlockService(eventMemberBlockRepo, eventRepo, actionLogRepo)
eventCompanyReviewService := service.NewEventCompanyReviewService(eventCompanyReviewRepo, eventCompanyBlockRepo, eventMemberBlockRepo, eventRepo, companyRepo, actionLogRepo)

// ~L555 Handler
eventCompanyReviewHandler := handler.NewEventCompanyReviewHandler(eventCompanyReviewService, eventCompanyBlockService, eventMemberBlockService, eventRepo)

// ~L580 注入到 BoothHandler
boothHandler.SetEventCompanyReviewService(eventCompanyReviewService)

// ~L620 路由
setupEventCompanyReviewRoutes(v1, eventCompanyReviewHandler, cfg)
```

### Step 8: Event Service（修改 `event_service.go`）

- UpdateEvent ~L460: `if eventUpdate.RequireVendorReview != nil { event.RequireVendorReview = *eventUpdate.RequireVendorReview }`
- buildEventPublic ~L1099: `RequireVendorReview: event.RequireVendorReview`
- buildEventConsumerPublic ~L1195: 同上

---

## Step 9: 前端 API Client（4 新建）

### 9a. 新建 `futuresign.dashboard/src/client/models/eventCompanyReview.ts`

```typescript
export enum EventCompanyReviewStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export const eventCompanyReviewStatusConfig = {
  [EventCompanyReviewStatus.PENDING]:  { label: "待審核", color: "yellow" },
  [EventCompanyReviewStatus.APPROVED]: { label: "已核准", color: "green" },
  [EventCompanyReviewStatus.REJECTED]: { label: "已拒絕", color: "red" },
} as const

export const formatEventCompanyReviewStatus = (status: string): string => {
  return eventCompanyReviewStatusConfig[status as EventCompanyReviewStatus]?.label || status
}

// === 審核 Types ===
export type EventCompanyReviewCreate = {
  event_id: string
  company_id: string
}

export type EventCompanyReviewUpdate = {
  status: "approved" | "rejected"
  review_comment?: string | null
}

export type EventCompanyReviewPublic = {
  id: string
  event_id: string
  company_id: string
  status: string
  review_comment: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  company_name: string | null
  brand_name: string | null
  event_name: string | null
}

export type EventCompanyReviewsPublic = {
  data: EventCompanyReviewPublic[]
  count: number
}

// === 公司封鎖 Types ===
export type EventCompanyBlockCreate = {
  event_id: string
  company_id: string
  blocked_member_id?: string | null
  reason?: string | null
}

export type EventCompanyBlockPublic = {
  id: string
  event_id: string
  company_id: string
  blocked_member_id: string | null
  reason: string | null
  blocked_by: string
  created_at: string
  company_name: string | null
  brand_name: string | null
  event_name: string | null
  blocked_member_name: string | null
}

export type EventCompanyBlocksPublic = {
  data: EventCompanyBlockPublic[]
  count: number
}

// === 會員封鎖 Types ===
export type EventMemberBlockCreate = {
  event_id: string
  member_id: string
  reason?: string | null
}

export type EventMemberBlockPublic = {
  id: string
  event_id: string
  member_id: string
  reason: string | null
  blocked_by: string
  created_at: string
  member_name: string | null
  member_email: string | null
  event_name: string | null
}

export type EventMemberBlocksPublic = {
  data: EventMemberBlockPublic[]
  count: number
}
```

### 9b. 新建 `futuresign.dashboard/src/client/services/eventCompanyReview.ts`

```typescript
// 使用 __request(OpenAPI, {...}) 模式，參考 eventCoupon.ts
export class EventCompanyReviewsService {
  static async listByEvent({ eventId, status, skip, limit })
  static async listByCompany({ companyId, skip, limit })
  static async getById({ id })
  static async create({ requestBody })
  static async review({ id, requestBody })
  static async delete({ id })
}
```

### 9c. 新建 `futuresign.dashboard/src/client/services/eventCompanyBlock.ts`

```typescript
export class EventCompanyBlocksService {
  static async listByEvent({ eventId, skip, limit })
  static async create({ requestBody })
  static async getById({ id })
  static async delete({ id })
}
```

### 9d. 新建 `futuresign.dashboard/src/client/services/eventMemberBlock.ts`

```typescript
export class EventMemberBlocksService {
  static async listByEvent({ eventId, skip, limit })
  static async create({ requestBody })
  static async getById({ id })
  static async delete({ id })  // 解除封鎖（軟刪除）
}
```

---

## Step 10: Dashboard 前端頁面

### 整體架構

在活動管理頁面 `events.tsx` 的每個活動 Accordion 內的 `<Tabs>` 中，新增 3 個 tab。
**不建立獨立頁面**，全部整合在活動管理的 tab 內。

同時保留 Sidebar 的獨立頁面入口（跨活動的總覽），方便管理員快速查看所有活動的審核/封鎖狀態。

### events.tsx 中的 Tabs 結構（現有 6 + 新增 3 = 共 9 個 tabs）

```
現有 tabs（L1599）:
  1. 活動詳情  2. 攤位管理  3. 訂單  4. 電力需求  5. 商品項目  6. 翻譯

新增 tabs:
  7. 申請名單    → <EventReviewsPanel eventId={event.id} eventName={event.name} />
  8. 已封鎖公司  → <EventCompanyBlocksPanel eventId={event.id} eventName={event.name} />
  9. 已封鎖會員  → <EventMemberBlocksPanel eventId={event.id} eventName={event.name} />
```

### 10a. 修改 `futuresign.dashboard/src/routes/_layout/events.tsx`

在 `<Tabs>` 的 `<TabList>` (L1599 附近) 新增 3 個 tab：

```tsx
{/* 現有 6 個 tabs... */}
<Tab>翻譯</Tab>
{/* ↓ 新增 3 個 */}
<Tab>申請名單 {reviewCount > 0 && <Badge ml={1} colorScheme="yellow">{reviewCount}</Badge>}</Tab>
<Tab>已封鎖公司 {companyBlockCount > 0 && <Badge ml={1} colorScheme="red">{companyBlockCount}</Badge>}</Tab>
<Tab>已封鎖會員 {memberBlockCount > 0 && <Badge ml={1} colorScheme="red">{memberBlockCount}</Badge>}</Tab>
```

在 `<TabPanels>` 新增 3 個 panel：
```tsx
{/* 現有 6 個 panels... */}
<TabPanel p={0}>
  <EventReviewsPanel eventId={event.id} eventName={event.name} />
</TabPanel>
<TabPanel p={0}>
  <EventCompanyBlocksPanel eventId={event.id} eventName={event.name} />
</TabPanel>
<TabPanel p={0}>
  <EventMemberBlocksPanel eventId={event.id} eventName={event.name} />
</TabPanel>
```

### 10b. 新建 `futuresign.dashboard/src/components/Events/EventReviewsPanel.tsx`

**Props**: `{ eventId: string; eventName: string }`
**參考**: `BoothsPanel.tsx` 的 pattern

#### Loading 狀態處理

```
三種 Loading 狀態：

1. 初始載入 → SkeletonText
   {isLoading ? <SkeletonText noOfLines={5} spacing={4} /> : ...}

2. 操作中 → Button isLoading
   <Button isLoading={reviewMutation.isPending}>確認</Button>

3. 狀態切換 → Badge 內 Spinner
   {isPending && selectedId === id ? <Spinner size="xs" mr={1} /> : null}
```

#### UI 結構（嵌入 TabPanel 內，不需要頁面標題）

```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────────┐ ┌────────────────┐   [+ 新增審核] Button  │
│  │ 狀態: [全部▼] │ │ 搜尋品牌商...   │                        │
│  │ <Select>     │ │ <Input>        │                        │
│  └──────────────┘ └────────────────┘                        │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ 待審核    │ │ 已核准    │ │ 已拒絕    │  ← Stat 卡片       │
│  │   12     │ │   45     │ │    3     │  SimpleGrid         │
│  │ yellow   │ │ green    │ │ red      │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
│                                                              │
│  isLoading ?                                                 │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ ░░░░░░░░░░░░░ SkeletonText noOfLines={5} ░░░░░░░░░░  │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  : (loaded)                                                  │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Table                                                 │   │
│  │ ┌──────────┬────────────┬──────────┬────────┬──────┐  │   │
│  │ │ 狀態      │ 品牌商      │ 申請時間  │ 審核人  │ 操作  │  │   │
│  │ ├──────────┼────────────┼──────────┼────────┼──────┤  │   │
│  │ │[Badge黃]  │ ABC品牌     │ 02-25    │  -     │[Menu]│  │   │
│  │ │ 待審核    │ XX有限公司  │          │        │ ┌──┐ │  │   │
│  │ │          │            │          │        │ │▼ │ │  │   │
│  │ │          │            │          │        │ └──┘ │  │   │
│  │ ├──────────┼────────────┼──────────┼────────┼──────┤  │   │
│  │ │[Badge綠]  │ XYZ品牌     │ 02-20    │ 王小明  │[Menu]│  │   │
│  │ │ 已核准    │ YY有限公司  │          │        │      │  │   │
│  │ └──────────┴────────────┴──────────┴────────┴──────┘  │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Menu 展開 ──────┐                                        │
│  │ ✅ 核准           │                                        │
│  │ ❌ 拒絕           │                                        │
│  │ ────────────      │                                        │
│  │ 🚫 封鎖此公司     │ ← 直接加入公司封鎖                      │
│  │ 🚫 封鎖此會員     │ ← 直接加入會員封鎖                      │
│  └──────────────────┘                                        │
│                                                              │
│  data.length === 0 ?                                         │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Text: "目前沒有審核申請" (center, gray)                 │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  PaginationFooter                                            │
└─────────────────────────────────────────────────────────────┘

┌─ 審核 Modal ──────────────────────────────────────────────┐
│  ModalHeader: "確認{核准/拒絕}品牌商"                       │
│  ModalCloseButton                                         │
│  ┌─ ModalBody ──────────────────────────────────────────┐ │
│  │  Alert (status="info")                               │ │
│  │  "確定要{核准/拒絕} ABC品牌 參加 {eventName} 嗎？"     │ │
│  │                                                      │ │
│  │  Text: "審核意見（選填）"                               │ │
│  │  ┌────────────────────────────────────────────────┐  │ │
│  │  │ <Textarea rows={4}>                            │  │ │
│  │  └────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌─ ModalFooter ────────────────────────────────────────┐ │
│  │                    [取消]  [確認{核准/拒絕}]            │ │
│  │                    ghost   green/red                  │ │
│  │                            isLoading={isPending}     │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### 10c. 新建 `futuresign.dashboard/src/components/Events/EventCompanyBlocksPanel.tsx`

**Props**: `{ eventId: string; eventName: string }`

#### UI 結構

```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────────────┐                   [+ 封鎖品牌商] red  │
│  │ 搜尋品牌商...     │                                       │
│  │ <Input>          │                                       │
│  └──────────────────┘                                       │
│                                                              │
│  isLoading ?                                                 │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ ░░░░░░░░░░░░░ SkeletonText noOfLines={5} ░░░░░░░░░░  │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  : (loaded)                                                  │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Table                                                 │   │
│  │ ┌────────────┬──────────────┬──────────┬──────┐       │   │
│  │ │ 品牌商/公司  │ 封鎖原因      │ 封鎖時間  │ 操作  │       │   │
│  │ ├────────────┼──────────────┼──────────┼──────┤       │   │
│  │ │ ABC品牌     │ 違規行為      │ 02-25    │[解封]│       │   │
│  │ │ XX有限公司  │              │          │ red  │       │   │
│  │ ├────────────┼──────────────┼──────────┼──────┤       │   │
│  │ │ XYZ品牌     │ 品質不佳      │ 03-01    │[解封]│       │   │
│  │ │ YY有限公司  │              │          │      │       │   │
│  │ └────────────┴──────────────┴──────────┴──────┘       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  data.length === 0 ?                                         │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Text: "目前沒有封鎖的公司" (center, gray)               │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  PaginationFooter                                            │
└─────────────────────────────────────────────────────────────┘

┌─ 封鎖品牌商 Modal ────────────────────────────────────────┐
│  ModalHeader: "封鎖品牌商"                                 │
│  ┌─ ModalBody ──────────────────────────────────────────┐ │
│  │  品牌商選擇:                                         │ │
│  │  ┌────────────────────────────────────────────────┐  │ │
│  │  │ <Select> 選擇品牌商 ▼                          │  │ │
│  │  └────────────────────────────────────────────────┘  │ │
│  │  (eventId 已固定，不需選活動)                         │ │
│  │                                                      │ │
│  │  封鎖原因（選填）:                                    │ │
│  │  ┌────────────────────────────────────────────────┐  │ │
│  │  │ <Textarea rows={3}>                            │  │ │
│  │  └────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌─ ModalFooter ────────────────────────────────────────┐ │
│  │                       [取消]  [確認封鎖]               │ │
│  │                       ghost   red                     │ │
│  │                               isLoading={isPending}  │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘

┌─ 確認解封 AlertDialog ────────────────────────────────────┐
│  "確定要解除封鎖 ABC品牌 嗎？"                              │
│  "解除封鎖後，該品牌商將可以重新申請參加活動。"                 │
│  ┌─ Footer ─────────────────────────────────────────────┐ │
│  │                       [取消]  [確認解封]               │ │
│  │                               isLoading={isPending}  │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### 10d. 新建 `futuresign.dashboard/src/components/Events/EventMemberBlocksPanel.tsx`

**Props**: `{ eventId: string; eventName: string }`

#### UI 結構

```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────────────┐                   [+ 封鎖會員] red    │
│  │ 搜尋會員...       │                                       │
│  │ <Input>          │                                       │
│  └──────────────────┘                                       │
│                                                              │
│  isLoading ?                                                 │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ ░░░░░░░░░░░░░ SkeletonText noOfLines={5} ░░░░░░░░░░  │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  : (loaded)                                                  │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Table                                                 │   │
│  │ ┌────────────┬──────────────┬──────────┬──────────┬──┐│   │
│  │ │ 會員名稱    │ Email         │ 封鎖原因  │ 封鎖時間  │操作││   │
│  │ ├────────────┼──────────────┼──────────┼──────────┼──┤│   │
│  │ │ 王小明      │ wang@mail.com│ 違規行為  │ 02-25    │解封││   │
│  │ ├────────────┼──────────────┼──────────┼──────────┼──┤│   │
│  │ │ 李大華      │ li@mail.com  │ 惡意操作  │ 03-01    │解封││   │
│  │ └────────────┴──────────────┴──────────┴──────────┴──┘│   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  data.length === 0 ?                                         │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Text: "目前沒有封鎖的會員" (center, gray)               │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  PaginationFooter                                            │
└─────────────────────────────────────────────────────────────┘

┌─ 封鎖會員 Modal ──────────────────────────────────────────┐
│  ModalHeader: "封鎖會員"                                   │
│  ┌─ ModalBody ──────────────────────────────────────────┐ │
│  │  會員搜尋:                                           │ │
│  │  ┌────────────────────────────────────────────────┐  │ │
│  │  │ <Input> 輸入會員名稱或 Email 搜尋...            │  │ │
│  │  └────────────────────────────────────────────────┘  │ │
│  │  (搜尋結果以下拉選單顯示)                              │ │
│  │  ┌────────────────────────────────────────────────┐  │ │
│  │  │ 王小明 (wang@mail.com)                    [選取] │  │ │
│  │  │ 王大明 (wang2@mail.com)                   [選取] │  │ │
│  │  └────────────────────────────────────────────────┘  │ │
│  │                                                      │ │
│  │  封鎖原因（選填）:                                    │ │
│  │  ┌────────────────────────────────────────────────┐  │ │
│  │  │ <Textarea rows={3}>                            │  │ │
│  │  └────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌─ ModalFooter ────────────────────────────────────────┐ │
│  │                       [取消]  [確認封鎖]               │ │
│  │                       ghost   red                     │ │
│  │                               isLoading={isPending}  │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘

┌─ 確認解封 AlertDialog ────────────────────────────────────┐
│  "確定要解除封鎖 王小明 嗎？"                                │
│  "解除封鎖後，該會員將可以重新參加活動。"                       │
│  ┌─ Footer ─────────────────────────────────────────────┐ │
│  │                       [取消]  [確認解封]               │ │
│  │                               isLoading={isPending}  │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### 10e. 獨立頁面（可選，跨活動總覽）

保留 Sidebar 入口 + 獨立頁面（10a 舊版的 `event-company-reviews.tsx` 和 `event-company-blocks.tsx`），
作為**跨活動的全域管理頁面**，方便管理員一次查看所有活動的審核/封鎖。

這些頁面的 UI 結構與之前計畫的獨立頁面相同（有活動選擇下拉），只是角色定位不同：
- **events.tsx 內的 tabs** → 查看/管理**單一活動**的審核與封鎖（主要使用）
- **獨立頁面** → 跨活動查看所有審核/封鎖（輔助用途）

### 10f. 修改 `futuresign.dashboard/src/components/Common/SidebarItems.tsx`

在 event group（booths item 後）加入：
```typescript
{
  icon: FiCheckSquare,
  title: "品牌商審核",
  shortTitle: "品牌商審核",
  path: "/event-company-reviews",
  permission: "event-company-reviews.view",
  group: "event",
  isSubItem: true,
},
{
  icon: FiSlash,
  title: "封鎖管理",
  shortTitle: "封鎖管理",
  path: "/event-company-blocks",
  permission: "event-company-blocks.view",
  group: "event",
  isSubItem: true,
},
```

並在 import 加入 `FiSlash`（`FiCheckSquare` 已存在）。

---

## N+1 防護總結

| 場景 | 方法 | N+1 防護 |
|------|------|---------|
| Review 列表 GetByEventID | `Preload("Event").Preload("Company")` | 3 SQL（主表+2 Preload），不隨資料量增加 |
| CompanyBlock 列表 GetByEventID | `Preload("Event").Preload("Company").Preload("BlockedMember")` | 4 SQL |
| MemberBlock 列表 GetByEventID | `Preload("Event").Preload("BlockedMember")` | 3 SQL |
| 單筆查詢 GetByID | 對應 Preload | 3~4 SQL |
| 存在性檢查 GetByEventAndCompany / GetByEventAndMember | 無 Preload | 1 SQL |
| CheckVendorCanParticipate | 無 Preload（只查存在性） | 最多 4 SQL（memberBlock + companyBlock + event + review） |
| buildResponse | 從 Preload 的關聯取 Name/Email | 0 額外 SQL |

---

## 驗證方式

1. `make build` 編譯通過
2. `make lint` 無錯誤
3. API 測試：
   - 審核：POST create→pending, PATCH review→approved/rejected
   - 公司封鎖：POST block→封鎖, DELETE→解封
   - 會員封鎖：POST block→封鎖, DELETE→解封
   - SelectBooth：被封鎖/未審核→403
4. 前端：
   - events.tsx 新 3 tabs 正常顯示，isLazy 延遲載入
   - Tab Badge 顯示正確數量
   - 各 Panel 的 SkeletonText 初始載入
   - 操作 Button isLoading 狀態
   - 成功/失敗 Toast 訊息

## 備註
- Go 註解使用繁體中文
- 不執行 `npm run generate-client`
- Commit 不加 Co-Authored-By
- SQL 建表手動在 stage/prod 執行

---

## 實作順序概覽（新增 Phase 2-5）

```
Phase 1: Backend 基礎 (Step 1-8) ← 原檔已有
├── Step 1: Models (3 新建 + 1 修改)
├── Step 2: DTOs (3 新建 + 1 修改)
├── Step 3: Repositories (3 新建)
├── Step 4: Services (3 新建)
├── Step 5: Handler (1 新建，含 3 組路由)
├── Step 6: Booth 整合
├── Step 7: Migration + DI + 路由
└── Step 8: Event Service 修改

Phase 2: Backend Email + 可見性 (Step 11-13)
├── Step 11: Email 模板 (2 新建)
├── Step 12: NotificationService 擴充
└── Step 13: access-check API + 活動列表過濾

Phase 3: Official Website (Step 14-18)
├── Step 14: API 模組
├── Step 15: EventApplyVendorPage (新頁面)
├── Step 16: EventRegisterBoothPage (攔截)
├── Step 17: EventDetailPage (按鈕 + 封鎖)
└── Step 18: EventVendorsPage (審核 + 封鎖管理)

Phase 4: Dashboard (Step 9-10) ← 原檔已有
├── Step 9: Dashboard API Client (4 新建)
└── Step 10: Dashboard 頁面 (3 Tab Panels)

Phase 5: API Regression Testing (api-lab-mcp)
└── Step 19: 用 api-lab-mcp 測試所有新 API 端點
```

---

## Commit 策略：每步完成 → 測試 → Commit（共 ~17 次）

每完成一個 Step，用 api-lab-mcp 測試相關 API 端點（backend 步驟），確認通過後 commit。

| Commit # | Step | 測試方式 | Commit Message |
|----------|------|---------|----------------|
| 1 | Step 1 | `make build` + `make test` | `feat: add event company review/block/member-block models` |
| 2 | Step 2 | `make build` + `make test` | `feat: add event review/block DTOs + event RequireVendorReview` |
| 3 | Step 3 | `make build` + `make test` (含 repo 單元測試) | `feat: add event review/block repositories with N+1 prevention` |
| 4 | Step 4 | `make build` + `make test` (含 service 單元測試) | `feat: add event review/block services with business logic` |
| 5 | Step 5 | `make build` + `make test` (含 handler 單元測試) | `feat: add event review/block handler with 15 API endpoints` |
| 6 | Step 6 | `make build` + `make test` | `feat: integrate vendor review check into booth selection` |
| 7 | Step 7 | `make test` + api-lab-mcp 測全部 15 個 CRUD API | `feat: wire DI + routes for event review/block system` |
| 8 | Step 8 | `make test` + api-lab-mcp 測 RequireVendorReview | `feat: add RequireVendorReview to event service` |
| 9 | Step 11 | `make build` + `make test` | `feat: add vendor application email templates` |
| 10 | Step 12 | `make test` + api-lab-mcp 測申請→確認 email | `feat: extend notification service for vendor review emails` |
| 11 | Step 13 | `make test` + api-lab-mcp 測 access-check (5 case) | `feat: add event access-check API + visibility filtering` |
| 12 | Step 14 | `npm run build` (TS 編譯) | `feat: add event review API module for official website` |
| 13 | Step 15 | `npm run build` | `feat: add EventApplyVendorPage with RWD` |
| 14 | Step 16 | `npm run build` | `feat: add access check interception to booth registration` |
| 15 | Step 17 | `npm run build` | `feat: integrate review/block into EventDetailPage` |
| 16 | Step 18 | `npm run build` | `feat: add review/block tabs to EventVendorsPage` |
| 17 | Step 9-10 | Dashboard `npm run build` | `feat: add review/block management to dashboard with RBAC` |

**最終 regression**：Step 7 後 + Step 11 後 + Step 13 後，各用 `batch_test` 跑一次完整 regression。

---

## Phase 2: Backend Email + 可見性 (Step 11-13)

### Step 11: Email 模板 (2 新建 + 測試)

#### 11a. 新建 `backend-go/internal/service/email/templates/vendor_application_notification.html`
通知主辦方有新申請。參考 `organizer_order_notification.html` 的樣式。

#### 修改 `template_data.go` — 加 data struct
```go
type VendorApplicationEmailData struct {
    OrganizerName, EventName, CompanyName, BrandName string
    ApplicantName, ApplicantEmail, ApplyTime, ReviewURL string
}
```

#### 修改 `templates.go` — 加 Render 方法
```go
func (r *TemplateRenderer) RenderVendorApplicationNotification(data VendorApplicationEmailData) (string, error)
```

#### 11b. 新建 `backend-go/internal/service/email/templates/vendor_application_result.html`
通知品牌商審核結果。

```go
type VendorApplicationResultEmailData struct {
    VendorName, EventName, StatusText, ReviewComment, EventURL string
}
func (r *TemplateRenderer) RenderVendorApplicationResult(data VendorApplicationResultEmailData) (string, error)
```

#### 11-test. 加入既有 `backend-go/internal/service/notification_service_test.go` 或新建 email template test
- `TestRenderVendorApplicationNotification` — 渲染成功，含所有欄位
- `TestRenderVendorApplicationResult_Approved` — StatusText="已核准"
- `TestRenderVendorApplicationResult_Rejected` — StatusText="已拒絕"

### Step 12: NotificationService 擴充

#### 修改 `backend-go/internal/service/notification_service.go`

12a. 新增常數：`NotificationTypeVendorReview = "vendor_review"`

12b. Interface 新增 2 方法：
```go
SendVendorApplicationNotification(ctx, eventID, companyID, memberID string) (*NotificationLog, error)
SendVendorApplicationResult(ctx, eventID, companyID, status, reviewComment string) (*NotificationLog, error)
```

12c. struct 加 `companyRepo`，用 setter 模式避免破壞現有建構：
```go
func (s *notificationService) SetCompanyRepo(repo repository.CompanyRepository) { s.companyRepo = repo }
```

12d. 在 `cmd/server/main.go` DI 中呼叫 setter

12e. 修改 `event_company_review_service.go`：
- struct 加 `notificationService NotificationService`
- `ApplyToEvent` 成功後 goroutine 發 `SendVendorApplicationNotification`
- `ReviewApplication` 後 goroutine 發 `SendVendorApplicationResult`

### Step 13: 活動可見性過濾

#### 13a. 新 DTO `backend-go/internal/dto/event_access_check.go`
```go
type EventAccessCheckResponse struct {
    CanAccess           bool    `json:"can_access"`
    Reason              string  `json:"reason,omitempty"`
    ReviewStatus        *string `json:"review_status,omitempty"`
    IsBlocked           bool    `json:"is_blocked"`
    RequireVendorReview bool    `json:"require_vendor_review"`
}
```

#### 13b. 新 Handler: `CheckEventAccess` 加在 `event_handler.go`
路由：`GET /events/:id/access-check` (MemberAuth)

邏輯：取 member 的 approved company IDs → 查 member_block → 查 company_block → 查 review status → 回傳

需要在 EventHandler 注入: `eventCompanyReviewRepo`, `eventCompanyBlockRepo`, `eventMemberBlockRepo`, `memberCompanyRepo`

#### 13c. Repository 新增方法
```go
// EventCompanyBlockRepository
GetBlockedEventIDsByCompanyIDs(ctx, companyIDs []string) ([]string, error)
// EventMemberBlockRepository
GetBlockedEventIDsByMemberID(ctx, memberID string) ([]string, error)
```

#### 13d. 品牌商查詢單筆審核狀態
`GET /event-company-reviews/event/:event_id/company/:company_id` (已在 Step 5 路由表)

---

## Phase 3: Official Website (Step 14-18)

### Step 14: API 模組

#### 14a. 新建 `futuresign.official_website/src/lib/api/event-review.ts`
使用 `apiClient` 模式，包含：
- `applyToEvent(eventId, companyId)`
- `getMyReviewStatus(eventId, companyId)`
- `checkAccess(eventId)`
- `listByEvent(eventId, status?)`
- `reviewApplication(reviewId, status, comment?)`
- `blockCompany / blockMember / unblockCompany / unblockMember`
- `listCompanyBlocks / listMemberBlocks`

#### 14b. 修改 `futuresign.official_website/src/lib/api/types.ts`
Event interface 加 `require_vendor_review?: boolean`

### Step 15: 品牌商申請頁面

#### 15a. 修改 `App.tsx` — 加路由
```tsx
const EventApplyVendorPage = lazy(() => import('@/pages/EventApplyVendorPage'))
<Route path="/event/:id/apply" element={<ProtectedRoute><EventApplyVendorPage /></ProtectedRoute>} />
```

#### 15b. 新建 `futuresign.official_website/src/pages/EventApplyVendorPage.tsx`
參考 BecomeVendorPage.tsx 的 pattern (plain React state + validation)

**流程**：
1. 驗證 vendor identity → 否則 redirect
2. Fetch approved vendor companies
3. Fetch event info + access check
4. 如果 is_blocked → 封鎖畫面
5. 如果已有審核記錄 → 狀態畫面 (pending/approved/rejected)
6. 如果不需審核 → 提示可直接選位
7. 表單：選公司 → 送出申請

**RWD**：手機 w-full 按鈕、桌面居中 max-w-lg 卡片

### Step 16: 攤位購買流程攔截

修改 `EventRegisterBoothPage.tsx`：
在初始化邏輯中加入 `eventReviewApi.checkAccess(eventId)`，攔截被封鎖 / 未審核的用戶。
- is_blocked → toast.error + redirect 到活動頁
- require_vendor_review && review_status !== 'approved' → redirect 到 /apply

### Step 17: 活動詳情頁整合

修改 `EventDetailPage.tsx`：
- 17a. 用 `useQuery` 查 access-check（僅登入時），被封鎖顯示 NotFound
- 17b. 品牌商看到「申請加入」按鈕 vs 「選擇攤位」按鈕的條件切換

### Step 18: 主辦管理頁面

修改 `EventVendorsPage.tsx` (~900 行)：
用 Tabs 組件分 3 個 Tab：

1. **已確認品牌商** — 現有內容不動
2. **申請審核** — 審核列表 + 篩選 + 核准/拒絕按鈕 + DropdownMenu(封鎖)
3. **封鎖管理** — 子 Tabs: 封鎖公司 / 封鎖會員，含解封按鈕

---

## Phase 4 補充: RBAC 權限設計

現有系統使用 `role.permissions` JSON 欄位存權限，格式 `{"key": true/false}`。
目前有 44 個權限，需新增品牌商審核/封鎖的權限。

#### 新增權限常數 — 修改 `backend-go/internal/models/permission.go`

在 `PermissionKeys` struct 加入：
```go
// Event Company Reviews (品牌商審核)
EventCompanyReviewsView   string  // "event_company_reviews.view"
EventCompanyReviewsCreate string  // "event_company_reviews.create"
EventCompanyReviewsEdit   string  // "event_company_reviews.edit" (審核操作)
EventCompanyReviewsDelete string  // "event_company_reviews.delete"

// Event Company Blocks (公司封鎖)
EventCompanyBlocksView   string  // "event_company_blocks.view"
EventCompanyBlocksCreate string  // "event_company_blocks.create" (封鎖)
EventCompanyBlocksDelete string  // "event_company_blocks.delete" (解封)

// Event Member Blocks (會員封鎖)
EventMemberBlocksView   string  // "event_member_blocks.view"
EventMemberBlocksCreate string  // "event_member_blocks.create" (封鎖)
EventMemberBlocksDelete string  // "event_member_blocks.delete" (解封)
```
共 +10 個權限（44 → 54）

#### Handler 路由加權限 Middleware

修改 `event_company_review_handler.go` 的路由（Step 5 / Step 7）：

**審核 API** — Dashboard 端（TryBothAuth）加 `RequirePermissionForUser`：
```go
// Dashboard 用戶需要權限，Member 端不需要（MemberAuth 不檢查 RBAC）
reviews.GET("/:id", middleware.TryBothAuth(), middleware.RequirePermissionForUser("event_company_reviews.view"), ...)
reviews.GET("/event/:event_id", middleware.TryBothAuth(), middleware.RequirePermissionForUser("event_company_reviews.view"), ...)
reviews.PATCH("/:id/review", middleware.MemberAuthRequired(cfg), ...) // Member only, 不需 RBAC
```

**封鎖 API** — 同理：
```go
blocks.GET("/event/:event_id", middleware.TryBothAuth(), middleware.RequirePermissionForUser("event_company_blocks.view"), ...)
blocks.POST("", middleware.MemberAuthRequired(cfg), ...) // Member 端操作
blocks.DELETE("/:id", middleware.MemberAuthRequired(cfg), ...) // Member 端操作
```

#### Dashboard 權限模組 — 修改 `futuresign.dashboard/src/constants/permissionModules.ts`

在 Events category 加入 3 個新模組：

```typescript
// 加在 Events 分類下
{
  key: "event_company_reviews",
  label: "品牌商審核",
  actions: ["view", "create", "edit", "delete"],
},
{
  key: "event_company_blocks",
  label: "品牌商封鎖",
  actions: ["view", "create", "delete"],
},
{
  key: "event_member_blocks",
  label: "會員封鎖",
  actions: ["view", "create", "delete"],
},
```

#### 預設角色權限

| 角色 | 審核(view/edit) | 公司封鎖(view/create/delete) | 會員封鎖(view/create/delete) |
|------|----------------|---------------------------|---------------------------|
| BOSS | 全部 | 全部 | 全部 |
| IT | 全部 | 全部 | 全部 |
| MANAGER | view, edit | view, create, delete | view, create, delete |
| ADMIN | view, edit | view, create | view, create |
| PT | view only | view only | view only |

需手動更新 DB 中各 role 的 permissions JSON，或在 dashboard 勾選。

#### Dashboard Panel 權限控制

Tab 顯示/隱藏根據當前用戶權限：
```tsx
const { hasPermission } = usePermission()
{hasPermission("event_company_reviews.view") && <Tab>申請名單</Tab>}
{hasPermission("event_company_blocks.view") && <Tab>已封鎖公司</Tab>}
{hasPermission("event_member_blocks.view") && <Tab>已封鎖會員</Tab>}
```

Panel 內的操作按鈕也需權限控制：
```tsx
{hasPermission("event_company_reviews.edit") && <Button>核准</Button>}
{hasPermission("event_company_blocks.create") && <Button>封鎖品牌商</Button>}
{hasPermission("event_company_blocks.delete") && <Button>解封</Button>}
```

---

## Phase 5: API Regression Testing (api-lab-mcp)

### 測試策略

使用 [api-lab-mcp](https://github.com/atototo/api-lab-mcp) MCP 工具在每個 Phase 完成後進行端對端 API 測試。

### 19a. 測試前置：取得 Auth Token

```
mcp__api-lab-mcp__set_auth_config → bearer token
```
用既有測試帳號登入取得 JWT token，設定為 session auth。

### 19b. Phase 1 完成後 — 核心 CRUD 測試

用 `batch_test` 一次跑完所有新 API 端點：

**審核 API 測試 (6 個)：**
1. `POST /event-company-reviews` — 品牌商申請 → assert status=201, body 有 id
2. `POST /event-company-reviews` — 重複申請 → assert status=409 (conflict)
3. `GET /event-company-reviews/event/:event_id` — 列表 → assert status=200, data is array
4. `GET /event-company-reviews/event/:event_id/company/:company_id` — 單筆查詢 → assert status=200
5. `PATCH /event-company-reviews/:id/review` body={status:"approved"} → assert status=200, status=approved
6. `PATCH /event-company-reviews/:id/review` body={status:"rejected"} → assert status=200, status=rejected

**公司封鎖 API 測試 (4 個)：**
1. `POST /event-company-blocks` → assert 201
2. `POST /event-company-blocks` 重複 → assert 409
3. `GET /event-company-blocks/event/:event_id` → assert 200, data is array
4. `DELETE /event-company-blocks/:id` → assert 200 (解封)

**會員封鎖 API 測試 (4 個)：**
1. `POST /event-member-blocks` → assert 201
2. `GET /event-member-blocks/event/:event_id` → assert 200
3. `DELETE /event-member-blocks/:id` → assert 200
4. `GET /event-member-blocks/:id` 已刪除 → assert 404

### 19c. Phase 2 完成後 — Access Check + 封鎖可見性測試

**Access Check API 測試 (5 個)：**
1. 正常用戶 `GET /events/:id/access-check` → assert can_access=true
2. 被封鎖會員 → assert is_blocked=true, can_access=false
3. 被封鎖公司 → assert is_blocked=true
4. 需審核但未申請 → assert require_vendor_review=true, review_status=null
5. 已核准 → assert review_status="approved", can_access=true

### 19d. 業務邏輯整合測試

**完整流程 (sequential batch)：**
1. 主辦建活動 + 設定 require_vendor_review=true
2. 品牌商申請 → assert pending
3. access-check → assert review_status=pending, can_access=false
4. 主辦核准 → assert approved
5. access-check → assert can_access=true
6. 主辦封鎖公司 → assert 201
7. access-check → assert is_blocked=true
8. 主辦解封 → access-check → assert can_access=true

### 19e. Regression Testing 設計

建立 `api-test-config.json` 配置檔（可用 `load_config` 載入）：
```json
{
  "environments": {
    "local": { "baseUrl": "http://localhost:8080/api/v1" },
    "staging": { "baseUrl": "https://staging-api.futuresign.com/api/v1" }
  }
}
```

**Regression 測試流程：**
1. 每次部署前用 `batch_test` 跑 19b-19d 全部 assertions
2. 用 `reportFormat: "failures"` 只顯示失敗項
3. 設定 `stopOnFailure: false` 跑完全部再看結果
4. 如果有 failure → 標記具體哪個 API 壞了

**回歸測試命令範例：**
```
mcp__api-lab-mcp__batch_test({
  tests: [...全部 19 個測試],
  options: { parallel: false, stopOnFailure: false, timeout: 10000 },
  reportFormat: "failures"
})
```

### 19f. Sentry MCP 自動化 Regression

當 API 上線後出錯，利用 Sentry MCP 插件自動化產生回歸測試：

**流程：**
1. **Sentry MCP 抓 Issue** — Claude 透過 Sentry MCP 讀取最新 Issue，取得完整 Context（API 參數、Header、用戶環境）
2. **分析錯誤根因** — 例如 `user_id` 為空、`company_id` 不存在等
3. **自動生成測試** — 用 api-lab-mcp 的 `test_with_assertions` 直接重現錯誤場景
4. **加入 regression suite** — 將該測試加入 batch_test 配置，確保同類錯誤不再發生

**範例場景：**
```
Sentry Issue #123: POST /event-company-reviews 500 error
Context: { event_id: "xxx", company_id: "" }  ← company_id 為空

→ 自動產生 assertion:
  test_with_assertions({
    url: "/event-company-reviews",
    method: "POST",
    body: { event_id: "xxx", company_id: "" },
    assertions: [
      { type: "status", expected: 400 },  // 應該是 400 不是 500
      { type: "contains", expected: "company_id is required" }
    ]
  })
```

**好處：** 不需開 Sentry 網頁，從 Issue 到 regression test 全自動完成。

---

## 檔案總表

### 新建檔案 (25 個：18 實作 + 7 測試)

| # | 檔案 | 用途 |
|---|------|------|
| 1 | `backend-go/internal/models/event_company_review.go` | 審核 Model |
| 2 | `backend-go/internal/models/event_company_block.go` | 公司封鎖 Model |
| 3 | `backend-go/internal/models/event_member_block.go` | 會員封鎖 Model |
| 4 | `backend-go/internal/dto/event_company_review.go` | 審核 DTO |
| 5 | `backend-go/internal/dto/event_company_block.go` | 公司封鎖 DTO |
| 6 | `backend-go/internal/dto/event_member_block.go` | 會員封鎖 DTO |
| 7 | `backend-go/internal/dto/event_access_check.go` | access-check DTO |
| 8 | `backend-go/internal/repository/event_company_review_repository.go` | 審核 Repo |
| 9 | `backend-go/internal/repository/event_company_review_repository_test.go` | 審核 Repo 測試 |
| 10 | `backend-go/internal/repository/event_company_block_repository.go` | 公司封鎖 Repo |
| 11 | `backend-go/internal/repository/event_company_block_repository_test.go` | 公司封鎖 Repo 測試 |
| 12 | `backend-go/internal/repository/event_member_block_repository.go` | 會員封鎖 Repo |
| 13 | `backend-go/internal/repository/event_member_block_repository_test.go` | 會員封鎖 Repo 測試 |
| 14 | `backend-go/internal/service/event_company_review_service.go` | 審核 Service |
| 15 | `backend-go/internal/service/event_company_review_service_test.go` | 審核 Service 測試 |
| 16 | `backend-go/internal/service/event_company_block_service.go` | 公司封鎖 Service |
| 17 | `backend-go/internal/service/event_company_block_service_test.go` | 公司封鎖 Service 測試 |
| 18 | `backend-go/internal/service/event_member_block_service.go` | 會員封鎖 Service |
| 19 | `backend-go/internal/service/event_member_block_service_test.go` | 會員封鎖 Service 測試 |
| 20 | `backend-go/internal/handler/event_company_review_handler.go` | 合併 Handler |
| 21 | `backend-go/internal/handler/event_company_review_handler_test.go` | Handler 測試 |
| 22 | `backend-go/internal/service/email/templates/vendor_application_notification.html` | 申請通知 Email |
| 23 | `backend-go/internal/service/email/templates/vendor_application_result.html` | 結果通知 Email |
| 24 | `official_website/src/lib/api/event-review.ts` | 前台 API 模組 |
| 25 | `official_website/src/pages/EventApplyVendorPage.tsx` | 品牌商申請頁面 |

### 修改檔案 (17 個)

| # | 檔案 | 變更 |
|---|------|------|
| 1 | `backend-go/internal/models/event.go` | +RequireVendorReview 欄位 |
| 2 | `backend-go/internal/models/permission.go` | +10 權限常數 (RBAC) |
| 3 | `backend-go/internal/dto/event.go` | +RequireVendorReview (4 處) |
| 4 | `backend-go/internal/handler/booth_handler.go` | +CheckVendorCanParticipate 攔截 |
| 5 | `backend-go/internal/handler/event_handler.go` | +CheckEventAccess handler |
| 6 | `backend-go/internal/service/event_service.go` | +RequireVendorReview 處理 |
| 7 | `backend-go/internal/service/notification_service.go` | +1 type, +2 methods, +companyRepo |
| 8 | `backend-go/internal/service/email/template_data.go` | +2 data structs |
| 9 | `backend-go/internal/service/email/templates.go` | +2 Render methods |
| 10 | `backend-go/internal/migrate/migrate.go` | +3 models |
| 11 | `backend-go/cmd/server/main.go` | +DI 接線, +路由, +setter, +RBAC middleware |
| 12 | `official_website/src/App.tsx` | +EventApplyVendorPage route |
| 13 | `official_website/src/lib/api/types.ts` | Event +require_vendor_review |
| 14 | `official_website/src/pages/EventRegisterBoothPage.tsx` | +access check 攔截 |
| 15 | `official_website/src/pages/EventDetailPage.tsx` | +封鎖檢查, +申請按鈕 |
| 16 | `official_website/src/pages/EventVendorsPage.tsx` | +Tabs(審核+封鎖) |
| 17 | `dashboard/src/constants/permissionModules.ts` | +3 權限模組 (RBAC UI) |

---

## 設計變更：封鎖合併為一張表 `event_block`

### 變更原因
原計畫 `event_company_block` + `event_member_block` 兩張表結構高度重複，合併為 `event_block` 用 `block_type` 區分。

### 合併後結構

```
event_block
├── id (varchar 36, PK)
├── event_id (varchar 36, not null)
├── block_type (varchar 20, not null) -- 'company' 或 'member'
├── target_id (varchar 36, not null) -- block_type=company 時為 company_id，block_type=member 時為 member_id
├── reason (varchar 500, nullable) -- 封鎖原因
├── blocked_by (varchar 36, not null) -- 操作者 member ID
├── created_at, updated_at, deleted_at
└── UNIQUE KEY uk_event_block (event_id, block_type, target_id)
```

### 影響範圍
- Model: 原 2 檔 → 1 檔 `event_block.go`
- DTO: 原 2 檔 → 1 檔 `event_block.go`
- Repository: 原 2 檔 → 1 檔 `event_block_repository.go`
- Service: 原 2 檔 → 1 檔 `event_block_service.go`
- Handler: 合併在 `event_company_review_handler.go` 內，路由不變
- 權限: `event_company_blocks.*` + `event_member_blocks.*` → `event_blocks.*`（6 個權限 → 3 個）

---

## SQL 建表語法

### 1. event_company_review（品牌商審核）

```sql
CREATE TABLE `event_company_review` (
  `id` varchar(36) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `event_id` varchar(36) NOT NULL COMMENT '活動 ID',
  `company_id` varchar(36) NOT NULL COMMENT '公司 ID',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '審核狀態 (pending/approved/rejected)',
  `review_comment` varchar(500) DEFAULT NULL COMMENT '審核意見',
  `reviewed_by` varchar(36) DEFAULT NULL COMMENT '審核人 member ID',
  `reviewed_at` datetime DEFAULT NULL COMMENT '審核時間',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_company_review` (`event_id`, `company_id`),
  KEY `idx_ecr_event` (`event_id`),
  KEY `idx_ecr_company` (`company_id`),
  KEY `idx_ecr_status` (`status`),
  KEY `idx_event_company_review_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活動品牌商審核記錄';
```

### 2. event_block（活動封鎖 — 公司/會員合併）

```sql
CREATE TABLE `event_block` (
  `id` varchar(36) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `event_id` varchar(36) NOT NULL COMMENT '活動 ID',
  `block_type` varchar(20) NOT NULL COMMENT '封鎖類型 (company/member)',
  `target_id` varchar(36) NOT NULL COMMENT '被封鎖對象 ID (company_id 或 member_id)',
  `reason` varchar(500) DEFAULT NULL COMMENT '封鎖原因',
  `blocked_by` varchar(36) NOT NULL COMMENT '操作者 member ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_block` (`event_id`, `block_type`, `target_id`),
  KEY `idx_eb_event` (`event_id`),
  KEY `idx_eb_type` (`block_type`),
  KEY `idx_eb_target` (`target_id`),
  KEY `idx_event_block_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活動封鎖記錄（公司/會員）';
```

### 3. event 表新增欄位

```sql
ALTER TABLE `event`
  ADD COLUMN `require_vendor_review` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否需要品牌商審核'
  AFTER `is_featured`;
```

---

## 🔄 Backend 設計變更：統一為 `event_review` 單表（取代上方 3 表設計）

> **重要**：以下內容取代上方 Step 1-8 的 3 表設計（event_company_review + event_company_block + event_member_block）
> 前端路由與 API 呼叫方式不變，只是後端底層改為單表。

### 變更原因

審核（review）和封鎖（block）本質相同：
- 都是「某活動 + 某對象」的狀態記錄
- 封鎖只是 status = 'blocked'
- 解封只是 status 改為 'approved'
- 合併後減少表數量與 JOIN 複雜度

### 單表設計：`event_review`

```
event_review
├── id (PK, UUID)
├── event_id (varchar 36, not null)
├── target_type (varchar 20, not null) — 'company' | 'member'
├── target_id (varchar 36, not null)   — company_id 或 member_id
├── status (varchar 20, not null)      — 'pending' | 'approved' | 'rejected' | 'blocked'
├── review_comment (varchar 500)       — 審核意見或封鎖原因
├── reviewed_by (varchar 36)           — 操作者 member ID
├── reviewed_at (datetime)             — 操作時間
├── created_at / updated_at / deleted_at (GORM Base)
└── UK: (event_id, target_type, target_id) — 同一活動+對象類型+對象ID 只能有一筆
```

### 狀態機

**公司 (target_type = 'company')**：
```
(無記錄) → pending → approved
                   → rejected
                   → blocked → approved (解封)
(無記錄) → blocked (直接封鎖)
```

**會員 (target_type = 'member')**：
```
(無記錄) → blocked → approved (解封)
```
會員不需要申請審核流程，只有封鎖/解封。

### 新 SQL CREATE TABLE（取代上方 event_company_review + event_block 兩張表）

```sql
CREATE TABLE `event_review` (
  `id` varchar(36) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `event_id` varchar(36) NOT NULL COMMENT '活動 ID',
  `target_type` varchar(20) NOT NULL COMMENT '對象類型 (company/member)',
  `target_id` varchar(36) NOT NULL COMMENT '對象 ID (company_id 或 member_id)',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '狀態 (pending/approved/rejected/blocked)',
  `review_comment` varchar(500) DEFAULT NULL COMMENT '審核意見或封鎖原因',
  `reviewed_by` varchar(36) DEFAULT NULL COMMENT '操作者 member ID',
  `reviewed_at` datetime DEFAULT NULL COMMENT '操作時間',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_review` (`event_id`, `target_type`, `target_id`),
  KEY `idx_er_event` (`event_id`),
  KEY `idx_er_type` (`target_type`),
  KEY `idx_er_target` (`target_id`),
  KEY `idx_er_status` (`status`),
  KEY `idx_event_review_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活動審核/封鎖記錄（統一表）';
```

> event 表 ALTER TABLE 不變（新增 `require_vendor_review`）。

### 後端檔案對應表（取代原 3 表設計的新建檔案）

| 原計畫（3 表） | 統一後（1 表） | 說明 |
|---------------|---------------|------|
| `models/event_company_review.go` | `models/event_review.go` | 統一 Model |
| `models/event_company_block.go` | ❌ 不需要 | 合併 |
| `models/event_member_block.go` | ❌ 不需要 | 合併 |
| `dto/event_company_review.go` | `dto/event_review.go` | 統一 DTO |
| `dto/event_company_block.go` | ❌ 不需要 | 合併 |
| `dto/event_member_block.go` | ❌ 不需要 | 合併 |
| `repository/event_company_review_repository.go` | `repository/event_review_repository.go` | 統一 Repo |
| `repository/event_company_block_repository.go` | ❌ 不需要 | 合併 |
| `repository/event_member_block_repository.go` | ❌ 不需要 | 合併 |
| `service/event_company_review_service.go` | `service/event_review_service.go` | 統一 Service |
| `service/event_company_block_service.go` | ❌ 不需要 | 合併 |
| `service/event_member_block_service.go` | ❌ 不需要 | 合併 |
| `handler/event_company_review_handler.go` | `handler/event_review_handler.go` | 統一 Handler |

**新建檔案：7 個（原 25 個 → 大幅簡化）**
1. `backend-go/internal/models/event_review.go`
2. `backend-go/internal/dto/event_review.go`
3. `backend-go/internal/repository/event_review_repository.go`
4. `backend-go/internal/repository/event_review_repository_test.go`
5. `backend-go/internal/service/event_review_service.go`
6. `backend-go/internal/service/event_review_service_test.go`
7. `backend-go/internal/handler/event_review_handler.go`

**修改檔案不變**（event.go、dto/event.go、booth_handler.go、main.go、migrate.go 等）

### 統一 API 路由表（取代原 15 個 → 合併為 9 個）

| Method | Path | 功能 | Auth |
|--------|------|------|------|
| POST | `/event-reviews` | 品牌商申請加入活動 | MemberAuth |
| GET | `/event-reviews/:id` | 取得單筆審核/封鎖記錄 | TryBothAuth |
| GET | `/event-reviews/event/:event_id` | 列出活動下的記錄（可篩 target_type/status） | TryBothAuth |
| GET | `/event-reviews/event/:event_id/company/:company_id` | 查詢品牌商審核狀態 | MemberAuth |
| GET | `/event-reviews/company/:company_id` | 列出某公司在所有活動的記錄 | MemberAuth |
| PATCH | `/event-reviews/:id/review` | 主辦審核（approved/rejected） | MemberAuth |
| POST | `/event-reviews/block` | 封鎖公司或會員 | MemberAuth |
| PATCH | `/event-reviews/:id/unblock` | 解封（status → approved） | MemberAuth |
| DELETE | `/event-reviews/:id` | 刪除記錄（軟刪除） | TryBothAuth |

### Service 主要方法

```go
type EventReviewService interface {
    ApplyToEvent(ctx, req)                       // 品牌商申請
    ReviewApplication(ctx, id, req, reviewerID)  // 主辦審核
    BlockTarget(ctx, req, blockedBy)             // 封鎖公司或會員
    UnblockTarget(ctx, id, reviewerID)           // 解封 → status=approved
    GetByID(ctx, id)                             // 查詢單筆
    GetByEventAndTarget(ctx, eventID, targetType, targetID) // 查詢特定對象
    ListByEvent(ctx, eventID, targetType, status, skip, limit) // 活動下的記錄
    ListByTarget(ctx, targetType, targetID, skip, limit)       // 對象在所有活動的記錄
    CheckVendorCanParticipate(ctx, eventID, companyID, memberID, requireVendorReview) // Booth 攔截
    DeleteReview(ctx, id)                        // 軟刪除
}
```

### 前端對應

前端 API 呼叫路徑隨後端統一：

**Official Website**：
- `event-review.ts` 中的 API 函式改呼叫 `/event-reviews/...` 路徑
- 品牌商申請頁面、攤位攔截、審核管理頁面的邏輯不變

**Dashboard**：
- `eventCompanyReview.ts` service 改呼叫統一 API
- 封鎖管理改用 `/event-reviews/block` 和 `/event-reviews/:id/unblock`
- Tab panels 查詢用 `target_type` 和 `status` 參數區分

### 錯誤定義

```go
var (
    ErrEventReviewNotFound  = errors.New("審核記錄不存在")
    ErrEventReviewExists    = errors.New("該公司已申請過此活動")
    ErrEventCompanyBlocked  = errors.New("該公司已被此活動封鎖")
    ErrEventMemberBlocked   = errors.New("該會員已被此活動封鎖")
    ErrVendorNotApproved    = errors.New("品牌商尚未通過此活動審核")
    ErrInvalidReviewStatus  = errors.New("無效的審核狀態")
    ErrTargetAlreadyBlocked = errors.New("該對象已被封鎖")
)
```

### CheckVendorCanParticipate 攔截邏輯

被 `booth_handler.go` 的 `SelectBooth` 呼叫：

```
1. 查 member 是否被封鎖 (target_type=member, status=blocked) → ErrEventMemberBlocked
2. 查 company 是否被封鎖 (target_type=company, status=blocked) → ErrEventCompanyBlocked
3. 如果 requireVendorReview=true：
   - 查 company 審核記錄
   - 如果無記錄 或 status != approved → ErrVendorNotApproved
4. 全部通過 → return nil（放行）
```

---

## ✅ 實作進度追蹤（2026-03-03 更新）

### Backend Phase 1 完成狀態

| Step | 內容 | 狀態 | 備註 |
|------|------|------|------|
| Step 1 | Model 層 (`event_review.go` + event.go 修改) | ✅ 完成 | 統一單表設計 |
| Step 2 | DTO 層 (`event_review.go` + event.go 修改) | ✅ 完成 | |
| Step 3 | Repository 層 (`event_review_repository.go` + test) | ✅ 完成 | 含 Preload Company/Member |
| Step 4 | Service 層 (`event_review_service.go` + test) | ✅ 完成 | 不需 companyRepo/memberRepo |
| Step 5 | Handler 層 (`event_review_handler.go`) | ✅ 完成 | 9 個 API 端點 |
| Step 6 | Booth 整合 (`booth_handler.go`) | ✅ 完成 | SetEventReviewService setter |
| Step 7 | Migration + DI + 路由 (`main.go`, `migrate.go`) | ✅ 完成 | |
| Step 8 | Event Service 修改 | ✅ 完成 | RequireVendorReview 處理 |

### Frontend Phase 3 完成狀態

| Step | 內容 | 狀態 | 備註 |
|------|------|------|------|
| Step 14 | API 模組 (`event-review.ts` + `types.ts`) | ✅ 完成 | |
| Step 15 | EventApplyVendorPage（品牌商申請頁面） | ✅ 完成 | 含 6 種頁面狀態 |
| Step 16 | EventRegisterBoothPage（攤位攔截） | ✅ 完成 | access-check 攔截 |
| Step 17 | EventDetailPage（申請按鈕 + 封鎖檢查） | ✅ 完成 | useQuery accessCheck |
| Step 18 | EventVendorsPage（審核+封鎖 Tabs） | ✅ 完成 | 3 個 Tab |

### Dashboard Phase 4 完成狀態

| Step | 內容 | 狀態 | 備註 |
|------|------|------|------|
| Step 9-10 | Dashboard API Client + 頁面 | ✅ 完成 | 4 新建 + 4 修改，含 RBAC 權限 |

### 未完成項目

| Step | 內容 | 狀態 |
|------|------|------|
| Step 11 | Email 模板 | ❌ 待做 |
| Step 12 | NotificationService 擴充 | ❌ 待做 |
| Step 13 | access-check API + 活動列表過濾 | ❌ 待做 |

---

## 🔧 Backend For Loop 修正（2026-03-03）

> 老闆要求：「不要用 for 迴圈，能用 ORM 處理完就不要用 for」

### 修正 1: booth_handler.go — 用 ORM Pluck 取代 slices.IndexFunc

**改動前**：
```go
memberCompanies, _ := h.memberCompanyService.GetMemberCompaniesByMemberID(member.ID)
idx := slices.IndexFunc(memberCompanies, func(mc *models.MemberCompany) bool {
    return mc.Status == "approved"
})
companyID := memberCompanies[idx].CompanyID
```

**改動後**：
```go
approvedIDs, mcErr := h.memberCompanyService.GetApprovedCompanyIDs(member.ID)
if mcErr == nil && len(approvedIDs) > 0 {
    companyID = approvedIDs[0]
}
```

**新增方法**：
- `member_company_repository.go` → `GetApprovedCompanyIDsByMemberID()` 用 GORM `Pluck("company_id", &companyIDs)`
- `member_company_service.go` → `GetApprovedCompanyIDs()` interface + 實作

### 修正 2: event_review_service.go — 用 GORM Preload 取代 N+1 查詢

**改動前**：
```go
// buildResponse 中逐筆查詢 company 和 member
company, _ := s.companyRepo.GetByID(ctx, review.TargetID)
member, _ := s.memberRepo.GetByID(ctx, review.TargetID)
```

**改動後**：
```go
// Repository 層 Preload，Service 層直接取用
if review.Company != nil {
    resp.CompanyName = &review.Company.CompanyName
    resp.BrandName = review.Company.BrandName
}
if review.Member != nil {
    resp.MemberName = &review.Member.Name
    resp.MemberEmail = &review.Member.Email
}
```

**Model 新增 Association**：
```go
// event_review.go — 多態關聯（constraint:- 不建外鍵）
Company *Company `gorm:"foreignKey:TargetID;constraint:-" json:"company,omitempty"`
Member  *Member  `gorm:"foreignKey:TargetID;constraint:-" json:"member,omitempty"`
```

**Repository Preload**：
```go
// 所有查詢方法加上 Preload
db.Preload("Event").Preload("Company").Preload("Member")
```

**Service 建構子簡化**：
```go
// 改動前：4 個依賴
func NewEventReviewService(reviewRepo, eventRepo, companyRepo, memberRepo)
// 改動後：2 個依賴（不再需要 companyRepo/memberRepo）
func NewEventReviewService(reviewRepo, eventRepo)
```

---

## 📱 Frontend 實作細節（2026-03-03）

### Step 14: event-review.ts API 模組

**檔案**: `official_website/src/lib/api/event-review.ts`

匯出型別：
- `ApplyToEventRequest` / `ReviewApplicationRequest` / `BlockTargetRequest`
- `EventReviewResponse` / `EventReviewListResponse` / `EventAccessCheckResponse`

匯出方法 (10 個)：
```
eventReviewApi.applyToEvent(req)
eventReviewApi.getReview(id)
eventReviewApi.listByEvent(eventId, params?)
eventReviewApi.getByEventAndCompany(eventId, companyId)
eventReviewApi.listByCompany(companyId)
eventReviewApi.reviewApplication(id, req)
eventReviewApi.blockTarget(req)
eventReviewApi.unblockTarget(id)
eventReviewApi.deleteReview(id)
eventReviewApi.checkAccess(eventId)
```

### Step 15: EventApplyVendorPage.tsx

**路由**: `/event/:id/apply`（ProtectedRoute）

**頁面狀態機**：
```
loading → 驗證中
not-vendor → 尚未成為品牌商（引導至 /become-vendor）
blocked → 被封鎖（無法參加此活動）
status → 已有審核記錄（pending/approved/rejected）
no-review → 不需審核（直接選攤位）
form → 申請表單（選公司→送出）
```

**流程**：驗證 vendor identity → fetch approved companies → access check → 狀態分流

### Step 16: EventRegisterBoothPage.tsx 攔截

在 `fetchData` 開頭加入 access-check：
- `is_blocked` → toast.error + redirect 到活動頁
- `require_vendor_review && review_status !== 'approved'` → redirect 到 `/event/:id/apply`
- catch 忽略（API 可能未實作）

### Step 17: EventDetailPage.tsx 整合

- 用 `useQuery(['eventAccessCheck', eventId])` 查 access-check（僅登入時）
- 被封鎖 → 顯示「無法參加此活動」
- 需審核且未通過 → 顯示狀態/申請按鈕
- 已通過或不需審核 → 原本的註冊按鈕

### Step 18: EventVendorsPage.tsx Tabs

3 個 Tab：
1. **已確認品牌商** — 原有內容（vendorList）
2. **申請審核** — 審核列表 + 篩選(all/pending/approved/rejected) + 核准/拒絕/封鎖按鈕
3. **封鎖管理** — 封鎖列表 + 解封按鈕

新增 state：`activeMainTab`, `reviews`, `reviewsLoading`, `reviewFilter`, `blocks`, `blocksLoading`, `reviewActionLoading`
新增 function：`fetchReviews`, `fetchBlocks`, `handleReview`, `handleBlock`, `handleUnblock`
