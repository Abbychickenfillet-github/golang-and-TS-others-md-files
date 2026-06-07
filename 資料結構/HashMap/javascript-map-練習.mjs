/**
 * HashMap 練習 — JavaScript（Map + Object）
 * 執行：node javascript-map-練習.mjs
 */

console.log("=== 1. Map（最接近 Java HashMap）===\n");

const inventory = new Map();
inventory.set("sku-001", { name: "攤位 A", qty: 3 });
inventory.set("sku-002", { name: "攤位 B", qty: 1 });

// 覆蓋同一個 Key
inventory.set("sku-001", { name: "攤位 A（更新）", qty: 5 });

console.log("get:", inventory.get("sku-001"));
console.log("has sku-999:", inventory.has("sku-999"));
console.log("size:", inventory.size);

// 刪除
inventory.delete("sku-002");
console.log("刪除後 size:", inventory.size);

// 迭代（插入順序）
console.log("\n迭代 keys:");
for (const key of inventory.keys()) {
  console.log(" ", key, "→", inventory.get(key));
}

console.log("\n=== 2. Object {}（日常 JSON 風格）===\n");

const booth = { id: "B12", status: "available" };
booth.status = "sold"; // 覆蓋 value
console.log("booth:", booth);

// Key 會變字串
const weird = {};
weird[1] = "數字 1";
weird["1"] = "字串 1"; // 覆蓋上一格
console.log("obj[1] 與 obj['1'] 同一格:", weird);

console.log("\n=== 3. 計數器（面試常考）===\n");

function countChars(text) {
  const freq = new Map();
  for (const ch of text) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  return freq;
}

const freq = countChars("abba");
console.log("abba 字元次數:", Object.fromEntries(freq));

console.log("\n=== 4. Map vs Object 快速選擇 ===\n");
console.log(`
  用 Map：Key 型別多樣、需要 .size、頻繁增刪、當純 HashMap 用
  用 Object：要 JSON、API 回傳、固定欄位結構
`);

console.log("✅ javascript-map-練習 完成");
