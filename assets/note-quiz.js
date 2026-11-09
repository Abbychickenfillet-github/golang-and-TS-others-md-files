/* note-quiz.js — 互動筆記共用練習題
   用法：頁面放 <div id="fills"></div> <div id="tf"></div> <div id="essay"></div>
         以及 #showAll、#hideAll 兩個按鈕（可省略），再呼叫
         NoteQuiz.mount({ fills: [[前, 答案, 後]], tf: [{q, a, e}], essay: [{q, m}] })
   題目內容允許簡單 HTML（例如 <code> 與名詞 span），載入後會重新填入名詞 hover */
// 在 window 上掛一個全域物件 NoteQuiz；用「立即執行函式」包起來，裡面的變數不會污染全域
window.NoteQuiz = (function () {
  // mount：把題目資料畫到頁面上；data 是頁面傳進來的題目物件
  function mount(data) {
    // 找到放填空題的容器 <div id="fills">
    var fills = document.getElementById('fills')
    // 容器存在、而且資料裡有 fills 才處理填空題
    if (fills && data.fills) {
      // 逐題處理；f 是 [前文, 答案, 後文]，i 是第幾題（從 0 開始）
      data.fills.forEach(function (f, i) {
        // 建立一題的外框 <div>
        var d = document.createElement('div')
        // 套用 .fill 樣式（見 note-interactive.css）
        d.className = 'fill'
        // 組出內容：題號＋前文＋可點擊的填空格（tabindex 讓鍵盤可聚焦、role 與 aria-label 給讀屏軟體）＋後文
        d.innerHTML = (i + 1) + '. ' + f[0] + '<span class="blank" tabindex="0" role="button" aria-label="點擊顯示答案">' + f[1] + '</span>' + f[2]
        // 把這一題放進容器
        fills.appendChild(d)
      })
      // 事件委派：把點擊事件綁在容器上，由 e.target 判斷點到的是不是填空格；點到就切換 .on（顯示或隱藏答案）
      fills.addEventListener('click', function (e) { if (e.target.classList.contains('blank')) e.target.classList.toggle('on') })
      // 鍵盤操作：填空格聚焦時按 Enter 或空白鍵，效果等同點擊
      fills.addEventListener('keydown', function (e) {
        // 按的是 Enter 或空白鍵，而且目標是填空格；preventDefault 避免空白鍵讓頁面往下捲，再切換答案
        if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('blank')) { e.preventDefault(); e.target.classList.toggle('on') }
      })
      // 「全部顯示」按鈕（可省略，所以後面要先判斷存不存在）
      var show = document.getElementById('showAll')
      // 「全部隱藏」按鈕
      var hide = document.getElementById('hideAll')
      // 有「全部顯示」按鈕才綁事件：把容器裡每個填空格都加上 .on
      if (show) show.addEventListener('click', function () { fills.querySelectorAll('.blank').forEach(function (b) { b.classList.add('on') }) })
      // 有「全部隱藏」按鈕才綁事件：把每個填空格的 .on 拿掉
      if (hide) hide.addEventListener('click', function () { fills.querySelectorAll('.blank').forEach(function (b) { b.classList.remove('on') }) })
    }

    // 找到放是非題的容器 <div id="tf">
    var tf = document.getElementById('tf')
    // 容器存在、而且資料裡有 tf 才處理是非題
    if (tf && data.tf) {
      // 逐題處理；item 是 {q: 題目, a: 正確答案(true/false), e: 解釋}
      data.tf.forEach(function (item, i) {
        // 建立一題的外框 <div>
        var d = document.createElement('div')
        // 套用 .quiz 樣式
        d.className = 'quiz'
        // 組出題目文字（含題號）
        d.innerHTML = '<div class="q">' + (i + 1) + '. ' + item.q + '</div>' +
          // 「對」「錯」兩個按鈕（data-v 記下按鈕代表 1 或 0）與一個放回饋的空 <div class="fb">
          '<div class="opt"><button type="button" data-v="1">對</button><button type="button" data-v="0">錯</button></div><div class="fb"></div>'
        // 對這一題裡的每個按鈕各綁一個點擊事件
        d.querySelectorAll('.opt button').forEach(function (b) {
          // 按下按鈕時
          b.addEventListener('click', function () {
            // 判斷對錯：按鈕代表的值（'1' 為「對」）轉成 true／false，是否等於這題的正確答案 item.a
            var ok = (b.dataset.v === '1') === item.a
            // 找到這題的回饋框
            var fb = d.querySelector('.fb')
            // 換成 .fb.show.right 或 .fb.show.wrong，顯示回饋並套用對應顏色
            fb.className = 'fb show ' + (ok ? 'right' : 'wrong')
            // 回饋文字：先說對或錯，再接上這題的解釋 item.e
            fb.innerHTML = (ok ? '答對了。' : '再想一下。') + item.e
            // 解釋裡可能有名詞 span，重新填入名詞 hover（函式由各主題的 *-terms.js 提供，沒有就略過）
            if (window.fillNoteTerms) window.fillNoteTerms()
          })
        })
        // 把這一題放進容器
        tf.appendChild(d)
      })
    }

    // 找到放申論題的容器 <div id="essay">（變數取名 es）
    var es = document.getElementById('essay')
    // 容器存在、而且資料裡有 essay 才處理申論題
    if (es && data.essay) {
      // 逐題處理；item 是 {q: 題目, m: 參考答案}
      data.essay.forEach(function (item, i) {
        // 建立一題的外框 <div>
        var d = document.createElement('div')
        // 套用 .quiz 樣式
        d.className = 'quiz'
        // 組出題目文字、作答用的 textarea（aria-label 給讀屏軟體）
        d.innerHTML = '<div class="q">' + (i + 1) + '. ' + item.q + '</div><textarea aria-label="你的答案"></textarea>' +
          // 「顯示參考答案」按鈕，與一個放參考答案的空 <div class="model">
          '<div class="toolbar"><button type="button">顯示參考答案</button></div><div class="model"></div>'
        // 找到剛建出來的參考答案區
        var m = d.querySelector('.model')
        // 把參考答案寫進去（預設由 CSS 隱藏）
        m.innerHTML = item.m
        // 按「顯示參考答案」就切換 .show，顯示或收起答案
        d.querySelector('button').addEventListener('click', function () { m.classList.toggle('show') })
        // 把這一題放進容器
        es.appendChild(d)
      })
    }
    // 全部題目畫完後，重新填入頁面上的名詞 hover（沒有 fillNoteTerms 就略過）
    if (window.fillNoteTerms) window.fillNoteTerms()
  }
  // 只對外公開 mount，頁面用 NoteQuiz.mount({...}) 呼叫
  return { mount: mount }
})()
