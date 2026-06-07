"""
HashMap 練習 — Python dict（內建雜湊表）
執行：python python-dict-練習.py
"""

from collections import defaultdict


def section(title: str) -> None:
    print(f"\n=== {title} ===\n")


def main() -> None:
    section("1. 基本 CRUD")

    inventory: dict[str, dict] = {
        "sku-001": {"name": "攤位 A", "qty": 3},
        "sku-002": {"name": "攤位 B", "qty": 1},
    }

    # 查詢
    print("sku-001:", inventory["sku-001"])
    # 所以這邊的物件可以用中括號來查詢？可以但是用GET比較好會避免跑出型別錯誤

    # 安全查詢（key 不存在不爆）
    print("sku-999 get:", inventory.get("sku-999"))
    print("sku-999 get 預設:", inventory.get("sku-999", "無此商品"))

    # 覆蓋（Key 唯一）
    inventory["sku-001"] = {"name": "攤位 A（更新）", "qty": 5}
    print("覆蓋後:", inventory["sku-001"])

    # 刪除
    del inventory["sku-002"]
    print("刪除後 keys:", list(inventory.keys()))

    section("2. 迭代與插入順序（3.7+ 保留插入順序）")

    for sku, item in inventory.items():
        print(f"  {sku} → {item}")

    section("3. 計數器（跟 JS Map 練習對照）")

    def count_chars(text: str) -> dict[str, int]:
        freq: dict[str, int] = {}
        for ch in text:
            freq[ch] = freq.get(ch, 0) + 1
        return freq

    print("abba:", count_chars("abba"))

    section("4. defaultdict — 省略 .get(ch, 0)")

    # 一行兩件事：
    #   左邊  tags: defaultdict[str, list]  → 型別註記（type hint），用 [] 包泛型參數
    #         告訴 IDE 和讀者：「tags 是一個 defaultdict，key 是 str、value 是 list」
    #   右邊  defaultdict(list)              → 呼叫建構式（call constructor），用 () 包工廠函式
    #         真的建一個 defaultdict 物件，傳入 list 作為「key 不存在時要產生什麼預設值」的工廠
    # 注意：傳 list（函式本身）才對，不能傳 list()（已建好的空 list 物件，不是 callable）
    tags: defaultdict[str, list] = defaultdict(list)
    tags["go"].append("redis")     # "go" 不存在 → 自動建 []，再 append "redis"
    tags["go"].append("docker")    # "go" 已存在 → 直接 append "docker"
    tags["py"].append("fastapi")   # "py" 不存在 → 自動建 []，再 append "fastapi"
    print(dict(tags))              # 轉成一般 dict 再印，去掉 defaultdict(...) 外殼

    section("5. Key 必須可雜湊（hashable）")

    # ✅ 字串、數字、tuple 當 key
    ok: dict[tuple[str, int], str] = {("B", 12): "攤位"}
    print("tuple key:", ok[("B", 12)])

    # ❌ list 不能當 key（會 TypeError）
    try:
        bad: dict[list, int] = {[1, 2]: 1}  # type: ignore
    except TypeError as e:
        print("list 當 key 錯誤:", e)

    section("6. 跟 Java HashMap 對照表")

    print(
        """
  dict[key]           ≈  map.get(key)     取值
  dict[key] = v       ≈  map.put(k, v)    新增/覆蓋
  del dict[key]       ≈  map.remove(k)    刪除
  key in dict         ≈  map.containsKey  是否存在
  len(dict)           ≈  map.size()       筆數
        """
    )

    print("✅ python-dict-練習 完成")


if __name__ == "__main__":
    main()
