# 超參數 (Hyperparameter)

超參數是「在訓練開始之前，由人手動設定」的參數。它不是模型自己從資料裡學出來的，而是你拿來「控制訓練過程」的旋鈕。

## 🔑 超參數 vs 參數（兩者最容易搞混）

| | 參數 (Parameter) | 超參數 (Hyperparameter) |
|---|---|---|
| 誰決定的 | 模型自己學出來 | 人在訓練前手動設定 |
| 何時決定 | 訓練過程中不斷更新 | 訓練開始前就固定 |
| 例子 | 權重 (weights)、偏差 (bias) | learning rate、`batch_size`、epoch 數 |
| 會不會被梯度下降更新 | 會 | 不會 |

一句話：**參數是模型「學」到的，超參數是你「調」出來的。**

## 🧩 常見的超參數

* **Learning Rate（學習率）**：每次更新權重的步伐大小。太大會跳過最佳解、震盪不收斂；太小則訓練很慢。
* **[[batch_size]]（批次大小）**：一次餵幾筆樣本給模型再更新一次權重。詳見 [[batch_size]] 筆記。
* **Epoch 數**：整個資料集要重複看幾遍。太少欠擬合、太多過擬合，詳見 [[batch_size]]。
* **網路層數 / 每層神經元數**：模型的容量大小。
* **Dropout rate、正則化係數 (L1/L2)**：用來防止過擬合的強度。
* **Optimizer 選擇**：例如 SGD、Adam，以及它的動量 (momentum) 等設定。

## ⚙️ 為什麼超參數重要？

模型最後表現好不好，很大一部分是「超參數調得好不好」決定的。同一個模型架構，learning rate 或 batch_size 設錯，可能就完全訓練不起來。所以實務上有一整個領域叫 **超參數調校 (Hyperparameter Tuning)**：

* **Grid Search（網格搜尋）**：列出所有想試的組合，全部跑一遍。最暴力、最花時間。
* **Random Search（隨機搜尋）**：在範圍內隨機抽組合，通常比 Grid Search 更有效率。
* **Bayesian Optimization（貝氏最佳化）**：根據已試過的結果，聰明地猜下一組該試什麼。
* 工具：Optuna、Ray Tune、Weights & Biases Sweeps 等。

## 🔗 相關筆記

* [[batch_size]] — Epoch、Batch Size、Iteration 的關係與過擬合/欠擬合
