import { useState, useRef, useEffect, useCallback } from 'react'

const FADE_MS = 300

// クリップ切り替えロジック: 必ずフェードアウト → 差し替え → フェードインを挟む
// token はクリップ差し替えごとに増える値。同じsrcを再再生する時にも
// <video> を key で作り直して先頭から再生させるために使う
export function useVideoSequence(initialSrc) {
  const [src, setSrc] = useState(initialSrc)
  const [token, setToken] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  const transitionTo = useCallback((nextSrc) => {
    clearTimeout(timerRef.current)
    setVisible(false)
    timerRef.current = setTimeout(() => {
      setSrc(nextSrc)
      setToken((prev) => prev + 1)
    }, FADE_MS)
  }, [])

  // 動画が再生可能になったらフェードイン
  const handleReady = useCallback(() => setVisible(true), [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return { src, token, visible, fadeMs: FADE_MS, transitionTo, handleReady }
}
