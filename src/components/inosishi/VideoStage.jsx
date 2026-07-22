import { useEffect, useRef } from 'react'

// 背景動画 + オーバーレイの表示のみ。ロジックは useVideoSequence 側にある
export function VideoStage({ src, token, visible, fadeMs, onReady, onEnded, children }) {
  const videoRef = useRef(null)

  // 裏タブではブラウザがautoplayを止めることがあるため、表に戻ったら再生を再開する
  useEffect(() => {
    function resume() {
      const v = videoRef.current
      if (document.visibilityState === 'visible' && v && v.paused && !v.ended) {
        v.play().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', resume)
    return () => document.removeEventListener('visibilitychange', resume)
  }, [])

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <video
        key={token}
        ref={videoRef}
        src={src}
        autoPlay
        muted
        playsInline
        onCanPlay={onReady}
        onEnded={onEnded}
        className="absolute inset-0 w-full h-full object-cover transition-opacity"
        style={{ opacity: visible ? 1 : 0, transitionDuration: `${fadeMs}ms` }}
      />
      {/* オーバーレイ（プレート等）も動画と一緒にフェードさせる */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{ opacity: visible ? 1 : 0, transitionDuration: `${fadeMs}ms` }}
      >
        {children}
      </div>
    </div>
  )
}
