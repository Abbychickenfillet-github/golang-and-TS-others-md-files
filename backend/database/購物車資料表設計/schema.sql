-- ============================================================
-- 購物車資料表結構 (MySQL / InnoDB)
-- member · product · order · order_item · cart · cart_item
-- 對照筆記：購物車關聯設計－member-product-order.html
-- ============================================================

CREATE TABLE member (
  id     BIGINT PRIMARY KEY AUTO_INCREMENT,   -- 窄＋遞增主鍵（叢集索引友善）
  name   VARCHAR(100),
  email  VARCHAR(255) UNIQUE
);

CREATE TABLE product (
  id    BIGINT PRIMARY KEY AUTO_INCREMENT,
  name  VARCHAR(200),
  price INT,            -- 現價，以「分」為單位（避免浮點誤差）
  stock INT
);

-- order 是保留字，用反引號
CREATE TABLE `order` (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  member_id  BIGINT NOT NULL,
  status     VARCHAR(20),
  total      INT,                              -- 下單當下的總額快照
  created_at DATETIME,
  CONSTRAINT fk_order_member FOREIGN KEY (member_id) REFERENCES member(id),
  INDEX idx_order_member (member_id)           -- 查「某會員的所有訂單」
);

-- 中間表：把 order ↔ product 的「多對多」拆成兩個「一對多」
CREATE TABLE order_item (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id   BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity   INT,
  unit_price INT,                              -- ★ 價格快照：下單當下的單價
  CONSTRAINT fk_oi_order   FOREIGN KEY (order_id)   REFERENCES `order`(id),
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES product(id),
  INDEX idx_oi_order (order_id),               -- 查「一張訂單的所有明細」
  INDEX idx_oi_product (product_id)            -- 查「某商品被哪些訂單買過」
);

-- ----- 購物車（結帳前的暫存）-----
CREATE TABLE cart (
  id        BIGINT PRIMARY KEY AUTO_INCREMENT,
  member_id BIGINT NOT NULL UNIQUE,            -- 一個會員一台車
  CONSTRAINT fk_cart_member FOREIGN KEY (member_id) REFERENCES member(id)
);

CREATE TABLE cart_item (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  cart_id    BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity   INT,                              -- 注意：沒有價格欄，現價即時撈 product.price
  CONSTRAINT fk_ci_cart    FOREIGN KEY (cart_id)    REFERENCES cart(id),
  CONSTRAINT fk_ci_product FOREIGN KEY (product_id) REFERENCES product(id),
  UNIQUE KEY uq_cart_product (cart_id, product_id) -- 同車同商品只一列，再加件就 quantity+1
);

-- ============================================================
-- PostgreSQL 版差異備註：
--   AUTO_INCREMENT      → BIGSERIAL 或 GENERATED ALWAYS AS IDENTITY
--   `order` 反引號      → 用雙引號 "order" 或乾脆改表名 orders
--   INDEX 寫在表內      → PG 要分開：CREATE INDEX idx_order_member ON orders(member_id);
--   想避免回表          → CREATE INDEX ... (member_id) INCLUDE (status);  -- Index-Only Scan
-- ============================================================
