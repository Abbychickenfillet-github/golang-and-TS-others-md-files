/**
 * 03-useEffect-StrictMode實測.js
 * 搭配筆記：03-useEffect將元件同步到外部系統-Web-API與DOM.md（d 段）
 *
 * 用 jsdom 在 Node 裡實際跑 React 開發版，印出 render、setup、cleanup 的真實執行順序。
 * 三個情境：正式環境寫法、包在 <StrictMode>、StrictMode 加漏寫 cleanup。
 *
 * 執行方式：
 *   mkdir strict-test && cd strict-test && npm init -y
 *   npm i react@19 react-dom@19 jsdom
 *   node 03-useEffect-StrictMode實測.js
 *
 * 2026-10-05 以 react 與 react-dom 19.3.0 實測。
 */
process.env.NODE_ENV='development';
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><div id="root"></div>');
global.window=dom.window; global.document=dom.window.document; global.navigator=dom.window.navigator;
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'); const {createRoot}=require('react-dom/client'); const {act, StrictMode, useEffect, useState}=React;
const log=[]; const L=s=>log.push(s);
let renderN=0;
function ChatRoom({roomId}){
  renderN++; L(`render #${renderN} (roomId=${roomId})`);
  useEffect(()=>{ L(`  setup   (roomId=${roomId})`); return ()=>L(`  cleanup (roomId=${roomId})`); },[roomId]);
  return React.createElement('h1',null,roomId);
}
function NoCleanup({roomId}){
  useEffect(()=>{ L(`  [無cleanup] setup (roomId=${roomId})`); },[roomId]);
  return null;
}
async function scenario(title, wrap, Comp){
  log.length=0; renderN=0; L('=== '+title+' ===');
  const root=createRoot(document.getElementById('root'));
  const el=(id)=>wrap(React.createElement(Comp,{roomId:id}));
  L('-- mount'); await act(async()=>root.render(el('general')));
  L('-- deps 真的改變 general → travel'); await act(async()=>root.render(el('travel')));
  L('-- re-render 但 deps 沒變 (travel → travel)'); await act(async()=>root.render(el('travel')));
  L('-- unmount'); await act(async()=>root.unmount());
  console.log(log.join('\n')+'\n');
}
(async()=>{
  const errs=[]; console.error=(...a)=>errs.push('console.error: '+a.map(String).join(' ').slice(0,160)); console.warn=(...a)=>errs.push('console.warn: '+a.map(String).join(' ').slice(0,160)); const origLog=console.log;
  console.log('React', React.version);
  await scenario('正式環境寫法（沒有 StrictMode）', x=>x, ChatRoom);
  await scenario('開發模式：包在 <StrictMode>', x=>React.createElement(StrictMode,null,x), ChatRoom);
  await scenario('開發模式 StrictMode：漏寫 cleanup 的壞版本', x=>React.createElement(StrictMode,null,x), NoCleanup);
  console.log('--- React 在整個過程中發出的 console.error 與 console.warn 共 '+errs.length+' 則 ---'); errs.forEach(e=>console.log(e));
})();
