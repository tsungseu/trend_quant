/**
 * MiniMax / DeepSeek 等模型会在流中输出 <think>...</think> 思考过程，
 * 对终端用户无意义且破坏 Markdown 渲染，需过滤。
 * 流式分段到达时标签可能跨 chunk，用状态机 + 尾部缓冲处理。
 */
export function createThinkStripper() {
  let inThink = false
  let tailBuf = ''
  const OPEN = '<think>'
  const CLOSE = '</think>'

  function reset() {
    inThink = false
    tailBuf = ''
  }

  function push(text) {
    let s = tailBuf + text
    tailBuf = ''
    let out = ''
    let i = 0
    while (i < s.length) {
      if (inThink) {
        const closeIdx = s.indexOf(CLOSE, i)
        if (closeIdx >= 0) {
          inThink = false
          i = closeIdx + CLOSE.length
        } else {
          // 本 chunk 未闭合：丢弃思考正文，但保留末尾可能是拆分中的 </think> 前缀
          const remain = s.slice(i)
          let keep = 0
          for (let k = Math.min(CLOSE.length - 1, remain.length); k >= 1; k--) {
            if (CLOSE.startsWith(remain.slice(-k))) {
              keep = k
              break
            }
          }
          tailBuf = keep ? remain.slice(-keep) : ''
          i = s.length
        }
      } else {
        const openIdx = s.indexOf(OPEN, i)
        if (openIdx >= 0) {
          out += s.slice(i, openIdx)
          inThink = true
          i = openIdx + OPEN.length
        } else {
          const remain = s.slice(i)
          const lastLt = remain.lastIndexOf('<')
          if (lastLt >= 0 && remain.length - lastLt < OPEN.length && OPEN.startsWith(remain.slice(lastLt))) {
            out += remain.slice(0, lastLt)
            tailBuf = remain.slice(lastLt)
          } else {
            out += remain
          }
          i = s.length
        }
      }
    }
    return out
  }

  return { reset, push }
}
