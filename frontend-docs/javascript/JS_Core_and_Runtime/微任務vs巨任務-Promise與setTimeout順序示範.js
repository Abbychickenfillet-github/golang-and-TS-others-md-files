// 示範：微任務與（巨）任務的分界，不是「同步或非同步」，也不是「任務大小」，而是「回呼放進哪一條佇列、什麼時候被跑」。
// Promise.then 與 setTimeout 都是非同步，卻一個是微任務、一個是任務。
// 對應筆記：事件循環-Event-Loop-微任務與巨任務.md 的「宏/微任務是看時間長短分的嗎？」
// 執行：node 微任務vs巨任務-Promise與setTimeout順序示範.js

console.log('1 同步：目前這個任務本身的一部分，不進任何佇列');

setTimeout(() => {
  console.log('6 setTimeout：任務佇列（要等微任務全部清空，才輪到它）');

  // 第二段：微任務裡再排微任務，仍然先於下一個任務
  console.log('— 第二段：微任務裡再排微任務 —');
  setTimeout(() => console.log('B3 setTimeout：任務'), 0);
  Promise.resolve().then(() => {
    console.log('B1 微任務 A');
    Promise.resolve().then(() => console.log('B2 微任務 B：A 裡新排的，仍先於 B3'));
  });
}, 0);

Promise.resolve().then(() => console.log('3 Promise.then：微任務'));
queueMicrotask(() => console.log('4 queueMicrotask：微任務'));
(async () => {
  await null;
  console.log('5 await 之後的程式：微任務');
})();

console.log('2 同步結束（目前任務做完，stack 清空，接著才清微任務）');
