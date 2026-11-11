// 測試用的極簡 note-quiz.js：提供 NoteQuiz.mount，記下呼叫次數；立即執行函式回傳物件；
window.NoteQuiz = (function () {
  // 回傳只有 mount 的物件；mount 被呼叫時累加計數；
  return { mount: function () { window.__quizMounts = (window.__quizMounts || 0) + 1; } };
})();
