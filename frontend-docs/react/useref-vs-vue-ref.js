// React useRef vs Vue ref —— 兩個名字像但目的相反的 API
// 對應筆記：useRef與Vue的ref-value-可變值不觸發渲染的兩種設計.md
// 這支檔案可以直接 node useref-vs-vue-ref.js 跑第 3 節

// =========================================================
// 1. React：useRef 是為了「避開」響應式
// =========================================================
/*
function Timer() {
  const [count, setCount] = useState(0);
  const timerId = useRef(null);          // 不想讓它出現在畫面上，所以用 ref
  const isComposing = useRef(false);     // IME 組字旗標，同理

  const start = () => {
    timerId.current = setInterval(() => setCount(c => c + 1), 1000);
    // 改 timerId.current 不會重畫；改 count 才會
  };

  useEffect(() => () => clearInterval(timerId.current), []); // cleanup

  return (
    <input
      onCompositionStart={() => { isComposing.current = true; }}
      onCompositionEnd={()   => { isComposing.current = false; }}
      onChange={(e) => {
        if (isComposing.current) return;   // 注音組字中，先不處理
        // ...真正的送出邏輯
      }}
    />
  );
}
*/

// =========================================================
// 2. Vue：ref 是為了「建立」響應式
// =========================================================
/*
<script setup>
import { ref } from 'vue';
const count = ref(0);

function inc() {
  count.value++;      // script 裡必須寫 .value
}
</script>

<template>
  <!-- template 裡不用寫 .value，編譯器認得 count 是 ref，會自動補上 -->
  <button @click="inc">{{ count }}</button>
</template>
*/

// =========================================================
// 3. 手刻一個 mini ref，看清楚 getter / setter 在幹嘛（可執行）
// =========================================================
let activeEffect = null;

function miniRef(initial) {
  let _value = initial;
  const subscribers = new Set();

  return {
    get value() {
      if (activeEffect) subscribers.add(activeEffect);  // 依賴收集 track
      console.log('  [get] 讀到', _value);
      return _value;
    },
    set value(newVal) {
      console.log('  [set] 從', _value, '改成', newVal, '→ 通知', subscribers.size, '個訂閱者');
      _value = newVal;
      subscribers.forEach(fn => fn());                   // 觸發更新 trigger
    },
  };
}

function watchEffect(fn) {
  activeEffect = fn;
  fn();
  activeEffect = null;
}

console.log('--- Vue 式：包一層物件，用 getter/setter 攔截 ---');
const count = miniRef(0);
watchEffect(() => {
  console.log('  畫面重繪，count =', count.value);
});
count.value = 1;
count.value = 2;

console.log('\n--- React 式：同一個物件，改屬性但沒人被通知 ---');
const ref2 = { current: 0 };   // useRef 回傳的就是這種東西
ref2.current = 1;
ref2.current = 2;
console.log('  ref2.current =', ref2.current, '（沒有任何重繪發生）');

console.log('\n--- 為什麼一定要包一層？---');
let plain = 0;
plain = 1;   // 引擎不會通知任何人，這就是 Vue 不能直接用變數的原因
console.log('  重新賦值一個變數，JS 無法攔截，所以才需要 .value / .current');
