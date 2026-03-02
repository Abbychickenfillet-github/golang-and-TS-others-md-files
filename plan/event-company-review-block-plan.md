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
