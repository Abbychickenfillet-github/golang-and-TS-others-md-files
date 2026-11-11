// Node 的 module 自訂 hook：src/lib 的 .ts 檔依 Next.js 慣例用「不寫副檔名」的相對匯入（例如 './wikilink'），
// Node 的型別剝除只認得完整檔名，所以這支 hook 在「找不到模組」時補上 .ts 再試一次；只給 scripts 底下的檢查腳本使用，不影響 Next 與 vitest；
// resolve 是 hook 的約定名稱：Node 解析每個匯入時都會呼叫它，next 是下一個（預設）解析器；
export async function resolve(specifier, context, next) {
  // try/catch：先照預設規則解析，成功就直接用；
  try {
    // 呼叫預設解析器；
    return await next(specifier, context);
  } catch (error) {
    // 只處理「相對路徑、沒有副檔名、而且是找不到模組」的情形；其他錯誤原樣丟出；
    if (error && error.code === 'ERR_MODULE_NOT_FOUND' && /^\.{1,2}\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      // 補上 .ts 再解析一次；
      return next(`${specifier}.ts`, context);
    }
    // 其他錯誤不吞掉；
    throw error;
  }
}
