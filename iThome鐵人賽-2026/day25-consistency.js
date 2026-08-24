/**
 * Day 25：一致性 —— 不一致的參數順序與命名如何造成真的 bug
 * 執行：node day25-consistency.js
 */
const line = (t) => console.log('\n' + '─'.repeat(58) + '\n' + t + '\n' + '─'.repeat(58));

// ── 重構前：同一個模組，參數順序不一致 ──────────────────────
function createUserBefore(name, email) {
  return { name, email };
}
// 注意：這裡的參數順序跟 createUserBefore 相反
function renameUserBefore(email, name) {
  return { name, email };
}

line('Part 1｜參數順序不一致，造成的真實 bug');

const created = createUserBefore('Abby', 'abby@example.com');
console.log('  建立時：', created);

// 呼叫端很自然地「照 createUser 的順序」去呼叫 renameUser —— 這是一個完全合理的假設
const renamedWrong = renameUserBefore(created.name, created.email);
console.log('  呼叫端照直覺（跟 create 同樣順序）呼叫 rename：', renamedWrong);
console.log('  → name 和 email 的值被互換了，但因為兩個都是字串，語言完全不會報錯');
console.log('  → 這種 bug 通常要等到 email 欄位被拿去發信才會被發現');

// ── 重構後：統一用 options object，順序不再是問題 ───────────
function createUserAfter({ name, email }) {
  return { name, email };
}
function renameUserAfter({ name, email }) {
  return { name, email };
}

line('Part 2｜改用 options object 之後，順序不存在了');

const created2 = createUserAfter({ name: 'Abby', email: 'abby@example.com' });
const renamed2 = renameUserAfter({ name: created2.name, email: created2.email });
console.log('  建立：', created2);
console.log('  重新命名：', renamed2);
console.log('  → 因為用具名參數，呼叫端不可能「猜錯順序」，寫反了語意上就看得出來');

line('Part 3｜命名風格不一致，造成的靜默 undefined');

// 同一個模組，一個回傳 camelCase，一個回傳 snake_case
function getUserFromCache() {
  return { userId: 1, userName: 'Abby' };
}
function getUserFromApiBefore() {
  return { user_id: 1, user_name: 'Abby' }; // 注意：命名風格跟上面不一致
}

function displayUserBefore(user) {
  return `#${user.userId} ${user.userName}`;
}

console.log('  來自 cache 的資料顯示：', displayUserBefore(getUserFromCache()));
console.log('  來自 API 的資料顯示：  ', displayUserBefore(getUserFromApiBefore()));
console.log('  → 用同一個 displayUser 函式處理兩個來源，API 那筆完全沒有報錯，只是顯示 undefined');

// 修正：統一命名風格
function getUserFromApiAfter() {
  return { userId: 1, userName: 'Abby' };
}
function displayUserAfter(user) {
  return `#${user.userId} ${user.userName}`;
}
console.log('\n  統一命名風格後：');
console.log('  來自 cache 的資料顯示：', displayUserAfter(getUserFromCache()));
console.log('  來自 API 的資料顯示：  ', displayUserAfter(getUserFromApiAfter()));

line('Part 4｜量化：這個模組裡有幾種不一致');

const violations = [
  { rule: '參數順序（create 用 name,email；rename 用 email,name）', count: 1 },
  { rule: '欄位命名風格（userId vs user_id）', count: 1 },
  { rule: '找不到資料時的行為（部分回傳 null，部分拋錯，本檔未展示，留給讀者對照自己專案）', count: '視專案而定' },
];
for (const v of violations) {
  console.log(`  - ${v.rule}：${v.count} 處`);
}

console.log('\nNode 版本:', process.version, '\n');
