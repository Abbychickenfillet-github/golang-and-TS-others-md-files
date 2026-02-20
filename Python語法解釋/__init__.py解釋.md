# Python `__init__.py` 解釋

## 一句話說明

`__init__.py` 是讓資料夾變成「可 import 的套件 (package)」的標記檔。

---

## 為什麼需要它？

```
# 沒有 __init__.py 的資料夾結構
models/
    user.py
    order.py

# Python 不認得這是套件
from models import User  # ❌ ModuleNotFoundError
```

```
# 有 __init__.py 的資料夾結構
models/
    __init__.py    ← 加上這個
    user.py
    order.py

# 現在可以 import 了
from models import User  # ✅ 成功
```

---

## `__init__.py` 可以是空的嗎？

**可以！** 空的 `__init__.py` 就只是標記「這是一個套件」。

```python
# models/__init__.py
# （空檔案）

# 使用時要完整路徑
from models.user import User
from models.order import Order
```

---

## 常見用法：統一匯出

在 `__init__.py` 裡 re-export，讓 import 更乾淨：

```python
# models/__init__.py
from .user import User
from .order import Order
from .product import Product
```

```python
# 使用時 - 簡潔！
from models import User, Order, Product

# 而不用這樣寫 - 冗長
from models.user import User
from models.order import Order
from models.product import Product
```

---

## `.` 點號是什麼意思？

```python
# models/__init__.py

from .user import User      # . = 當前資料夾 (models/)
from ..utils import helper  # .. = 上一層資料夾
```

| 符號 | 意思 | 等於 |
|------|------|------|
| `.` | 當前資料夾 | `from models.user` |
| `..` | 上一層資料夾 | `from parent_folder` |
| `...` | 上兩層資料夾 | 很少用 |

這叫做 **相對導入 (relative import)**。

---

## 實際範例：我們專案的 models

```
backend/
    app/
        models/
            __init__.py      ← 統一匯出
            user.py
            member.py
            order.py
            event.py
```

```python
# backend/app/models/__init__.py
from .user import User
from .member import Member
from .order import Order
from .event import Event

# 這樣在其他地方可以直接：
from app.models import User, Member, Order, Event
```

---

## `__init__.py` 還能做什麼？

### 1. 定義 `__all__`（控制 `*` 匯出什麼）

```python
# models/__init__.py
from .user import User
from .order import Order
from .internal import _PrivateClass  # 內部用的

__all__ = ["User", "Order"]  # 只公開這些

# 使用時
from models import *  # 只會 import User, Order，不會 import _PrivateClass
```

### 2. 套件初始化程式碼

```python
# models/__init__.py
print("models 套件被載入了！")  # 第一次 import 時會執行

# 初始化設定
DEFAULT_PAGE_SIZE = 20
```

### 3. 版本資訊

```python
# mypackage/__init__.py
__version__ = "1.0.0"
__author__ = "Abby"

# 使用時
import mypackage
print(mypackage.__version__)  # 1.0.0
```

---

## Python 3.3+ 的變化

Python 3.3 之後，**空資料夾也能當套件**（叫 namespace package）。

但實務上還是建議加 `__init__.py`，因為：
1. 更明確表示這是套件
2. 可以統一匯出
3. 相容性更好

---

## 快速總結

| 問題 | 答案 |
|------|------|
| `__init__.py` 是什麼？ | 讓資料夾變成可 import 的套件 |
| 可以是空的嗎？ | ✅ 可以 |
| 常見用法？ | 統一 re-export 模組 |
| `.` 是什麼？ | 相對導入，指當前資料夾 |
| `__all__` 是什麼？ | 控制 `from x import *` 匯出哪些 |

---

## 對比 JavaScript

| Python | JavaScript |
|--------|------------|
| `__init__.py` | `index.js` |
| `from models import User` | `import { User } from './models'` |
| 相對導入 `.` | 相對路徑 `./` |

```javascript
// JavaScript - models/index.js（類似 __init__.py）
export { User } from './user.js';
export { Order } from './order.js';

// 使用時
import { User, Order } from './models';
```
