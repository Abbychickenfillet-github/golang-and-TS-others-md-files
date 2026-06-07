"""
簡易 HashMap 實作（教學用，對應 Java：陣列 + 鏈結串列處理碰撞）
執行：python 簡易HashMap實作-練習.py

注意：這是「看得懂原理」的版本，不是 production 等級。
"""

from __future__ import annotations

from typing import Any, Iterator


class _Node:
    __slots__ = ("key", "value", "next")

    def __init__(self, key: Any, value: Any, next_: _Node | None = None) -> None:
        self.key = key
        self.value = value
        self.next = next_


class SimpleHashMap:
    """桶（bucket）= 陣列每一格；碰撞 = 同一格用鏈結串列串起來。"""

    def __init__(self, capacity: int = 8) -> None:
        self._capacity = max(4, capacity)
        self._buckets: list[_Node | None] = [None] * self._capacity
        self._size = 0

    def _index(self, key: Any) -> int:
        # 對應 Java：hash(key) % table.length
        return hash(key) % self._capacity

    def put(self, key: Any, value: Any) -> None:
        idx = self._index(key)
        node = self._buckets[idx]

        while node:
            if node.key == key:
                node.value = value  # Key 已存在 → 覆蓋
                return
            node = node.next

        # 插到鏈結串列頭（新節點）
        self._buckets[idx] = _Node(key, value, self._buckets[idx])
        self._size += 1

    def get(self, key: Any, default: Any = None) -> Any:
        node = self._buckets[self._index(key)]
        while node:
            if node.key == key:
                return node.value
            node = node.next
        return default

    def delete(self, key: Any) -> bool:
        idx = self._index(key)
        node = self._buckets[idx]
        prev: _Node | None = None

        while node:
            if node.key == key:
                if prev:
                    prev.next = node.next
                else:
                    self._buckets[idx] = node.next
                self._size -= 1
                return True
            prev, node = node, node.next
        return False

    def __len__(self) -> int:
        return self._size

    def debug_buckets(self) -> None:
        """印出每個 bucket 的鏈結串列（觀察碰撞）。"""
        for i, head in enumerate(self._buckets):
            chain: list[str] = []
            node = head
            while node:
                chain.append(f"{node.key!r}:{node.value!r}")
                node = node.next
            if chain:
                print(f"  bucket[{i}] → " + " → ".join(chain))


def demo_collision() -> None:
    print("=== 故意製造碰撞（capacity=4，字串 hash 可能落在同一格）===\n")
    m = SimpleHashMap(capacity=4)

    # 這些 key 在 capacity=4 時有機會進同一 bucket（依 Python hash 而定）
    keys = ["a", "e", "i", "collision-demo"]
    for k in keys:
        m.put(k, f"val-{k}")

    print(f"size={len(m)}")
    m.debug_buckets()
    print(f"\nget('a') = {m.get('a')}")
    print(f"delete('a') = {m.delete('a')}, size={len(m)}")
    m.debug_buckets()


def compare_with_builtin_dict() -> None:
    print("\n=== 內建 dict 一樣是 O(1) 平均，但底層更複雜 ===\n")
    d = {"x": 1, "y": 2}
    print("dict:", d, "len=", len(d))


if __name__ == "__main__":
    demo_collision()
    compare_with_builtin_dict()
    print("\n✅ 簡易HashMap實作-練習 完成")
