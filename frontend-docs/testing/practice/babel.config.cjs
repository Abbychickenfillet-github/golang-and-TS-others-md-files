// 給 Jest 用 — 讓 Jest 看得懂 import 與 JSX
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
}
