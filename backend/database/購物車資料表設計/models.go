package shop

import (
	"time"

	"gorm.io/gorm"
)

// ============================================================
// 購物車 GORM 模型
// 對照筆記：購物車關聯設計－member-product-order.html
// 對照 DDL ：schema.sql
// ============================================================

type Member struct {
	ID     uint   `gorm:"primaryKey"`
	Name   string
	Email  string `gorm:"uniqueIndex"`
	Orders []Order // has many：一個會員有多張訂單
	Cart   Cart    // has one ：一個會員一台購物車
}

type Product struct {
	ID    uint `gorm:"primaryKey"`
	Name  string
	Price int // 現價，以「分」為單位（避免 float 誤差）
	Stock int
}

type Order struct {
	ID        uint   `gorm:"primaryKey"`
	MemberID  uint   `gorm:"index"` // 外鍵 + 索引：查某會員的訂單
	Status    string `gorm:"index"`
	Total     int    // 下單當下的總額快照
	CreatedAt time.Time
	Items     []OrderItem // has many
}

type OrderItem struct {
	ID        uint `gorm:"primaryKey"`
	OrderID   uint `gorm:"index"` // 外鍵 → order
	ProductID uint `gorm:"index"` // 外鍵 → product
	Quantity  int
	UnitPrice int // ★ 價格快照：下單當下的單價，之後 product 改價也不動
}

type Cart struct {
	ID       uint `gorm:"primaryKey"`
	MemberID uint `gorm:"uniqueIndex"` // 一個會員一台車
	Items    []CartItem
}

type CartItem struct {
	ID        uint `gorm:"primaryKey"`
	CartID    uint `gorm:"index"`
	ProductID uint `gorm:"index"`
	Quantity  int // 沒有價格欄位：購物車顯示現價，即時撈 product.price
}

// ------------------------------------------------------------
// 結帳：把購物車轉成訂單，價格在這一刻凍結進 order_item。
// 整個流程包在交易裡，確保「建訂單 + 清空車」全成功或全失敗。
// ------------------------------------------------------------
func Checkout(db *gorm.DB, memberID uint) (*Order, error) {
	var order Order
	err := db.Transaction(func(tx *gorm.DB) error {
		var cart Cart
		if err := tx.Preload("Items").
			Where("member_id = ?", memberID).First(&cart).Error; err != nil {
			return err
		}

		order = Order{MemberID: memberID, Status: "pending"}
		total := 0
		for _, ci := range cart.Items {
			var p Product
			if err := tx.First(&p, ci.ProductID).Error; err != nil {
				return err
			}
			// （實務上這裡還要檢查並扣 p.Stock 庫存）
			order.Items = append(order.Items, OrderItem{
				ProductID: p.ID,
				Quantity:  ci.Quantity,
				UnitPrice: p.Price, // ★ 凍結現價成快照
			})
			total += p.Price * ci.Quantity
		}
		order.Total = total

		if err := tx.Create(&order).Error; err != nil {
			return err
		}
		// 清空購物車
		return tx.Where("cart_id = ?", cart.ID).Delete(&CartItem{}).Error
	})
	if err != nil {
		return nil, err
	}
	return &order, nil
}
