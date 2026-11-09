"""
示範：同一處理程序的「執行緒」共用變數；不同「處理程序」各有各的變數，要溝通得走 IPC（這裡用 Pipe）。
對應筆記：延遲Latency-DNS遞迴查詢-TCP握手-行動網路-OSI七層串聯.md 的 (x)(y)
執行：python ipc-demo-執行緒共享記憶體vs處理程序隔離與Pipe溝通.py
"""
import multiprocessing as mp
import os
import threading
from functools import partial

print = partial(print, flush=True)  # 讓父子處理程序的輸出照時間順序顯示

counter = {"n": 0}  # 模組層級變數，代表「辦公室裡的一份資產」


def bump(who: str) -> None:
    counter["n"] += 1
    print(f"  [{who}] pid={os.getpid()} 把 counter 加 1，現在在我這裡看到 n={counter['n']}")


def child_send(conn) -> None:
    conn.send(f"我是子處理程序 pid={os.getpid()}，我這邊的 n={counter['n']}")
    conn.close()


if __name__ == "__main__":
    print(f"主程式 pid={os.getpid()}，一開始 n={counter['n']}\n")

    print("1) 執行緒：同一個處理程序，共用同一份 counter")
    t = threading.Thread(target=bump, args=("執行緒",))
    t.start(); t.join()
    print(f"  主程式回來看：n={counter['n']}   <- 看得到，因為共用記憶體\n")

    counter["n"] = 0  # 歸零，才看得出「子處理程序改了、主程式沒變」
    print("2) 處理程序：各有各的記憶體，子處理程序改的是它自己的那一份（主程式的 n 先歸零為 0）")
    p = mp.Process(target=bump, args=("子處理程序",))
    p.start(); p.join()
    print(f"  主程式回來看：n={counter['n']}   <- 還是 0，子處理程序改的是它自己的那一份\n")

    print("3) 要溝通就得走 IPC：用 Pipe 讓子處理程序把話送回來")
    parent_conn, child_conn = mp.Pipe()
    p = mp.Process(target=child_send, args=(child_conn,))
    p.start()
    print(f"  主程式從 Pipe 收到：{parent_conn.recv()}")
    p.join()
