"""
用筆電鏡頭 + 本地 YOLO 記錄「你在做什麼」：偵測到的物件 → 粗略活動 → 狀態改變才寫一筆 SQLite。
筆記：TimeLog專案/用筆電鏡頭做行為記錄-YOLO本地實作與下一步.md

安裝：pip install ultralytics opencv-python
執行：python yolo_webcam_log.py --show          （按 q 結束）
      python yolo_webcam_log.py --cam 1         （換鏡頭）
      python yolo_webcam_log.py --summary       （只看資料庫裡的統計，不開鏡頭）
"""
import argparse
import sqlite3
import time
from collections import Counter
from datetime import datetime
from pathlib import Path

# COCO 資料集裡跟「桌前活動」有關的類別編號；0 人、41 杯子、63 筆電、66 鍵盤、67 手機、73 書
PERSON, CUP, LAPTOP, KEYBOARD, PHONE, BOOK = 0, 41, 63, 66, 67, 73
WATCH_CLASSES = [PERSON, CUP, LAPTOP, KEYBOARD, PHONE, BOOK]


def classify(class_ids):
    """把這一幀偵測到的類別編號集合，換成一個活動標籤。沒有人就是 away。"""
    ids = set(class_ids)
    if PERSON not in ids:
        return "away"
    if PHONE in ids:
        return "phone"
    if BOOK in ids:
        return "reading"
    if CUP in ids:
        return "drinking"
    return "at_desk"


class ActivityTracker:
    """去抖動：新標籤要連續維持 stable_sec 秒才算數，避免偵測閃一下就寫一筆。
    離開（away）另外要求 away_sec 秒，因為人短暫偏出鏡頭很常見。"""

    def __init__(self, stable_sec=5.0, away_sec=10.0):
        self.stable_sec = stable_sec
        self.away_sec = away_sec
        self.current = None  # 已確認的活動
        self.since = None  # 已確認活動的開始時間
        self.candidate = None  # 正在觀察的新標籤
        self.candidate_since = None

    def update(self, label, now):
        """餵入這一幀的標籤；有確認的改變時回傳 (舊活動, 舊活動持續秒數, 新活動)，否則回傳 None。"""
        if self.current is None:  # 第一幀直接當起點
            self.current, self.since = label, now
            return (None, 0.0, label)
        if label == self.current:  # 回到原狀態，取消觀察中的候選
            self.candidate = self.candidate_since = None
            return None
        if label != self.candidate:  # 出現新的候選，從現在開始計時
            self.candidate, self.candidate_since = label, now
            return None
        need = self.away_sec if label == "away" else self.stable_sec
        if now - self.candidate_since < need:
            return None
        old, duration = self.current, self.candidate_since - self.since
        self.current, self.since = label, self.candidate_since
        self.candidate = self.candidate_since = None
        return (old, duration, label)


def open_db(path):
    db = sqlite3.connect(path)
    db.execute(
        "CREATE TABLE IF NOT EXISTS events ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, prev_activity TEXT, "
        "prev_seconds REAL, activity TEXT NOT NULL, snapshot TEXT)"
    )
    return db


def print_summary(db):
    rows = db.execute(
        "SELECT prev_activity, SUM(prev_seconds) FROM events WHERE prev_activity IS NOT NULL GROUP BY prev_activity"
    ).fetchall()
    if not rows:
        print("資料庫還沒有可統計的紀錄")
        return
    for name, sec in sorted(rows, key=lambda r: -r[1]):
        print(f"{name:10s} {sec / 60:7.1f} 分鐘")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cam", type=int, default=0, help="鏡頭編號，內建通常是 0")
    ap.add_argument("--model", default="yolo11n.pt", help="nano 版最輕；第一次執行會自動下載")
    ap.add_argument("--conf", type=float, default=0.5, help="信心門檻")
    ap.add_argument("--fps", type=float, default=3.0, help="每秒推論幾次，3 對桌前行為已夠")
    ap.add_argument("--stable-sec", type=float, default=5.0)
    ap.add_argument("--away-sec", type=float, default=10.0)
    ap.add_argument("--db", default="timelog_events.db")
    ap.add_argument("--snap-dir", default="snapshots", help="狀態改變時存的影格，只存在本機")
    ap.add_argument("--show", action="store_true", help="顯示預覽視窗")
    ap.add_argument("--summary", action="store_true", help="只印資料庫統計後結束")
    args = ap.parse_args()

    db = open_db(args.db)
    if args.summary:
        print_summary(db)
        return

    import cv2  # 延後匯入，--summary 時不需要
    from ultralytics import YOLO

    model = YOLO(args.model)
    cap = cv2.VideoCapture(args.cam, cv2.CAP_DSHOW)  # Windows 用 DSHOW 開得最快最穩
    if not cap.isOpened():
        raise SystemExit(f"打不開鏡頭 {args.cam}，檢查是否被別的程式（Teams、瀏覽器）占用")
    Path(args.snap_dir).mkdir(exist_ok=True)

    tracker = ActivityTracker(args.stable_sec, args.away_sec)
    interval = 1.0 / args.fps
    last_infer = 0.0
    counts = Counter()
    print("開始偵測，按 q 結束" if args.show else "開始偵測，Ctrl+C 結束")
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            now = time.time()
            if now - last_infer < interval:  # 控制推論頻率，其餘幀只用來顯示
                if args.show:
                    cv2.imshow("timelog", frame)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
                continue
            last_infer = now
            result = model(frame, classes=WATCH_CLASSES, conf=args.conf, verbose=False)[0]
            class_ids = [int(c) for c in result.boxes.cls]
            label = classify(class_ids)
            counts[label] += 1
            changed = tracker.update(label, now)
            if changed:
                old, seconds, new = changed
                stamp = datetime.fromtimestamp(now).strftime("%Y-%m-%d %H:%M:%S")
                snap = str(Path(args.snap_dir) / (datetime.fromtimestamp(now).strftime("%Y%m%d-%H%M%S") + f"-{new}.jpg"))
                cv2.imwrite(snap, frame)
                db.execute(
                    "INSERT INTO events (ts, prev_activity, prev_seconds, activity, snapshot) VALUES (?,?,?,?,?)",
                    (stamp, old, seconds, new, snap),
                )
                db.commit()
                print(f"[{stamp}] {old} ({seconds:.0f}s) → {new}")
            if args.show:
                cv2.imshow("timelog", result.plot())
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
    except KeyboardInterrupt:
        pass
    finally:
        cap.release()
        cv2.destroyAllWindows()
        db.close()


if __name__ == "__main__":
    main()
