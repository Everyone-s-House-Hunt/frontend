import { useState, useEffect, useRef } from 'react'

const STEP_DURATION = 2000   // ステップ1〜3の切り替え間隔(ms)
const COUNTDOWN_SECONDS = 5  // ステップ4のカウントダウン秒数

export function useRoadAnimation(onTimeout) {
  const [roadStep, setRoadStep] = useState(1)
  const [countdown, setCountdown] = useState(null)
  const doneRef = useRef(false)
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  // ステップ1〜3: 2秒ごとに次のステップへ進む
  useEffect(() => {
    if (doneRef.current || roadStep >= 4) return
    const t = setTimeout(() => {
      if (!doneRef.current) setRoadStep((prev) => prev + 1)
    }, STEP_DURATION)
    return () => clearTimeout(t)
  }, [roadStep])

  // ステップ4に到達したらカウントダウン開始
  useEffect(() => {
    if (roadStep !== 4) return
    setCountdown(COUNTDOWN_SECONDS)
  }, [roadStep])

  // カウントダウン: 1秒ごとに減少、0になったらタイムアウト
  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      if (!doneRef.current) {
        doneRef.current = true
        onTimeoutRef.current()
      }
      return
    }
    const t = setTimeout(() => setCountdown((prev) => prev - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // 選択肢を選んだとき: ステップ5（選んだ道の画像）に切り替える
  function select() {
    doneRef.current = true
    setRoadStep(5)
  }

  return { roadStep, countdown, select }
}
